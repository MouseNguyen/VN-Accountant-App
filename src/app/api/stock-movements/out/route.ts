// src/app/api/stock-movements/out/route.ts
// API: POST /api/stock-movements/out - Xuất kho

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { stockOutSchema } from '@/lib/validations/inventory';
import { stockOut } from '@/services/inventory.service';

import { serializeDecimals } from '@/lib/api-utils';
export const POST = withAuth(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: AuthUser) => {
    try {
        const body = await req.json();

        // Validate input
        const input = stockOutSchema.parse(body);

        // Call service
        const result = await stockOut(user.farm_id, user.id, input);

        return NextResponse.json({
            success: true,
            data: serializeDecimals(result),
            message: 'Xuất kho thành công',
        });
    } catch (error) {
        console.error('POST /api/stock-movements/out error:', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message } },
            { status: 400 }
        );
    }
});
