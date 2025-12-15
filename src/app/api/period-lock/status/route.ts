// src/app/api/period-lock/status/route.ts
// GET /api/period-lock/status - Get current lock status

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { getPeriodLockStatus } from '@/services/period-lock.service';

export const GET = withAuth(async (
    _req: NextRequest,
    _context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const status = await getPeriodLockStatus(user.farm_id);

        return NextResponse.json({
            success: true,
            data: status,
        });
    } catch (error) {
        console.error('GET /api/period-lock/status error:', error);
        return NextResponse.json(
            { success: false, error: { message: 'Lỗi lấy trạng thái khóa sổ' } },
            { status: 500 }
        );
    }
});
