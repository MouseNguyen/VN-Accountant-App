// src/app/api/audit-logs/route.ts
// GET /api/audit-logs - Danh sách audit logs

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { getAuditLogs } from '@/services/audit-log.service';
import type { AuditAction } from '@/types/security';

export const GET = withAuth(async (
    req: NextRequest,
    _context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const url = new URL(req.url);
        const params = {
            page: Number(url.searchParams.get('page')) || 1,
            limit: Number(url.searchParams.get('limit')) || 50,
            user_id: url.searchParams.get('user_id') || undefined,
            action: (url.searchParams.get('action') as AuditAction) || undefined,
            entity_type: url.searchParams.get('entity_type') || undefined,
            date_from: url.searchParams.get('date_from') || undefined,
            date_to: url.searchParams.get('date_to') || undefined,
            search: url.searchParams.get('search') || undefined,
        };

        const result = await getAuditLogs(user.farm_id, params);

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('GET /api/audit-logs error:', error);
        return NextResponse.json(
            { success: false, error: { message: 'Lỗi lấy danh sách audit logs' } },
            { status: 500 }
        );
    }
});
