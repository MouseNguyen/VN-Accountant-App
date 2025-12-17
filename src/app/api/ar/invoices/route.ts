// src/app/api/ar/invoices/route.ts
// AR Invoice API - List and Create

import { NextRequest, NextResponse } from 'next/server';
import { getARInvoices, createARInvoice } from '@/services/ar-invoice.service';
import type { ARInvoiceListParams, CreateARInvoiceInput } from '@/types/ar-invoice';

// GET /api/ar/invoices - List invoices
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const farmId = searchParams.get('farm_id');

        if (!farmId) {
            return NextResponse.json({ error: 'farm_id is required' }, { status: 400 });
        }

        const params: ARInvoiceListParams = {
            page: Number(searchParams.get('page')) || 1,
            limit: Number(searchParams.get('limit')) || 20,
            status: searchParams.get('status') as any || undefined,
            customer_id: searchParams.get('customer_id') || undefined,
            from_date: searchParams.get('from_date') || undefined,
            to_date: searchParams.get('to_date') || undefined,
            search: searchParams.get('search') || undefined,
        };

        const result = await getARInvoices(farmId, params);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('GET /api/ar/invoices error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/ar/invoices - Create draft invoice
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { searchParams } = new URL(request.url);
        const farmId = searchParams.get('farm_id') || body.farm_id;

        if (!farmId) {
            return NextResponse.json({ error: 'farm_id is required' }, { status: 400 });
        }

        if (!body.customer_id) {
            return NextResponse.json({ error: 'customer_id is required' }, { status: 400 });
        }

        if (!body.lines || body.lines.length === 0) {
            return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 });
        }

        const input: CreateARInvoiceInput = {
            farm_id: farmId,
            invoice_date: body.invoice_date || new Date().toISOString().split('T')[0],
            customer_id: body.customer_id,
            payment_term_days: body.payment_term_days,
            description: body.description,
            notes: body.notes,
            lines: body.lines,
            created_by: body.created_by,
        };

        const invoice = await createARInvoice(input);
        return NextResponse.json(invoice, { status: 201 });
    } catch (error: any) {
        console.error('POST /api/ar/invoices error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
