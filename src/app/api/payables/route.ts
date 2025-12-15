// src/app/api/payables/route.ts
// GET - Danh sách công nợ

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { payableQuerySchema } from '@/lib/validations/payable';
import { getPayables } from '@/services/payable.service';

import { serializeDecimals } from '@/lib/api-utils';
export const GET = withAuth(async (request: NextRequest, _context, _user: AuthUser) => {
    try {
        const { searchParams } = new URL(request.url);
        const query = payableQuerySchema.parse(Object.fromEntries(searchParams));
        const result = await getPayables(query);

        return NextResponse.json({ success: true, data: serializeDecimals(result) });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Lỗi khi tải danh sách công nợ';
        console.error('Payables list error:', error);
        return NextResponse.json({ success: false, error: { message } }, { status: 500 });
    }
});
