// src/app/api/ap/schedule/route.ts
// Payment Schedule API

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { getPaymentSchedule } from '@/services/ap.service';

// GET /api/ap/schedule - Get payment schedule
export const GET = withAuth(async (
    _request: NextRequest,
    _context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const result = await getPaymentSchedule(user.farm_id);

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error('GET /api/ap/schedule error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Lỗi server' },
            { status: 500 }
        );
    }
});
