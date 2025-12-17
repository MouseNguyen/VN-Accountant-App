// src/app/api/ap/payments/route.ts
// AP Payments API - Phase 4 Task 6

import { NextRequest, NextResponse } from 'next/server';
import { getAPPayments, createAPPayment } from '@/services/ap-payment.service';

// GET /api/ap/payments
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const farmId = searchParams.get('farm_id');

        if (!farmId) {
            return NextResponse.json({ error: 'Farm ID is required' }, { status: 400 });
        }

        const params = {
            page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
            limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
            status: searchParams.get('status') || undefined,
            vendor_id: searchParams.get('vendor_id') || undefined,
            from_date: searchParams.get('from_date') || undefined,
            to_date: searchParams.get('to_date') || undefined,
            search: searchParams.get('search') || undefined,
        };

        const result = await getAPPayments(farmId, params);
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/ap/payments
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.farm_id || !body.vendor_id || !body.amount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const payment = await createAPPayment(body);
        return NextResponse.json(payment, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
