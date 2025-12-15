// src/app/api/reports/stock/movements/route.ts
// API: Báo cáo nhập xuất tồn

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { getStockMovementReport } from '@/services/stock-reports.service';
import { z } from 'zod';

import { serializeDecimals } from '@/lib/api-utils';
const querySchema = z.object({
    date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    product_id: z.string().uuid().optional(),
    category: z.string().optional(),
});

export const GET = withAuth(async (
    req: NextRequest,
    context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const url = new URL(req.url);
        const query = {
            date_from: url.searchParams.get('date_from') || '',
            date_to: url.searchParams.get('date_to') || '',
            product_id: url.searchParams.get('product_id') || undefined,
            category: url.searchParams.get('category') || undefined,
        };

        const validated = querySchema.parse(query);

        const report = await getStockMovementReport(user.farm_id, validated);
        return NextResponse.json({ success: true, data: serializeDecimals(report) });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: { message: 'Thiếu date_from hoặc date_to' } },
                { status: 400 }
            );
        }
        console.error('[Stock Movement Report Error]', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message } },
            { status: 500 }
        );
    }
});
