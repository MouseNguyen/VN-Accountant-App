// src/app/api/reports/tax-summary/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getTaxReport, getTaxPaymentHistory } from '@/services/tax-report.service';
import { taxReportQuerySchema } from '@/lib/validations/tax-report';
import { ZodError } from 'zod';

// GET - Lấy báo cáo thuế theo quý
export const GET = withAuth(async (req: NextRequest) => {
    try {
        const url = new URL(req.url);
        const query = Object.fromEntries(url.searchParams);

        console.log('[Tax Report] Request:', { query, userAgent: req.headers.get('user-agent')?.substring(0, 50) });

        const validated = taxReportQuerySchema.parse(query);

        const data = await getTaxReport(validated.quarter, validated.year);

        console.log('[Tax Report] Response:', {
            quarter: validated.quarter,
            year: validated.year,
            vatPayable: data.vat.payable,
            totalLiability: data.total_liability
        });

        return NextResponse.json({
            success: true,
            data,
        });
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json(
                { success: false, error: 'Dữ liệu không hợp lệ', details: error.issues },
                { status: 400 }
            );
        }
        console.error('Tax report error:', error);
        return NextResponse.json(
            { success: false, error: 'Lỗi tải báo cáo thuế' },
            { status: 500 }
        );
    }
});
