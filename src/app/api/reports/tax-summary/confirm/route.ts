// src/app/api/reports/tax-summary/confirm/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { confirmTaxPayment } from '@/services/tax-report.service';
import { confirmTaxPaymentSchema } from '@/lib/validations/tax-report';
import { ZodError } from 'zod';

// POST - Xác nhận đã nộp thuế
export const POST = withAuth(async (req: NextRequest) => {
    try {
        const body = await req.json();
        const validated = confirmTaxPaymentSchema.parse(body);

        const result = await confirmTaxPayment(validated);

        return NextResponse.json({
            success: true,
            message: `Đã xác nhận nộp ${validated.tax_type} Quý ${validated.quarter}/${validated.year}`,
            ...result,
        });
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json(
                { success: false, error: 'Dữ liệu không hợp lệ', details: error.issues },
                { status: 400 }
            );
        }
        console.error('Confirm tax payment error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Lỗi xác nhận nộp thuế',
            },
            { status: 400 }
        );
    }
});
