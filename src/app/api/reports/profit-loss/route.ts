// src/app/api/reports/profit-loss/route.ts
// GET - Báo cáo lãi lỗ

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { profitLossReportSchema } from '@/lib/validations/report';
import { getProfitLossReport } from '@/services/report.service';

import { serializeDecimals } from '@/lib/api-utils';
export const GET = withAuth(async (request: NextRequest, _context, _user: AuthUser) => {
    try {
        const { searchParams } = new URL(request.url);
        const query = profitLossReportSchema.parse(Object.fromEntries(searchParams));
        const result = await getProfitLossReport(query);

        return NextResponse.json({ success: true, data: serializeDecimals(result) });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Lỗi khi tải báo cáo lãi lỗ';
        console.error('Profit loss report error:', error);
        return NextResponse.json({ success: false, error: { message } }, { status: 500 });
    }
});
