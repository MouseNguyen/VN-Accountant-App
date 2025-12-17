// src/app/api/ap/invoices/[id]/route.ts
// AP Invoice Detail API - Phase 4 Task 6

import { NextRequest, NextResponse } from 'next/server';
import { getAPInvoiceById, updateAPInvoice, deleteAPInvoice } from '@/services/ap-invoice.service';

// GET /api/ap/invoices/:id
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const farmId = searchParams.get('farm_id');
        const { id } = params;

        if (!farmId) {
            return NextResponse.json({ error: 'Farm ID is required' }, { status: 400 });
        }

        const invoice = await getAPInvoiceById(farmId, id);
        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        return NextResponse.json(invoice);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT /api/ap/invoices/:id
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const farmId = searchParams.get('farm_id');
        const { id } = params;
        const body = await request.json();

        if (!farmId) {
            return NextResponse.json({ error: 'Farm ID is required' }, { status: 400 });
        }

        const invoice = await updateAPInvoice(farmId, id, body);
        return NextResponse.json(invoice);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

// DELETE /api/ap/invoices/:id
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const farmId = searchParams.get('farm_id');
        const { id } = params;

        if (!farmId) {
            return NextResponse.json({ error: 'Farm ID is required' }, { status: 400 });
        }

        await deleteAPInvoice(farmId, id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
