// src/app/api/stock-counts/route.ts
// API: GET /api/stock-counts - Danh sách phiếu kiểm kê
// API: POST /api/stock-counts - Tạo phiếu kiểm kê mới

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { createStockCountSchema } from '@/lib/validations/inventory';
import { getStockCounts, createStockCount } from '@/services/inventory.service';

import { serializeDecimals } from '@/lib/api-utils';
export const GET = withAuth(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: AuthUser) => {
    try {
        const { searchParams } = new URL(req.url);

        const params = {
            page: parseInt(searchParams.get('page') || '1'),
            limit: parseInt(searchParams.get('limit') || '20'),
            status: searchParams.get('status') || undefined,
        };

        const result = await getStockCounts(user.farm_id, params);

        return NextResponse.json({
            success: true,
            data: serializeDecimals(result),
        });
    } catch (error) {
        console.error('GET /api/stock-counts error:', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message } },
            { status: 400 }
        );
    }
});

export const POST = withAuth(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: AuthUser) => {
    try {
        const body = await req.json();

        // Validate input
        const input = createStockCountSchema.parse(body);

        // Create stock count
        const result = await createStockCount(user.farm_id, user.id, input);

        return NextResponse.json({
            success: true,
            data: serializeDecimals(result),
            message: 'Tạo phiếu kiểm kê thành công',
        });
    } catch (error) {
        console.error('POST /api/stock-counts error:', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message } },
            { status: 400 }
        );
    }
});
