// src/app/api/ap/summary/route.ts
// AP Summary API for Dashboard

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { getAPSummary } from '@/services/ap.service';

// GET /api/ap/summary - Get AP summary for dashboard
export const GET = withAuth(async (
    _request: NextRequest,
    _context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const result = await getAPSummary(user.farm_id);

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error('GET /api/ap/summary error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Lỗi server' },
            { status: 500 }
        );
    }
});
