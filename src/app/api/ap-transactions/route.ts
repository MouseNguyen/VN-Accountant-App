// src/app/api/ap-transactions/route.ts
// AP Transactions API - List and Create

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { apListSchema, createAPSchema } from '@/lib/validations/ap';
import { getAPTransactions, createAPFromPurchase } from '@/services/ap.service';

// GET /api/ap-transactions - List AP transactions
export const GET = withAuth(async (
    request: NextRequest,
    _context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const { searchParams } = new URL(request.url);
        const params = Object.fromEntries(searchParams.entries());

        const validation = apListSchema.safeParse(params);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'Tham số không hợp lệ', details: validation.error.flatten() },
                { status: 400 }
            );
        }

        const result = await getAPTransactions(user.farm_id, validation.data);

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error('GET /api/ap-transactions error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Lỗi server' },
            { status: 500 }
        );
    }
});

// POST /api/ap-transactions - Create new AP transaction
export const POST = withAuth(async (
    request: NextRequest,
    _context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const body = await request.json();

        const validation = createAPSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'Dữ liệu không hợp lệ', details: validation.error.flatten() },
                { status: 400 }
            );
        }

        const result = await createAPFromPurchase(user.farm_id, user.id, validation.data);

        return NextResponse.json({ success: true, data: result }, { status: 201 });
    } catch (error) {
        console.error('POST /api/ap-transactions error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Lỗi server' },
            { status: 500 }
        );
    }
});
