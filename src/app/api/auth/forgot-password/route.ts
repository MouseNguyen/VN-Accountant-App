// src/app/api/auth/forgot-password/route.ts
// API: Quên mật khẩu - gửi email reset

import { NextRequest, NextResponse } from 'next/server';
import { prismaBase } from '@/lib/prisma';
import { generateSecureToken, hashToken } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';
import { forgotPasswordSchema } from '@/lib/validations/auth';
import {
    forgotPasswordRateLimiter,
    checkRateLimit,
    buildRateLimitResponse,
} from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
    try {
        // Parse và validate body
        const body = await request.json();
        const validation = forgotPasswordSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Email không hợp lệ',
                    },
                },
                { status: 400 }
            );
        }

        const { email } = validation.data;

        // Rate limiting by email
        const rateLimitResult = await checkRateLimit(
            forgotPasswordRateLimiter,
            email
        );
        if (rateLimitResult && !rateLimitResult.success) {
            const error = buildRateLimitResponse(rateLimitResult);
            return NextResponse.json({ success: false, error }, { status: 429 });
        }

        // Find user (don't reveal if email exists)
        const user = await prismaBase.user.findUnique({
            where: { email },
        });

        // Always return success to prevent email enumeration
        const successMessage =
            'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu.';

        if (user) {
            // Invalidate old password reset tokens
            await prismaBase.verificationToken.updateMany({
                where: {
                    user_id: user.id,
                    type: 'PASSWORD_RESET',
                    used_at: null,
                },
                data: {
                    used_at: new Date(),
                },
            });

            // Create new reset token
            const token = generateSecureToken();
            await prismaBase.verificationToken.create({
                data: {
                    user_id: user.id,
                    type: 'PASSWORD_RESET',
                    token: hashToken(token),
                    expires_at: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
                },
            });

            // Send email (non-critical - don't reveal failure)
            try {
                await sendPasswordResetEmail(user.email, user.full_name, token);
            } catch (e) {
                console.error('Failed to send password reset email:', e);
            }
        }

        return NextResponse.json({
            success: true,
            message: successMessage,
        });
    } catch (error) {
        console.error('Forgot password error:', error);
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
