// src/app/api/stock-movements/route.ts
// API: GET /api/stock-movements - Lịch sử nhập/xuất kho

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { stockMovementListSchema } from '@/lib/validations/inventory';
import { getStockMovements } from '@/services/inventory.service';

import { serializeDecimals } from '@/lib/api-utils';
export const GET = withAuth(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: AuthUser) => {
    try {
        const { searchParams } = new URL(req.url);

        // Parse and validate query params
        const params = stockMovementListSchema.parse({
            page: searchParams.get('page'),
            limit: searchParams.get('limit'),
            product_id: searchParams.get('product_id'),
            type: searchParams.get('type'),
            partner_id: searchParams.get('partner_id'),
            date_from: searchParams.get('date_from'),
            date_to: searchParams.get('date_to'),
            sort_by: searchParams.get('sort_by'),
            sort_order: searchParams.get('sort_order'),
        });

        const result = await getStockMovements(user.farm_id, params);

        return NextResponse.json({
            success: true,
            data: serializeDecimals(result),
        });
    } catch (error) {
        console.error('GET /api/stock-movements error:', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message } },
            { status: 400 }
        );
    }
});
