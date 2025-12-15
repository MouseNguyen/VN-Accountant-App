// src/app/api/stock-counts/[id]/route.ts
// API: GET /api/stock-counts/:id - Chi tiết phiếu kiểm kê
// API: POST /api/stock-counts/:id/complete - Hoàn thành kiểm kê
// API: DELETE /api/stock-counts/:id - Hủy phiếu kiểm kê

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { completeStockCountSchema } from '@/lib/validations/inventory';
import { getStockCountById, completeStockCount, cancelStockCount } from '@/services/inventory.service';

import { serializeDecimals } from '@/lib/api-utils';
export const GET = withAuth(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: AuthUser) => {
    try {
        const { id } = await context.params;

        const result = await getStockCountById(user.farm_id, id);

        if (!result) {
            return NextResponse.json(
                { success: false, error: { message: 'Không tìm thấy phiếu kiểm kê' } },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: serializeDecimals(result),
        });
    } catch (error) {
        console.error('GET /api/stock-counts/:id error:', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message } },
            { status: 400 }
        );
    }
});

export const POST = withAuth(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: AuthUser) => {
    try {
        const { id } = await context.params;
        const body = await req.json();

        // Validate input
        const input = completeStockCountSchema.parse({
            stock_count_id: id,
            auto_adjust: body.auto_adjust ?? false,
        });

        // Complete stock count
        const result = await completeStockCount(user.farm_id, user.id, input);

        return NextResponse.json({
            success: true,
            data: serializeDecimals(result),
            message: 'Hoàn thành kiểm kê thành công',
        });
    } catch (error) {
        console.error('POST /api/stock-counts/:id/complete error:', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message } },
            { status: 400 }
        );
    }
});

export const DELETE = withAuth(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: AuthUser) => {
    try {
        const { id } = await context.params;

        await cancelStockCount(user.farm_id, id);

        return NextResponse.json({
            success: true,
            message: 'Đã hủy phiếu kiểm kê',
        });
    } catch (error) {
        console.error('DELETE /api/stock-counts/:id error:', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message } },
            { status: 400 }
        );
    }
});
