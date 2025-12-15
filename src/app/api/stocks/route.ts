// src/app/api/stocks/route.ts
// API: GET /api/stocks - Danh sách tồn kho

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { stockListSchema } from '@/lib/validations/inventory';
import { getStocks } from '@/services/inventory.service';
import { serializeDecimals } from '@/lib/api-utils';

export const GET = withAuth(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: AuthUser) => {
    try {
        const { searchParams } = new URL(req.url);

        // Parse and validate query params - only include non-null values
        const rawParams: Record<string, string> = {};
        for (const [key, value] of searchParams.entries()) {
            rawParams[key] = value;
        }
        const params = stockListSchema.parse(rawParams);

        const result = await getStocks(user.farm_id, params);

        return NextResponse.json({
            success: true,
            data: serializeDecimals(result),
        });
    } catch (error) {
        console.error('GET /api/stocks error:', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message } },
            { status: 400 }
        );
    }
});
