// src/app/api/auth/verify-email/route.ts
// API: Xác thực email với OTP

import { NextRequest, NextResponse } from 'next/server';
import { prismaBase } from '@/lib/prisma';
import { withAuthUnverified, hashToken } from '@/lib/auth';
import { verifyEmailSchema } from '@/lib/validations/auth';
import { sendWelcomeEmail } from '@/lib/email';

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

        // Parse và validate body
        const body = await request.json();
        const validation = verifyEmailSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Mã xác thực không hợp lệ',
                    },
                },
                { status: 400 }
            );
        }

        // Find valid token
        const token = await prismaBase.verificationToken.findFirst({
            where: {
                user_id: user.id,
                type: 'EMAIL_VERIFY',
                token: hashToken(validation.data.token),
                expires_at: { gt: new Date() },
                used_at: null,
            },
        });

        if (!token) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_OTP',
                        message: 'Mã xác thực không đúng hoặc đã hết hạn',
                    },
                },
                { status: 400 }
            );
        }

        // Update user and token
        await prismaBase.$transaction([
            prismaBase.user.update({
                where: { id: user.id },
                data: {
                    email_verified: true,
                    email_verified_at: new Date(),
                },
            }),
            prismaBase.verificationToken.update({
                where: { id: token.id },
                data: { used_at: new Date() },
            }),
        ]);

        // Send welcome email (non-critical)
        try {
            await sendWelcomeEmail(user.email, user.full_name, user.farm.name);
        } catch (e) {
            console.error('Failed to send welcome email:', e);
        }

        return NextResponse.json({
            success: true,
            message: 'Xác thực email thành công! Chào mừng bạn đến với LABA ERP.',
        });
    } catch (error) {
        console.error('Verify email error:', error);
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
