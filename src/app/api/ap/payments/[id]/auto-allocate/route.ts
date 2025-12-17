// src/app/api/ap/payments/[id]/auto-allocate/route.ts
// Auto-Allocate AP Payment (FIFO) API - Phase 4 Task 6

import { NextRequest, NextResponse } from 'next/server';
import { autoAllocateAPFIFO } from '@/services/ap-payment.service';

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

        const result = await autoAllocateAPFIFO(farmId, id);

        return NextResponse.json({
            success: true,
            message: `Đã tự động phân bổ ${result.allocations.length} hóa đơn`,
            payment: result.payment,
            allocations: result.allocations,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
