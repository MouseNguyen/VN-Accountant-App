// src/app/api/auth/sessions/route.ts
// GET /api/auth/sessions - List user sessions

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { prismaBase } from '@/lib/prisma';

export const GET = withAuth(async (
    _req: NextRequest,
    _context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const sessions = await prismaBase.userSession.findMany({
            where: {
                user_id: user.id,
                is_active: true,
                expires_at: { gt: new Date() },
            },
            orderBy: { last_activity: 'desc' },
            select: {
                id: true,
                device_type: true,
                device_name: true,
                ip_address: true,
                user_agent: true,
                login_at: true,
                last_activity: true,
                expires_at: true,
            },
        });

        // Get current session from token
        // Note: In production, you'd extract this from the JWT
        const currentSessionId = sessions[0]?.id;

        return NextResponse.json({
            success: true,
            data: {
                sessions: sessions.map(s => ({
                    id: s.id,
                    device_type: s.device_type || 'WEB',
                    device_name: s.device_name,
                    ip_address: s.ip_address,
                    user_agent: s.user_agent,
                    is_active: true,
                    created_at: s.login_at.toISOString(),
                    last_active_at: s.last_activity.toISOString(),
                    expires_at: s.expires_at.toISOString(),
                })),
                current_session_id: currentSessionId,
            },
        });
    } catch (error) {
        console.error('GET /api/auth/sessions error:', error);
        return NextResponse.json(
            { success: false, error: { message: 'Lỗi lấy danh sách phiên' } },
            { status: 500 }
        );
    }
});

// DELETE - Revoke all sessions except current
export const DELETE = withAuth(async (
    _req: NextRequest,
    _context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        // Get current session (most recent active)
        const currentSession = await prismaBase.userSession.findFirst({
            where: {
                user_id: user.id,
                is_active: true,
            },
            orderBy: { last_activity: 'desc' },
        });

        // Revoke all other sessions
        const result = await prismaBase.userSession.updateMany({
            where: {
                user_id: user.id,
                is_active: true,
                id: { not: currentSession?.id },
            },
            data: {
                is_active: false,
                revoked_at: new Date(),
                revoke_reason: 'Đăng xuất tất cả từ cài đặt',
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                message: `Đã đăng xuất ${result.count} phiên khác`,
            },
        });
    } catch (error) {
        console.error('DELETE /api/auth/sessions error:', error);
        return NextResponse.json(
            { success: false, error: { message: 'Lỗi đăng xuất các phiên' } },
            { status: 500 }
        );
    }
});
