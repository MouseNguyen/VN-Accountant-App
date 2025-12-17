// src/app/api/reports/balance-sheet/excel/route.ts
// Balance Sheet Excel Export API
// Task 11 Phase 3

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { generateBalanceSheet } from '@/services/financial-statement.service';
import { generateBalanceSheetExcel } from '@/lib/reports/financial-excel';

export const GET = withAuth(async (request: NextRequest, _context, user: AuthUser) => {
    try {
        const searchParams = request.nextUrl.searchParams;
        const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

        // Generate Balance Sheet
        const balanceSheet = await generateBalanceSheet(user.farm.id, date);

        // Generate Excel
        const excelBuffer = await generateBalanceSheetExcel(balanceSheet);

        // Return as downloadable file
        const filename = `Bang_Can_Doi_Ke_Toan_${date}.xlsx`;

        return new NextResponse(new Uint8Array(excelBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': excelBuffer.length.toString(),
            },
        });
    } catch (error) {
        console.error('Balance sheet Excel export error:', error);
        return NextResponse.json(
            { success: false, error: { message: 'Lỗi khi xuất bảng cân đối kế toán' } },
            { status: 500 }
        );
    }
});
