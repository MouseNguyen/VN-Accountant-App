// src/app/api/tax/cit/[period]/route.ts
// GET /api/tax/cit/:period - Get CIT calculation for specific period

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getCITCalculation } from '@/lib/tax/cit-calculator';

async function handler(
    req: NextRequest,
    context: { params: Promise<Record<string, string>> },
    user: { farm_id: string | null }
) {
    try {
        const farmId = user.farm_id;
        if (!farmId) {
            return NextResponse.json(
                { success: false, error: 'Farm not found' },
                { status: 400 }
            );
        }

        const { period } = await context.params;
        const decodedPeriod = decodeURIComponent(period);

        const calculation = await getCITCalculation(farmId, decodedPeriod);

        if (!calculation) {
            return NextResponse.json(
                { success: false, error: `No CIT calculation found for period ${decodedPeriod}` },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: calculation,
        });
    } catch (error) {
        console.error('Get CIT error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Lỗi lấy CIT' },
            { status: 500 }
        );
    }
}

export const GET = withAuth(handler);
