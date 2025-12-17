// src/app/api/ar/payments/[id]/auto-allocate/route.ts
// Auto-Allocate AR Payment (FIFO) API - Phase 4 Task 4

import { NextRequest, NextResponse } from 'next/server';
import { autoAllocateFIFO } from '@/services/ar-payment.service';

// POST /api/ar/payments/:id/auto-allocate
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

        const { id } = params;

        const result = await autoAllocateFIFO(farmId, id);

        return NextResponse.json({
            success: true,
            message: `Đã tự động phân bổ ${result.allocations.length} hóa đơn`,
            payment: result.payment,
            allocations: result.allocations,
        });
    } catch (error: any) {
        console.error('Auto-allocate payment error:', error);
        return NextResponse.json(
            { error: error.message || 'Không thể tự động phân bổ' },
            { status: 400 }
        );
    }
}
