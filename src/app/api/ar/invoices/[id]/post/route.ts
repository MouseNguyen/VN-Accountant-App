// src/app/api/ar/invoices/[id]/post/route.ts
// POST AR Invoice Endpoint - Phase 4 Task 3

import { NextRequest, NextResponse } from 'next/server';
import { postInvoice } from '@/services/ar-invoice.service';

// POST /api/ar/invoices/:id/post
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const farmId = request.headers.get('x-farm-id');
        if (!farmId) {
            return NextResponse.json(
                { error: 'Farm ID is required' },
                { status: 400 }
            );
        }

        const userId = request.headers.get('x-user-id') || 'system';
        const { id } = params;

        const result = await postInvoice(farmId, id, userId);

        return NextResponse.json({
            success: true,
            message: `Đã ghi sổ hóa đơn ${result.invoice.invoice_number}`,
            invoice: result.invoice,
            stock_movements: result.stockMovements,
        });
    } catch (error: any) {
        console.error('Post invoice error:', error);
        return NextResponse.json(
            { error: error.message || 'Không thể ghi sổ hóa đơn' },
            { status: 400 }
        );
    }
}
