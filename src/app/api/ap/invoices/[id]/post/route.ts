// src/app/api/ap/invoices/[id]/post/route.ts
// Post AP Invoice API - Phase 4 Task 6

import { NextRequest, NextResponse } from 'next/server';
import { postAPInvoice } from '@/services/ap-invoice.service';

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

        const result = await postAPInvoice(farmId, id, userId);

        return NextResponse.json({
            success: true,
            message: `Đã ghi sổ hóa đơn ${result.invoice.invoice_number}`,
            invoice: result.invoice,
            stock_movements: result.stockMovements,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
