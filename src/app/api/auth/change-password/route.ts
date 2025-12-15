// src/app/api/auth/change-password/route.ts
// API: Change password

import { NextRequest, NextResponse } from 'next/server';
import { prismaBase } from '@/lib/prisma';
import { withAuth, comparePassword, hashPassword } from '@/lib/auth';
import { z } from 'zod';
import { createAuditLog } from '@/services/audit-log.service';

const changePasswordSchema = z
    .object({
        current_password: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
        new_password: z
            .string()
            .min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự')
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                'Mật khẩu phải có chữ hoa, chữ thường và số'
            ),
        confirm_password: z.string(),
    })
    .refine((data) => data.new_password === data.confirm_password, {
        message: 'Mật khẩu xác nhận không khớp',
        path: ['confirm_password'],
    });

/**
 * POST /api/auth/change-password
 * Đổi mật khẩu - yêu cầu mật khẩu hiện tại
 */
export const POST = withAuth(async (request: NextRequest, ctx, user) => {
    try {
        const body = await request.json();
        const validation = changePasswordSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message:
                            validation.error.issues[0]?.message || 'Dữ liệu không hợp lệ',
                        details: validation.error.flatten().fieldErrors,
                    },
                },
                { status: 400 }
            );
        }

        const { current_password, new_password } = validation.data;

        // Verify current password
        const isValidPassword = await comparePassword(
            current_password,
            user.password_hash
        );

        if (!isValidPassword) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_PASSWORD',
                        message: 'Mật khẩu hiện tại không đúng',
                    },
                },
                { status: 401 }
            );
        }

        // Check new password is different from current
        const isSamePassword = await comparePassword(
            new_password,
            user.password_hash
        );

        if (isSamePassword) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'SAME_PASSWORD',
                        message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
                    },
                },
                { status: 400 }
            );
        }

        // Hash new password
        const newPasswordHash = await hashPassword(new_password);

        // Update password
        await prismaBase.user.update({
            where: { id: user.id },
            data: {
                password_hash: newPasswordHash,
            },
        });

        // Audit log
        await createAuditLog({
            action: 'UPDATE',
            entityType: 'User',
            entityId: user.id,
            description: 'Đổi mật khẩu',
        });

        // Optional: Invalidate all refresh tokens except current session
        // This logs out all other devices for security
        // Uncomment if needed:
        // await prismaBase.refreshToken.deleteMany({
        //   where: {
        //     user_id: user.id,
        //   },
        // });

        return NextResponse.json({
            success: true,
            message: 'Đổi mật khẩu thành công!',
        });
    } catch (error) {
        console.error('Change password error:', error);
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
