// src/app/api/tax/vat/issues/route.ts
// API Route: GET /api/tax/vat/issues
// Returns VAT issues report for a period

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { getVATIssuesReport } from '@/lib/tax/vat-validator';

export const GET = withAuth(async (
    req: NextRequest,
    _context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const farmId = user.farm_id;
        if (!farmId) {
            return NextResponse.json(
                { success: false, error: 'Chưa chọn trang trại' },
                { status: 400 }
            );
        }

        const url = new URL(req.url);
        const fromDate = url.searchParams.get('from_date');
        const toDate = url.searchParams.get('to_date');

        if (!fromDate || !toDate) {
            return NextResponse.json(
                { success: false, error: 'Thiếu from_date hoặc to_date' },
                { status: 400 }
            );
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(fromDate) || !dateRegex.test(toDate)) {
            return NextResponse.json(
                { success: false, error: 'Định dạng ngày phải là YYYY-MM-DD' },
                { status: 400 }
            );
        }

        const report = await getVATIssuesReport(farmId, fromDate, toDate);

        return NextResponse.json({
            success: true,
            data: report,
        });
    } catch (error) {
        console.error('VAT issues report error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Lỗi hệ thống' },
            { status: 500 }
        );
    }
});
