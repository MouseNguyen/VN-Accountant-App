// src/app/api/ap/invoices/[id]/void/route.ts
// Void AP Invoice API - Phase 4 Task 6

import { NextRequest, NextResponse } from 'next/server';
import { voidAPInvoice } from '@/services/ap-invoice.service';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const farmId = request.headers.get('x-farm-id');
        if (!farmId) {
            return NextResponse.json({ error: 'Farm ID is required' }, { status: 400 });
        }

        const userId = request.headers.get('x-user-id') || 'system';
        const { id } = params;

        let reason: string | undefined;
        try {
            const body = await request.json();
            reason = body.reason;
        } catch { }

        const invoice = await voidAPInvoice(farmId, id, userId, reason);

        return NextResponse.json({
            success: true,
            message: `Đã hủy hóa đơn ${invoice.invoice_number}`,
            invoice,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
