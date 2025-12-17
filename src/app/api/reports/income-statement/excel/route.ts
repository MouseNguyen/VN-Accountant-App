// src/app/api/reports/income-statement/excel/route.ts
// Income Statement Excel Export API
// Task 11 Phase 3

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { generateIncomeStatement } from '@/services/financial-statement.service';
import { generateIncomeStatementExcel } from '@/lib/reports/financial-excel';

export const GET = withAuth(async (request: NextRequest, _context, user: AuthUser) => {
    try {
        const searchParams = request.nextUrl.searchParams;
        const currentYear = new Date().getFullYear();
        const from = searchParams.get('from') || `${currentYear}-01-01`;
        const to = searchParams.get('to') || `${currentYear}-12-31`;

        // Generate Income Statement
        const incomeStatement = await generateIncomeStatement(user.farm.id, from, to);

        // Generate Excel
        const excelBuffer = await generateIncomeStatementExcel(incomeStatement);

        // Return as downloadable file
        const filename = `Bao_Cao_Ket_Qua_Kinh_Doanh_${from}_${to}.xlsx`;

        return new NextResponse(new Uint8Array(excelBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': excelBuffer.length.toString(),
            },
        });
    } catch (error) {
        console.error('Income statement Excel export error:', error);
        return NextResponse.json(
            { success: false, error: { message: 'Lỗi khi xuất báo cáo kết quả kinh doanh' } },
            { status: 500 }
        );
    }
});
