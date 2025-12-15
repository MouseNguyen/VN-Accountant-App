// src/app/api/ap/aging/route.ts
// AP Aging Report API

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { getAPAgingReport } from '@/services/ap.service';

// GET /api/ap/aging - Get AP aging report
export const GET = withAuth(async (
    _request: NextRequest,
    _context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const result = await getAPAgingReport(user.farm_id);

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error('GET /api/ap/aging error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Lỗi server' },
            { status: 500 }
        );
    }
});
