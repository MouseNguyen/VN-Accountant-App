// src/app/api/settings/tax-rules/updates/route.ts
// Check for tax rules updates

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getCurrentFarmId } from '@/lib/auth/middleware';
import { checkForUpdates } from '@/lib/tax/sync-service';

export const GET = withAuth(async (req: NextRequest) => {
    try {
        const farmId = getCurrentFarmId();

        if (!farmId) {
            return NextResponse.json(
                { success: false, error: 'Farm ID required' },
                { status: 400 }
            );
        }

        const result = await checkForUpdates(farmId);

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('Check updates error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Lỗi kiểm tra cập nhật',
            },
            { status: 500 }
        );
    }
});
