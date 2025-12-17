// src/app/api/ap/payments/[id]/post/route.ts
// Post AP Payment API - Phase 4 Task 6

import { NextRequest, NextResponse } from 'next/server';
import { postAPPayment } from '@/services/ap-payment.service';

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

        const result = await postAPPayment(farmId, id, userId);

        return NextResponse.json({
            success: true,
            message: `Đã ghi sổ phiếu chi ${result.payment.payment_number}`,
            payment: result.payment,
            journal_entry_id: result.journal_entry_id,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
