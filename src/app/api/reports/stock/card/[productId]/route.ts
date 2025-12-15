// src/app/api/reports/stock/card/[productId]/route.ts
// API: Thẻ kho theo sản phẩm

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { getStockCard } from '@/services/stock-reports.service';

import { serializeDecimals } from '@/lib/api-utils';
export const GET = withAuth(async (
    req: NextRequest,
    context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const params = await context.params;
        const productId = params.productId;

        const url = new URL(req.url);
        const date_from = url.searchParams.get('date_from') || '';
        const date_to = url.searchParams.get('date_to') || '';

        if (!date_from || !date_to) {
            return NextResponse.json(
                { success: false, error: { message: 'Thiếu date_from hoặc date_to' } },
                { status: 400 }
            );
        }

        const report = await getStockCard(user.farm_id, {
            product_id: productId,
            date_from,
            date_to,
        });

        return NextResponse.json({ success: true, data: serializeDecimals(report) });
    } catch (error) {
        console.error('[Stock Card Error]', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message } },
            { status: 400 }
        );
    }
});
