// src/app/api/reports/stock/inventory/route.ts
// API: Báo cáo giá trị tồn kho

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { getStockValuationReport } from '@/services/stock-reports.service';

import { serializeDecimals } from '@/lib/api-utils';
export const GET = withAuth(async (
    req: NextRequest,
    context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const report = await getStockValuationReport(user.farm_id);
        return NextResponse.json({ success: true, data: serializeDecimals(report) });
    } catch (error) {
        console.error('[Stock Valuation Report Error]', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message } },
            { status: 500 }
        );
    }
});
