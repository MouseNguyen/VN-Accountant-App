// src/app/api/ar/payments/[id]/post/route.ts
// Post AR Payment API - Phase 4 Task 4

import { NextRequest, NextResponse } from 'next/server';
import { postPayment } from '@/services/ar-payment.service';

// POST /api/ar/payments/:id/post
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

        const result = await postPayment(farmId, id, userId);

        return NextResponse.json({
            success: true,
            message: `Đã ghi sổ phiếu thu ${result.payment.payment_number}`,
            payment: result.payment,
            journal_entry_id: result.journal_entry_id,
        });
    } catch (error: any) {
        console.error('Post payment error:', error);
        return NextResponse.json(
            { error: error.message || 'Không thể ghi sổ phiếu thu' },
            { status: 400 }
        );
    }
}
