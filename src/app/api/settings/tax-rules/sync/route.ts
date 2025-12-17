// src/app/api/settings/tax-rules/sync/route.ts
// Trigger tax rules sync and preview

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getCurrentFarmId } from '@/lib/auth/middleware';
import { syncTaxRules, previewSync } from '@/lib/tax/sync-service';

// POST - Trigger sync
export const POST = withAuth(
    async (req: NextRequest) => {
        try {
            const farmId = getCurrentFarmId();

            if (!farmId) {
                return NextResponse.json(
                    { success: false, error: 'Farm ID required' },
                    { status: 400 }
                );
            }

            const result = await syncTaxRules(farmId);

            return NextResponse.json({
                success: true,
                message: `Đã cập nhật: ${result.created} mới, ${result.updated} thay đổi, ${result.skipped} bỏ qua`,
                data: result,
            });
        } catch (error) {
            console.error('Sync error:', error);
            return NextResponse.json(
                {
                    success: false,
                    error: error instanceof Error ? error.message : 'Lỗi đồng bộ',
                },
                { status: 500 }
            );
        }
    },
    { module: 'settings', action: 'update' }
);

// GET - Preview sync (without applying)
export const GET = withAuth(async (req: NextRequest) => {
    try {
        const farmId = getCurrentFarmId();

        if (!farmId) {
            return NextResponse.json(
                { success: false, error: 'Farm ID required' },
                { status: 400 }
            );
        }

        const preview = await previewSync(farmId);

        return NextResponse.json({
            success: true,
            data: preview,
        });
    } catch (error) {
        console.error('Preview error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Lỗi xem trước',
            },
            { status: 500 }
        );
    }
});
