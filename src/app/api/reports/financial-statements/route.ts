// src/app/api/reports/financial-statements/route.ts
// Financial Statements API - Balance Sheet & Income Statement
// Task 11 Phase 3

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { generateBalanceSheet, generateIncomeStatement } from '@/services/financial-statement.service';
import { serializeDecimals } from '@/lib/api-utils';

export const GET = withAuth(async (request: NextRequest, _context, user: AuthUser) => {
    try {
        const searchParams = request.nextUrl.searchParams;
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString(), 10);

        // Generate Balance Sheet as of year end
        const balanceSheetDate = `${year}-12-31`;
        const balanceSheet = await generateBalanceSheet(user.farm.id, balanceSheetDate);

        // Generate Income Statement for the full year
        const incomeStatementFrom = `${year}-01-01`;
        const incomeStatementTo = `${year}-12-31`;
        const incomeStatement = await generateIncomeStatement(user.farm.id, incomeStatementFrom, incomeStatementTo);

        return NextResponse.json({
            success: true,
            data: serializeDecimals({
                year,
                balance_sheet: balanceSheet,
                income_statement: incomeStatement,
            }),
        });
    } catch (error) {
        console.error('Financial statements error:', error);
        return NextResponse.json(
            { success: false, error: { message: 'Lỗi khi tạo báo cáo tài chính' } },
            { status: 500 }
        );
    }
});
