// src/app/api/ar/invoices/[id]/route.ts
// AR Invoice API - Get, Update, Delete by ID

import { NextRequest, NextResponse } from 'next/server';
import {
    getARInvoiceById,
    updateARInvoice,
    deleteARInvoice,
} from '@/services/ar-invoice.service';
import type { UpdateARInvoiceInput } from '@/types/ar-invoice';

// GET /api/ar/invoices/:id - Get invoice detail
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { searchParams } = new URL(request.url);
        const farmId = searchParams.get('farm_id');

        if (!farmId) {
            return NextResponse.json({ error: 'farm_id is required' }, { status: 400 });
        }

        const invoice = await getARInvoiceById(farmId, params.id);

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        return NextResponse.json(invoice);
    } catch (error: any) {
        console.error('GET /api/ar/invoices/[id] error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT /api/ar/invoices/:id - Update draft invoice
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { searchParams } = new URL(request.url);
        const farmId = searchParams.get('farm_id') || body.farm_id;

        if (!farmId) {
            return NextResponse.json({ error: 'farm_id is required' }, { status: 400 });
        }

        const input: UpdateARInvoiceInput = {
            invoice_date: body.invoice_date,
            customer_id: body.customer_id,
            payment_term_days: body.payment_term_days,
            description: body.description,
            notes: body.notes,
            lines: body.lines,
        };

        const invoice = await updateARInvoice(farmId, params.id, input);
        return NextResponse.json(invoice);
    } catch (error: any) {
        console.error('PUT /api/ar/invoices/[id] error:', error);

        if (error.message.includes('nháp') || error.message.includes('DRAFT')) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        if (error.message.includes('không tồn tại') || error.message.includes('not found')) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/ar/invoices/:id - Delete draft invoice
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { searchParams } = new URL(request.url);
        const farmId = searchParams.get('farm_id');

        if (!farmId) {
            return NextResponse.json({ error: 'farm_id is required' }, { status: 400 });
        }

        await deleteARInvoice(farmId, params.id);
        return NextResponse.json({ success: true, message: 'Invoice deleted' });
    } catch (error: any) {
        console.error('DELETE /api/ar/invoices/[id] error:', error);

        if (error.message.includes('nháp') || error.message.includes('DRAFT')) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        if (error.message.includes('không tồn tại') || error.message.includes('not found')) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
