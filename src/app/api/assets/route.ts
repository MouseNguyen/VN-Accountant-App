// src/app/api/assets/route.ts
// Assets API - List and Create

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getCurrentFarmId } from '@/lib/context';
import { getAssets, createAsset, getAssetSummary } from '@/services/asset.service';
import { createAssetSchema, assetFiltersSchema } from '@/lib/validations/asset';

export const GET = withAuth(async (req: NextRequest) => {
    try {
        const farmId = getCurrentFarmId();
        const url = new URL(req.url);

        // Check if requesting summary
        if (url.searchParams.get('summary') === 'true') {
            const summary = await getAssetSummary(farmId);
            return NextResponse.json({ success: true, data: summary });
        }

        // Parse filters
        const filters = assetFiltersSchema.parse({
            status: url.searchParams.get('status') || undefined,
            category: url.searchParams.get('category') || undefined,
            search: url.searchParams.get('search') || undefined,
            from_date: url.searchParams.get('from_date') || undefined,
            to_date: url.searchParams.get('to_date') || undefined,
            page: url.searchParams.get('page') || 1,
            limit: url.searchParams.get('limit') || 50,
        });

        const result = await getAssets(farmId, filters, filters.page, filters.limit);

        return NextResponse.json({
            success: true,
            data: result.data,
            pagination: result.pagination,
        });
    } catch (error) {
        console.error('[API] GET /assets error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Lỗi tải danh sách tài sản' },
            { status: 500 }
        );
    }
});

export const POST = withAuth(async (req: NextRequest) => {
    try {
        const farmId = getCurrentFarmId();
        const body = await req.json();

        const validated = createAssetSchema.parse(body);
        const asset = await createAsset(farmId, {
            ...validated,
            image_url: validated.image_url ?? undefined,
        });

        return NextResponse.json({ success: true, data: asset }, { status: 201 });
    } catch (error) {
        console.error('[API] POST /assets error:', error);

        if (error instanceof Error && error.name === 'ZodError') {
            return NextResponse.json(
                { success: false, error: 'Dữ liệu không hợp lệ', details: error },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Lỗi tạo tài sản' },
            { status: 400 }
        );
    }
});
