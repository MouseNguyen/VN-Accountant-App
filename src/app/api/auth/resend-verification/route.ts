// src/app/api/auth/resend-verification/route.ts
// API: Gửi lại mã xác thực email

import { NextRequest, NextResponse } from 'next/server';
import { prismaBase } from '@/lib/prisma';
import { withAuthUnverified, generateOTP, hashToken } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';
import {
    resendVerificationRateLimiter,
    checkRateLimit,
    buildRateLimitResponse,
} from '@/lib/rate-limit';

export const POST = withAuthUnverified(async (request: NextRequest, ctx, user) => {
    try {
        // Check if already verified
        if (user.email_verified) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'ALREADY_VERIFIED',
                        message: 'Email đã được xác thực',
                    },
                },
                { status: 400 }
            );
        }

        // Rate limiting by email
        const rateLimitResult = await checkRateLimit(
            resendVerificationRateLimiter,
            user.email
        );
        if (rateLimitResult && !rateLimitResult.success) {
            const error = buildRateLimitResponse(rateLimitResult);
            return NextResponse.json({ success: false, error }, { status: 429 });
        }

        // Invalidate old tokens
        await prismaBase.verificationToken.updateMany({
            where: {
                user_id: user.id,
                type: 'EMAIL_VERIFY',
                used_at: null,
            },
            data: {
                used_at: new Date(), // Mark as used
            },
        });

        // Create new OTP
        const otp = generateOTP();
        await prismaBase.verificationToken.create({
            data: {
                user_id: user.id,
                type: 'EMAIL_VERIFY',
                token: hashToken(otp),
                expires_at: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
            },
        });

        // Send email
        const emailResult = await sendVerificationEmail(
            user.email,
            user.full_name,
            otp
        );

        if (!emailResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'EMAIL_FAILED',
                        message: 'Không thể gửi email, vui lòng thử lại sau',
                    },
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Đã gửi lại mã xác thực! Kiểm tra hộp thư của bạn.',
        });
    } catch (error) {
        console.error('Resend verification error:', error);
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
});
