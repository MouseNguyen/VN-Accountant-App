// src/app/api/stock-count-items/route.ts
// API: PUT /api/stock-count-items - Cập nhật số lượng thực tế

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { updateStockCountItemSchema } from '@/lib/validations/inventory';
import { updateStockCountItem } from '@/services/inventory.service';

import { serializeDecimals } from '@/lib/api-utils';
export const PUT = withAuth(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: AuthUser) => {
    try {
        const body = await req.json();

        // Validate input
        const input = updateStockCountItemSchema.parse(body);

        // Update item
        const result = await updateStockCountItem(user.farm_id, input);

        return NextResponse.json({
            success: true,
            data: serializeDecimals(result),
        });
    } catch (error) {
        console.error('PUT /api/stock-count-items error:', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message } },
            { status: 400 }
        );
    }
});
