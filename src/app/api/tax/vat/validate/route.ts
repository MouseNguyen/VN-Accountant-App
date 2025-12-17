// src/app/api/tax/vat/validate/route.ts
// API Route: POST /api/tax/vat/validate
// Validates VAT deduction for an invoice

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { validateVATDeduction } from '@/lib/tax/vat-validator';
import { z } from 'zod';

const validateSchema = z.object({
    transaction_id: z.string().optional(),
    invoice_number: z.string().optional(),
    invoice_date: z.string(),
    invoice_series: z.string().optional(),

    partner_id: z.string().optional(),
    supplier_tax_code: z.string().optional(),
    supplier_name: z.string().optional(),
    supplier_status: z.enum(['ACTIVE', 'SUSPENDED', 'CLOSED', 'BANKRUPT']).optional(),

    buyer_tax_code: z.string().optional(),
    buyer_name: z.string().optional(),

    goods_value: z.number(),
    vat_rate: z.number(),
    vat_amount: z.number(),
    total_amount: z.number(),

    payment_method: z.enum(['CASH', 'BANK_TRANSFER', 'CREDIT', 'MOMO', 'ZALO_PAY', 'OTHER']),
    has_bank_payment: z.boolean().optional(),

    usage_purpose: z.enum(['BUSINESS', 'PERSONAL', 'WELFARE_FUND']).optional(),

    category: z.string().optional(),

    is_vehicle: z.boolean().optional(),
    asset_type: z.enum(['CAR_UNDER_9_SEATS', 'VEHICLE', 'MACHINERY', 'BUILDING', 'EQUIPMENT']).optional(),
    vehicle_type: z.enum(['CAR', 'TRUCK', 'MOTORCYCLE']).optional(),
    vehicle_seats: z.number().optional(),
    is_transport_biz: z.boolean().optional(),

    is_entertainment: z.boolean().optional(),
    number_of_persons: z.number().optional(),

    skip_mst_lookup: z.boolean().optional(),
    save_result: z.boolean().optional(),
});

export const POST = withAuth(async (
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

        const body = await req.json();
        const validated = validateSchema.parse(body);

        const result = await validateVATDeduction(farmId, validated);

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: 'Dữ liệu không hợp lệ', details: error.issues },
                { status: 400 }
            );
        }

        console.error('VAT validation error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Lỗi hệ thống' },
            { status: 500 }
        );
    }
});
