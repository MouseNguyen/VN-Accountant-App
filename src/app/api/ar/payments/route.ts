// src/app/api/ar/payments/route.ts
// AR Payments API - Phase 4 Task 4

import { NextRequest, NextResponse } from 'next/server';
import {
    getARPayments,
    createARPayment,
} from '@/services/ar-payment.service';

// GET /api/ar/payments
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const farmId = searchParams.get('farm_id');

        if (!farmId) {
            return NextResponse.json(
                { error: 'Farm ID is required' },
                { status: 400 }
            );
        }

        const params = {
            page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
            limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
            status: searchParams.get('status') || undefined,
            customer_id: searchParams.get('customer_id') || undefined,
            from_date: searchParams.get('from_date') || undefined,
            to_date: searchParams.get('to_date') || undefined,
            search: searchParams.get('search') || undefined,
        };

        const result = await getARPayments(farmId, params);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Get AR payments error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch payments' },
            { status: 500 }
        );
    }
}

// POST /api/ar/payments
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.farm_id || !body.customer_id || !body.amount) {
            return NextResponse.json(
                { error: 'Missing required fields: farm_id, customer_id, amount' },
                { status: 400 }
            );
        }

        const payment = await createARPayment(body);
        return NextResponse.json(payment, { status: 201 });
    } catch (error: any) {
        console.error('Create AR payment error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create payment' },
            { status: 400 }
        );
    }
}
