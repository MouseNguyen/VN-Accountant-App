// src/app/api/auth/reset-password/route.ts
// API: Đặt lại mật khẩu với token

import { NextRequest, NextResponse } from 'next/server';
import { prismaBase } from '@/lib/prisma';
import { hashPassword, hashToken, deleteAllRefreshTokens } from '@/lib/auth';
import { resetPasswordSchema } from '@/lib/validations/auth';

export async function POST(request: NextRequest) {
    try {
        // Parse và validate body
        const body = await request.json();
        const validation = resetPasswordSchema.safeParse(body);

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

        const { token, password } = validation.data;

        // Find valid token
        const resetToken = await prismaBase.verificationToken.findFirst({
            where: {
                type: 'PASSWORD_RESET',
                token: hashToken(token),
                expires_at: { gt: new Date() },
                used_at: null,
            },
            include: {
                user: true,
            },
        });

        if (!resetToken) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_TOKEN',
                        message: 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn',
                    },
                },
                { status: 400 }
            );
        }

        // Check if user is active
        if (!resetToken.user.is_active) {
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

        // Hash new password
        const passwordHash = await hashPassword(password);

        // Update password and mark token as used
        await prismaBase.$transaction([
            prismaBase.user.update({
                where: { id: resetToken.user_id },
                data: {
                    password_hash: passwordHash,
                    failed_login_count: 0,
                    locked_until: null,
                },
            }),
            prismaBase.verificationToken.update({
                where: { id: resetToken.id },
                data: { used_at: new Date() },
            }),
        ]);

        // Logout all sessions (security measure)
        await deleteAllRefreshTokens(resetToken.user_id);

        return NextResponse.json({
            success: true,
            message: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.',
        });
    } catch (error) {
        console.error('Reset password error:', error);
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
