// src/app/api/reports/income-expense/route.ts
// GET - Báo cáo thu chi

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { incomeExpenseReportSchema } from '@/lib/validations/report';
import { getIncomeExpenseReport } from '@/services/report.service';

import { serializeDecimals } from '@/lib/api-utils';
export const GET = withAuth(async (request: NextRequest, _context, _user: AuthUser) => {
    try {
        const { searchParams } = new URL(request.url);
        const query = incomeExpenseReportSchema.parse(Object.fromEntries(searchParams));
        const result = await getIncomeExpenseReport(query);

        return NextResponse.json({ success: true, data: serializeDecimals(result) });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Lỗi khi tải báo cáo thu chi';
        console.error('Income expense report error:', error);
        return NextResponse.json({ success: false, error: { message } }, { status: 500 });
    }
});
