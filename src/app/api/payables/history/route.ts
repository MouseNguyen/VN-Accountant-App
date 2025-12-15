// src/app/api/payables/history/route.ts
// GET - Lịch sử thanh toán

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { paymentHistoryQuerySchema } from '@/lib/validations/payable';
import { getPaymentHistory } from '@/services/payable.service';

import { serializeDecimals } from '@/lib/api-utils';
export const GET = withAuth(async (request: NextRequest, _context, _user: AuthUser) => {
    try {
        const { searchParams } = new URL(request.url);
        const query = paymentHistoryQuerySchema.parse(Object.fromEntries(searchParams));
        const result = await getPaymentHistory(query);

        return NextResponse.json({ success: true, data: serializeDecimals(result) });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Lỗi khi tải lịch sử thanh toán';
        console.error('Payment history error:', error);
        return NextResponse.json({ success: false, error: { message } }, { status: 500 });
    }
});
