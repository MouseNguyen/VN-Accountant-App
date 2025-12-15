// src/app/api/tax/pit/route.ts
// GET /api/tax/pit - List PIT calculations

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { listPITCalculations } from '@/lib/tax/pit-calculator';

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
        const period = searchParams.get('period');

        if (!period) {
            return NextResponse.json(
                { success: false, error: 'Period is required (format: YYYY-MM)' },
                { status: 400 }
            );
        }

        const calculations = await listPITCalculations(farmId, period);

        const totalPit = calculations.reduce((sum, c) => sum + c.pit_amount, 0);

        return NextResponse.json({
            success: true,
            data: {
                period,
                total_employees: calculations.length,
                total_pit: totalPit,
                calculations,
            },
        });
    } catch (error) {
        console.error('List PIT error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Lỗi lấy danh sách PIT' },
            { status: 500 }
        );
    }
}

export const GET = withAuth(handler);
