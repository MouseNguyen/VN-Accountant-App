// src/app/api/ar/payments/[id]/route.ts
// AR Payment Detail API - Phase 4 Task 4

import { NextRequest, NextResponse } from 'next/server';
import {
    getARPaymentById,
    updateARPayment,
    deleteARPayment,
} from '@/services/ar-payment.service';

// GET /api/ar/payments/:id
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const farmId = searchParams.get('farm_id');
        const { id } = params;

        if (!farmId) {
            return NextResponse.json(
                { error: 'Farm ID is required' },
                { status: 400 }
            );
        }

        const payment = await getARPaymentById(farmId, id);
        if (!payment) {
            return NextResponse.json(
                { error: 'Payment not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(payment);
    } catch (error: any) {
        console.error('Get AR payment error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch payment' },
            { status: 500 }
        );
    }
}

// PUT /api/ar/payments/:id
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const farmId = searchParams.get('farm_id');
        const { id } = params;
        const body = await request.json();

        if (!farmId) {
            return NextResponse.json(
                { error: 'Farm ID is required' },
                { status: 400 }
            );
        }

        const payment = await updateARPayment(farmId, id, body);
        return NextResponse.json(payment);
    } catch (error: any) {
        console.error('Update AR payment error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update payment' },
            { status: 400 }
        );
    }
}

// DELETE /api/ar/payments/:id
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const farmId = searchParams.get('farm_id');
        const { id } = params;

        if (!farmId) {
            return NextResponse.json(
                { error: 'Farm ID is required' },
                { status: 400 }
            );
        }

        await deleteARPayment(farmId, id);
        return NextResponse.json({ success: true, message: 'Payment deleted' });
    } catch (error: any) {
        console.error('Delete AR payment error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete payment' },
            { status: 400 }
        );
    }
}
