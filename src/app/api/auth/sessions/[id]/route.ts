// src/app/api/auth/sessions/[id]/route.ts
// DELETE /api/auth/sessions/:id - Revoke a specific session

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { prismaBase } from '@/lib/prisma';

export const DELETE = withAuth(async (
    _req: NextRequest,
    context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const { id } = await context.params;

        // Verify session belongs to user
        const session = await prismaBase.userSession.findFirst({
            where: {
                id,
                user_id: user.id,
                is_active: true,
            },
        });

        if (!session) {
            return NextResponse.json(
                { success: false, error: { message: 'Phiên không tồn tại' } },
                { status: 404 }
            );
        }

        // Revoke session
        await prismaBase.userSession.update({
            where: { id },
            data: {
                is_active: false,
                revoked_at: new Date(),
                revoke_reason: 'Người dùng tự đăng xuất',
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Đã đăng xuất phiên',
        });
    } catch (error) {
        console.error('DELETE /api/auth/sessions/[id] error:', error);
        return NextResponse.json(
            { success: false, error: { message: 'Lỗi đăng xuất phiên' } },
            { status: 500 }
        );
    }
});
