// src/app/api/ap/cash-flow/route.ts
// Cash Flow Forecast API

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { cashFlowQuerySchema } from '@/lib/validations/ap';
import { getCashFlowForecast } from '@/services/ap.service';

// GET /api/ap/cash-flow - Get cash flow forecast
export const GET = withAuth(async (
    request: NextRequest,
    _context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const { searchParams } = new URL(request.url);
        const params = Object.fromEntries(searchParams.entries());

        const validation = cashFlowQuerySchema.safeParse(params);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'Tham số không hợp lệ', details: validation.error.flatten() },
                { status: 400 }
            );
        }

        const result = await getCashFlowForecast(user.farm_id, validation.data.days);

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error('GET /api/ap/cash-flow error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Lỗi server' },
            { status: 500 }
        );
    }
});
