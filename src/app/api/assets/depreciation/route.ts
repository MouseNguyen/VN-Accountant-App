// src/app/api/assets/depreciation/route.ts
// Depreciation Schedule API - Get and Run

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getCurrentFarmId } from '@/lib/context';
import { getDepreciationSchedule, calculateMonthlyDepreciation } from '@/services/asset.service';
import { depreciationScheduleFiltersSchema, runDepreciationSchema } from '@/lib/validations/asset';

export const GET = withAuth(async (req: NextRequest) => {
    try {
        const farmId = getCurrentFarmId();
        const url = new URL(req.url);

        const filters = depreciationScheduleFiltersSchema.parse({
            asset_id: url.searchParams.get('asset_id') || undefined,
            year: url.searchParams.get('year') || undefined,
        });

        const schedule = await getDepreciationSchedule(farmId, filters.asset_id, filters.year);

        return NextResponse.json({ success: true, data: schedule });
    } catch (error) {
        console.error('[API] GET /assets/depreciation error:', error);
        return NextResponse.json(
            { success: false, error: 'Lỗi tải bảng khấu hao' },
            { status: 500 }
        );
    }
});

export const POST = withAuth(async (req: NextRequest) => {
    try {
        const farmId = getCurrentFarmId();
        const body = await req.json().catch(() => ({}));

        const validated = runDepreciationSchema.parse(body);
        const result = await calculateMonthlyDepreciation(farmId, validated.period);

        return NextResponse.json({
            success: true,
            data: result,
            message: `Đã tính khấu hao: ${result.processed} xử lý, ${result.skipped} bỏ qua, ${result.errors} lỗi`,
        });
    } catch (error) {
        console.error('[API] POST /assets/depreciation error:', error);

        if (error instanceof Error && error.name === 'ZodError') {
            return NextResponse.json(
                { success: false, error: 'Dữ liệu không hợp lệ', details: error },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Lỗi tính khấu hao' },
            { status: 500 }
        );
    }
});
