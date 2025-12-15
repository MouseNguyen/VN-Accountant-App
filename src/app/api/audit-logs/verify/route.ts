// src/app/api/audit-logs/verify/route.ts
// GET /api/audit-logs/verify - Verify audit log hash chain

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { verifyAuditLogChain } from '@/services/audit-log.service';

export const GET = withAuth(async (
    _req: NextRequest,
    _context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const result = await verifyAuditLogChain(user.farm_id);

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('GET /api/audit-logs/verify error:', error);
        return NextResponse.json(
            { success: false, error: { message: 'Lỗi xác minh audit logs' } },
            { status: 500 }
        );
    }
});
