// src/app/api/ap/payments/[id]/void/route.ts
// Void AP Payment API - Phase 4 Task 6

import { NextRequest, NextResponse } from 'next/server';
import { voidAPPayment } from '@/services/ap-payment.service';

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

        const payment = await voidAPPayment(farmId, id, userId, reason);

        return NextResponse.json({
            success: true,
            message: `Đã hủy phiếu chi ${payment.payment_number}`,
            payment,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
