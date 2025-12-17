// src/app/api/ar/payments/[id]/void/route.ts
// Void AR Payment API - Phase 4 Task 4

import { NextRequest, NextResponse } from 'next/server';
import { voidPayment } from '@/services/ar-payment.service';

// POST /api/ar/payments/:id/void
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
            // No body - ok
        }

        const payment = await voidPayment(farmId, id, userId, reason);

        return NextResponse.json({
            success: true,
            message: `Đã hủy phiếu thu ${payment.payment_number}`,
            payment,
        });
    } catch (error: any) {
        console.error('Void payment error:', error);
        return NextResponse.json(
            { error: error.message || 'Không thể hủy phiếu thu' },
            { status: 400 }
        );
    }
}
