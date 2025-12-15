// src/app/api/tax/cit/route.ts
// GET /api/tax/cit - List all CIT calculations

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { listCITCalculations } from '@/lib/tax/cit-calculator';

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

        const { searchParams } = new URL(req.url);
        const periodType = searchParams.get('period_type') as 'QUARTERLY' | 'ANNUAL' | null;

        const calculations = await listCITCalculations(
            farmId,
            periodType || undefined
        );

        return NextResponse.json({
            success: true,
            data: calculations,
            count: calculations.length,
        });
    } catch (error) {
        console.error('List CIT error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Lỗi lấy danh sách CIT' },
            { status: 500 }
        );
    }
}

export const GET = withAuth(handler);
