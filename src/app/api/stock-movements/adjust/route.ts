// src/app/api/stock-movements/adjust/route.ts
// API: POST /api/stock-movements/adjust - Điều chỉnh tồn kho

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { stockAdjustSchema } from '@/lib/validations/inventory';
import { stockAdjust } from '@/services/inventory.service';

import { serializeDecimals } from '@/lib/api-utils';
export const POST = withAuth(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: AuthUser) => {
    try {
        const body = await req.json();

        // Validate input
        const input = stockAdjustSchema.parse(body);

        // Call service
        const result = await stockAdjust(user.farm_id, user.id, input);

        return NextResponse.json({
            success: true,
            data: serializeDecimals(result),
            message: 'Điều chỉnh tồn kho thành công',
        });
    } catch (error) {
        console.error('POST /api/stock-movements/adjust error:', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message } },
            { status: 400 }
        );
    }
});
