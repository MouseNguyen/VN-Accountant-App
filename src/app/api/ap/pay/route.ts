// src/app/api/ap/pay/route.ts
// Make Payment to Vendor API

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { makePaymentSchema } from '@/lib/validations/ap';
import { makePayment } from '@/services/ap.service';

// POST /api/ap/pay - Make payment to vendor
export const POST = withAuth(async (
    request: NextRequest,
    _context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const body = await request.json();

        const validation = makePaymentSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'Dữ liệu không hợp lệ', details: validation.error.flatten() },
                { status: 400 }
            );
        }

        const result = await makePayment(user.farm_id, user.id, validation.data);

        return NextResponse.json({ success: true, data: result }, { status: 201 });
    } catch (error) {
        console.error('POST /api/ap/pay error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Lỗi server' },
            { status: 500 }
        );
    }
});
