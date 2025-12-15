// src/app/api/invoices/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getInvoices, uploadAndOCRInvoice } from '@/services/invoice.service';
import { invoiceListSchema, uploadInvoiceSchema } from '@/lib/validations/invoice';
import { ZodError } from 'zod';

// GET - Danh sách invoices
export const GET = withAuth(async (req: NextRequest) => {
    try {
        const url = new URL(req.url);
        const query = Object.fromEntries(url.searchParams);

        const validated = invoiceListSchema.parse(query);
        const result = await getInvoices(validated);

        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json(
                { success: false, error: 'Dữ liệu không hợp lệ', details: error.issues },
                { status: 400 }
            );
        }
        console.error('Get invoices error:', error);
        return NextResponse.json(
            { success: false, error: 'Lỗi tải danh sách' },
            { status: 500 }
        );
    }
});

// POST - Upload và OCR invoice mới
// POST - Upload và OCR invoice mới
export const POST = withAuth(async (req: NextRequest) => {
    try {
        console.log('[API] Processing invoice upload request...');
        const body = await req.json();
        console.log('[API] Body received, size approx:', JSON.stringify(body).length);

        const validated = uploadInvoiceSchema.parse(body);
        console.log('[API] Validation passed, calling service...');

        const result = await uploadAndOCRInvoice(validated);

        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json(
                { success: false, error: 'Dữ liệu không hợp lệ', details: error.issues },
                { status: 400 }
            );
        }
        console.error('Upload invoice error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Lỗi upload';
        return NextResponse.json(
            { success: false, error: { message: errorMessage } },
            { status: 500 }
        );
    }
});
