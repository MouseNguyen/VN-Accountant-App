// src/app/api/ap/payments/[id]/allocate/route.ts
// Allocate AP Payment API - Phase 4 Task 6

import { NextRequest, NextResponse } from 'next/server';
import { allocateAPPayment } from '@/services/ap-payment.service';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const farmId = request.headers.get('x-farm-id');
        if (!farmId) {
            return NextResponse.json({ error: 'Farm ID is required' }, { status: 400 });
        }

        const { id } = params;
        const body = await request.json();

        if (!body.allocations || !Array.isArray(body.allocations)) {
            return NextResponse.json({ error: 'allocations array is required' }, { status: 400 });
        }

        const payment = await allocateAPPayment(farmId, id, body);

        return NextResponse.json({
            success: true,
            message: `Đã phân bổ phiếu chi ${payment.payment_number}`,
            payment,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
