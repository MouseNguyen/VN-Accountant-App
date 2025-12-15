// src/app/api/invoices/[id]/confirm/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { confirmInvoice } from '@/services/invoice.service';
import { confirmInvoiceSchema } from '@/lib/validations/invoice';
import { ZodError } from 'zod';

// POST - Xác nhận invoice và tạo transaction
export const POST = withAuth(async (request: NextRequest, context, _user: AuthUser) => {
    try {
        const params = await context.params;
        const id = params.id as string;
        const body = await request.json();

        const validated = confirmInvoiceSchema.parse({
            ...body,
            invoice_id: id,
        });

        const result = await confirmInvoice(validated);

        return NextResponse.json({
            success: true,
            message: 'Đã xác nhận và tạo giao dịch',
            ...result,
        });
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json(
                { success: false, error: 'Dữ liệu không hợp lệ', details: error.issues },
                { status: 400 }
            );
        }
        console.error('Confirm invoice error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Lỗi xác nhận' },
            { status: 400 }
        );
    }
});
