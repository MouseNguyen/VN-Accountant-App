// src/app/api/users/me/email/route.ts
// API: Change email (requires password confirmation)

import { NextRequest, NextResponse } from 'next/server';
import { prismaBase } from '@/lib/prisma';
import { withAuth, comparePassword, generateOTP, hashToken } from '@/lib/auth';
import { changeEmailSchema } from '@/lib/validations/user';
import { sendVerificationEmail } from '@/lib/email';

/**
 * PUT /api/users/me/email
 * Đổi email - yêu cầu verify lại email mới
 */
export const PUT = withAuth(async (request: NextRequest, ctx, user) => {
    try {
        const body = await request.json();
        const validation = changeEmailSchema.safeParse(body);

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

        const { new_email, password } = validation.data;

        // Verify password
        const validPassword = await comparePassword(password, user.password_hash);
        if (!validPassword) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_PASSWORD',
                        message: 'Mật khẩu không đúng',
                    },
                },
                { status: 401 }
            );
        }

        // Check email không đổi
        if (new_email === user.email) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'NO_CHANGE',
                        message: 'Email mới phải khác email hiện tại',
                    },
                },
                { status: 400 }
            );
        }

        // Check email đã tồn tại (của người khác)
        const existingEmail = await prismaBase.user.findFirst({
            where: {
                email: new_email,
                id: { not: user.id },
            },
        });

        if (existingEmail) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'CONFLICT',
                        message: 'Email đã được sử dụng',
                    },
                },
                { status: 409 }
            );
        }

        // Cập nhật email và đặt lại trạng thái verify
        await prismaBase.user.update({
            where: { id: user.id },
            data: {
                email: new_email,
                email_verified: false,
                email_verified_at: null,
            },
        });

        // Gửi OTP verify email mới
        const otp = generateOTP();
        await prismaBase.verificationToken.create({
            data: {
                user_id: user.id,
                type: 'EMAIL_VERIFY',
                token: hashToken(otp),
                expires_at: new Date(Date.now() + 15 * 60 * 1000),
            },
        });

        await sendVerificationEmail(new_email, user.full_name, otp);

        return NextResponse.json({
            success: true,
            message: 'Đã gửi mã xác thực đến email mới. Vui lòng xác thực để hoàn tất.',
            data: {
                email: new_email,
                email_verified: false,
            },
        });
    } catch (error) {
        console.error('Change email error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'SERVER_ERROR',
                    message: 'Có lỗi xảy ra',
                },
            },
            { status: 500 }
        );
    }
});
