// src/app/api/ar/payments/[id]/allocate/route.ts
// Allocate AR Payment API - Phase 4 Task 4

import { NextRequest, NextResponse } from 'next/server';
import { allocatePayment } from '@/services/ar-payment.service';

// POST /api/ar/payments/:id/allocate
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
        const body = await request.json();

        if (!body.allocations || !Array.isArray(body.allocations)) {
            return NextResponse.json(
                { error: 'allocations array is required' },
                { status: 400 }
            );
        }

        const payment = await allocatePayment(farmId, id, body);

        return NextResponse.json({
            success: true,
            message: `Đã phân bổ phiếu thu ${payment.payment_number}`,
            payment,
        });
    } catch (error: any) {
        console.error('Allocate payment error:', error);
        return NextResponse.json(
            { error: error.message || 'Không thể phân bổ phiếu thu' },
            { status: 400 }
        );
    }
}
