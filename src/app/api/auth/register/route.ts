// src/app/api/auth/register/route.ts
// API: Đăng ký tài khoản mới

import { NextRequest, NextResponse } from 'next/server';
import { prismaBase } from '@/lib/prisma';
import {
    hashPassword,
    generateOTP,
    hashToken,
    createAccessToken,
    createRefreshToken,
    setAuthCookies,
    saveRefreshToken,
} from '@/lib/auth';
import { registerSchema } from '@/lib/validations/auth';
import {
    registerRateLimiter,
    getClientIp,
    checkRateLimit,
    buildRateLimitResponse,
} from '@/lib/rate-limit';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const ip = getClientIp(request);

        // Rate limiting
        const rateLimitResult = await checkRateLimit(registerRateLimiter, ip);
        if (rateLimitResult && !rateLimitResult.success) {
            const error = buildRateLimitResponse(rateLimitResult);
            return NextResponse.json({ success: false, error }, { status: 429 });
        }

        // Parse và validate body
        const body = await request.json();
        const validation = registerSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Dữ liệu không hợp lệ',
                        details: validation.error.flatten().fieldErrors,
                    },
                },
                { status: 400 }
            );
        }

        const data = validation.data;

        // Check email exists
        const existingUser = await prismaBase.user.findUnique({
            where: { email: data.email },
        });

        if (existingUser) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'EMAIL_EXISTS',
                        message: 'Email đã được sử dụng',
                    },
                },
                { status: 409 }
            );
        }

        // Hash password
        const passwordHash = await hashPassword(data.password);

        // Create farm
        const farm = await prismaBase.farm.create({
            data: {
                name: data.farm_name,
                owner_name: data.full_name,
                business_type: data.business_type,
            },
        });

        // Create user
        const user = await prismaBase.user.create({
            data: {
                farm_id: farm.id,
                email: data.email,
                password_hash: passwordHash,
                full_name: data.full_name,
                phone: data.phone,
                role: 'OWNER',
                email_verified: false,
            },
        });

        // Seed tax rules for the new farm (non-critical)
        try {
            const { seedTaxRulesForFarm } = await import(
                '../../../../../prisma/seed/tax-rules'
            );
            await seedTaxRulesForFarm(prismaBase, farm.id);
        } catch (e) {
            console.error('Failed to seed tax rules:', e);
        }

        // Create verification OTP
        const otp = generateOTP();
        await prismaBase.verificationToken.create({
            data: {
                user_id: user.id,
                type: 'EMAIL_VERIFY',
                token: hashToken(otp),
                expires_at: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
            },
        });

        // Send verification email
        await sendVerificationEmail(data.email, data.full_name, otp);

        // Create tokens
        const payload = {
            userId: user.id,
            farmId: farm.id,
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

        // Build response
        const response = NextResponse.json(
            {
                success: true,
                message: 'Đăng ký thành công! Kiểm tra email để xác thực.',
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        full_name: user.full_name,
                        email_verified: false,
                        role: user.role,
                    },
                    farm: {
                        id: farm.id,
                        name: farm.name,
                        business_type: farm.business_type,
                    },
                },
            },
            { status: 201 }
        );

        // Set cookies
        setAuthCookies(response, accessToken, refreshToken, false);

        return response;
    } catch (error) {
        console.error('Register error:', error);
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
