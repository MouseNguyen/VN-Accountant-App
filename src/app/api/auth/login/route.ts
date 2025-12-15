// src/app/api/auth/login/route.ts
// API: Đăng nhập

import { NextRequest, NextResponse } from 'next/server';
import { prismaBase } from '@/lib/prisma';
import {
    comparePassword,
    createAccessToken,
    createRefreshToken,
    setAuthCookies,
    saveRefreshToken,
} from '@/lib/auth';
import { loginSchema } from '@/lib/validations/auth';
import { loginRateLimiter, getClientIp, checkRateLimit, buildRateLimitResponse } from '@/lib/rate-limit';
import { createDirectAuditLog } from '@/services/audit-log.service';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export async function POST(request: NextRequest) {
    try {
        const ip = getClientIp(request);

        // Rate limiting
        const rateLimitResult = await checkRateLimit(loginRateLimiter, ip);
        if (rateLimitResult && !rateLimitResult.success) {
            const error = buildRateLimitResponse(rateLimitResult);
            return NextResponse.json({ success: false, error }, { status: 429 });
        }

        // Parse và validate body
        const body = await request.json();
        const validation = loginSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Dữ liệu không hợp lệ',
                    },
                },
                { status: 400 }
            );
        }

        const { email, password, remember_me } = validation.data;

        // Find user
        const user = await prismaBase.user.findUnique({
            where: { email },
            include: { farm: true },
        });

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_CREDENTIALS',
                        message: 'Email hoặc mật khẩu không đúng',
                    },
                },
                { status: 401 }
            );
        }

        // Check if account is locked
        if (user.locked_until && user.locked_until > new Date()) {
            const remainingMinutes = Math.ceil(
                (user.locked_until.getTime() - Date.now()) / 60000
            );
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'ACCOUNT_LOCKED',
                        message: `Tài khoản tạm khóa. Thử lại sau ${remainingMinutes} phút.`,
                    },
                },
                { status: 423 }
            );
        }

        // Verify password
        const isValidPassword = await comparePassword(password, user.password_hash);

        if (!isValidPassword) {
            // Increment failed login count
            const newFailedCount = user.failed_login_count + 1;
            const shouldLock = newFailedCount >= MAX_FAILED_ATTEMPTS;

            await prismaBase.user.update({
                where: { id: user.id },
                data: {
                    failed_login_count: newFailedCount,
                    locked_until: shouldLock
                        ? new Date(Date.now() + LOCK_DURATION_MS)
                        : null,
                },
            });

            const remainingAttempts = MAX_FAILED_ATTEMPTS - newFailedCount;

            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_CREDENTIALS',
                        message:
                            remainingAttempts > 0
                                ? `Email hoặc mật khẩu không đúng. Còn ${remainingAttempts} lần thử.`
                                : 'Tài khoản đã bị khóa do đăng nhập sai quá nhiều lần.',
                    },
                },
                { status: 401 }
            );
        }

        // Check if account is active
        if (!user.is_active) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'ACCOUNT_DISABLED',
                        message: 'Tài khoản đã bị vô hiệu hóa',
                    },
                },
                { status: 403 }
            );
        }

        // Reset failed login count and update last login
        await prismaBase.user.update({
            where: { id: user.id },
            data: {
                failed_login_count: 0,
                locked_until: null,
                last_login_at: new Date(),
            },
        });

        // Create tokens
        const payload = {
            userId: user.id,
            farmId: user.farm_id,
            email: user.email,
        };

        const accessToken = await createAccessToken(payload);
        const refreshToken = await createRefreshToken(payload);

        // Save refresh token
        await saveRefreshToken(
            user.id,
            refreshToken,
            request.headers.get('user-agent') || undefined,
            ip
        );

        // Create UserSession for session management
        const userAgent = request.headers.get('user-agent') || '';
        const deviceType = userAgent.includes('Mobile') ? 'MOBILE' : 'WEB';
        const deviceName = parseDeviceName(userAgent);

        await prismaBase.userSession.create({
            data: {
                user_id: user.id,
                token: accessToken.slice(-32), // Store last 32 chars as identifier
                refresh_token: refreshToken.slice(-32),
                ip_address: ip,
                user_agent: userAgent.slice(0, 500),
                device_type: deviceType,
                device_name: deviceName,
                login_at: new Date(),
                expires_at: new Date(Date.now() + (remember_me ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)),
                is_active: true,
            },
        });

        // Create audit log for login
        try {
            await createDirectAuditLog({
                farmId: user.farm_id,
                userId: user.id,
                action: 'LOGIN',
                entityType: 'User',
                entityId: user.id,
                entityName: user.full_name || user.email,
                description: `Đăng nhập từ ${deviceName}`,
                ipAddress: ip,
                userAgent: userAgent,
            });
        } catch (auditError) {
            console.error('Audit log error:', auditError);
            // Don't fail login if audit fails
        }

        // Build response
        const response = NextResponse.json({
            success: true,
            message: 'Đăng nhập thành công!',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    email_verified: user.email_verified,
                    role: user.role,
                },
                farm: {
                    id: user.farm.id,
                    name: user.farm.name,
                    business_type: user.farm.business_type,
                },
            },
        });

        // Set cookies
        setAuthCookies(response, accessToken, refreshToken, remember_me);

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'SERVER_ERROR',
                    message: 'Có lỗi xảy ra, vui lòng thử lại sau',
                },
            },
            { status: 500 }
        );
    }
}

// Helper: Parse device name from user agent
function parseDeviceName(ua: string): string {
    if (!ua) return 'Unknown Device';

    // Check for browsers
    if (ua.includes('Firefox')) return 'Firefox Browser';
    if (ua.includes('Chrome') && !ua.includes('Edge')) return 'Chrome Browser';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari Browser';
    if (ua.includes('Edge')) return 'Microsoft Edge';

    // Check for OS
    if (ua.includes('Windows')) return 'Windows PC';
    if (ua.includes('Mac')) return 'Mac';
    if (ua.includes('iPhone')) return 'iPhone';
    if (ua.includes('Android')) return 'Android Phone';
    if (ua.includes('Linux')) return 'Linux PC';

    return 'Web Browser';
}
