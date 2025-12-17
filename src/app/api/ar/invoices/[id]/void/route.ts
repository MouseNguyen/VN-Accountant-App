// src/app/api/ar/invoices/[id]/void/route.ts
// VOID AR Invoice Endpoint - Phase 4 Task 3

import { NextRequest, NextResponse } from 'next/server';
import { voidInvoice } from '@/services/ar-invoice.service';

// POST /api/ar/invoices/:id/void
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

        let reason: string | undefined;
        try {
            const body = await request.json();
            reason = body.reason;
        } catch {
            // No body or invalid JSON - that's ok
        }

        const invoice = await voidInvoice(farmId, id, userId, { reason });

        return NextResponse.json({
            success: true,
            message: `Đã hủy hóa đơn ${invoice.invoice_number}`,
            invoice,
        });
    } catch (error: any) {
        console.error('Void invoice error:', error);
        return NextResponse.json(
            { error: error.message || 'Không thể hủy hóa đơn' },
            { status: 400 }
        );
    }
}
