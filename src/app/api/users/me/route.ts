// src/app/api/users/me/route.ts
// API: Get and Update current user profile

import { NextRequest, NextResponse } from 'next/server';
import { prismaBase } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { updateUserSchema } from '@/lib/validations/user';
import { createAuditLog } from '@/services/audit-log.service';

import { serializeDecimals } from '@/lib/api-utils';
/**
 * GET /api/users/me
 * Lấy thông tin user hiện tại
 */
export const GET = withAuth(async (request: NextRequest, ctx, user) => {
    return NextResponse.json({
        success: true,
        data: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            phone: user.phone,
            avatar_url: user.avatar_url,
            role: user.role,
            email_verified: user.email_verified,
            created_at: user.created_at,
        },
    });
});

/**
 * PUT /api/users/me
 * Cập nhật thông tin cá nhân
 */
export const PUT = withAuth(async (request: NextRequest, ctx, user) => {
    try {
        const body = await request.json();
        const validation = updateUserSchema.safeParse(body);

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

        // Kiểm tra trùng phone (nếu có thay đổi)
        if (data.phone && data.phone !== user.phone) {
            const existingPhone = await prismaBase.user.findFirst({
                where: {
                    phone: data.phone,
                    id: { not: user.id },
                },
            });

            if (existingPhone) {
                return NextResponse.json(
                    {
                        success: false,
                        error: {
                            code: 'CONFLICT',
                            message: 'Số điện thoại đã được sử dụng',
                        },
                    },
                    { status: 409 }
                );
            }
        }

        const oldUser = {
            full_name: user.full_name,
            phone: user.phone,
            avatar_url: user.avatar_url,
        };

        // Cập nhật
        const updatedUser = await prismaBase.user.update({
            where: { id: user.id },
            data: {
                full_name: data.full_name,
                phone: data.phone || null,
                avatar_url: data.avatar_url || null,
            },
        });

        // Audit Log
        await createAuditLog({
            action: 'UPDATE',
            entityType: 'User',
            entityId: updatedUser.id,
            oldValues: oldUser,
            newValues: {
                full_name: updatedUser.full_name,
                phone: updatedUser.phone,
                avatar_url: updatedUser.avatar_url,
            },
            description: 'Cập nhật thông tin cá nhân',
        });

        return NextResponse.json({
            success: true,
            message: 'Cập nhật thành công!',
            data: {
                id: updatedUser.id,
                email: updatedUser.email,
                full_name: updatedUser.full_name,
                phone: updatedUser.phone,
                avatar_url: updatedUser.avatar_url,
                role: updatedUser.role,
            },
        });
    } catch (error) {
        console.error('Update user error:', error);
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
