// src/app/api/stock-movements/in/route.ts
// API: POST /api/stock-movements/in - Nhập kho

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { stockInSchema } from '@/lib/validations/inventory';
import { stockIn } from '@/services/inventory.service';

import { serializeDecimals } from '@/lib/api-utils';
export const POST = withAuth(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: AuthUser) => {
    try {
        const body = await req.json();

        // Validate input
        const input = stockInSchema.parse(body);

        // Call service
        const result = await stockIn(user.farm_id, user.id, input);

        return NextResponse.json({
            success: true,
            data: serializeDecimals(result),
            message: 'Nhập kho thành công',
        });
    } catch (error) {
        console.error('POST /api/stock-movements/in error:', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message } },
            { status: 400 }
        );
    }
});
