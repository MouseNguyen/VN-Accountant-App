// src/app/api/assets/[id]/route.ts
// Single Asset API - Get, Update, Delete

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getCurrentFarmId } from '@/lib/context';
import { getAssetById, updateAsset, deleteAsset } from '@/services/asset.service';
import { updateAssetSchema } from '@/lib/validations/asset';

export const GET = withAuth(async (req: NextRequest, { params }) => {
    try {
        const farmId = getCurrentFarmId();
        const resolvedParams = await params;
        const asset = await getAssetById(farmId, resolvedParams.id);

        if (!asset) {
            return NextResponse.json(
                { success: false, error: 'Tài sản không tồn tại' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: asset });
    } catch (error) {
        console.error('[API] GET /assets/[id] error:', error);
        return NextResponse.json(
            { success: false, error: 'Lỗi tải thông tin tài sản' },
            { status: 500 }
        );
    }
});

export const PUT = withAuth(async (req: NextRequest, { params }) => {
    try {
        const farmId = getCurrentFarmId();
        const resolvedParams = await params;
        const body = await req.json();

        const validated = updateAssetSchema.parse(body);
        const asset = await updateAsset(farmId, resolvedParams.id, {
            ...validated,
            image_url: validated.image_url ?? undefined,
        });

        return NextResponse.json({ success: true, data: asset });
    } catch (error) {
        console.error('[API] PUT /assets/[id] error:', error);

        if (error instanceof Error && error.name === 'ZodError') {
            return NextResponse.json(
                { success: false, error: 'Dữ liệu không hợp lệ', details: error },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Lỗi cập nhật tài sản' },
            { status: 400 }
        );
    }
});

export const DELETE = withAuth(async (req: NextRequest, { params }) => {
    try {
        const farmId = getCurrentFarmId();
        const resolvedParams = await params;
        await deleteAsset(farmId, resolvedParams.id);

        return NextResponse.json({ success: true, message: 'Đã xóa tài sản' });
    } catch (error) {
        console.error('[API] DELETE /assets/[id] error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Lỗi xóa tài sản' },
            { status: 400 }
        );
    }
});
