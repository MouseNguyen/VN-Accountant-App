// src/app/api/assets/[id]/dispose/route.ts
// Dispose/Sell Asset API

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getCurrentFarmId } from '@/lib/context';
import { disposeAsset } from '@/services/asset.service';
import { disposeAssetSchema } from '@/lib/validations/asset';

export const POST = withAuth(async (req: NextRequest, { params }) => {
    try {
        const farmId = getCurrentFarmId();
        const resolvedParams = await params;
        const body = await req.json();

        const validated = disposeAssetSchema.parse(body);
        const asset = await disposeAsset(farmId, resolvedParams.id, validated);

        return NextResponse.json({
            success: true,
            data: asset,
            message: asset.status === 'SOLD' ? 'Đã bán tài sản' : 'Đã thanh lý tài sản',
        });
    } catch (error) {
        console.error('[API] POST /assets/[id]/dispose error:', error);

        if (error instanceof Error && error.name === 'ZodError') {
            return NextResponse.json(
                { success: false, error: 'Dữ liệu không hợp lệ', details: error },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Lỗi thanh lý tài sản' },
            { status: 400 }
        );
    }
});
