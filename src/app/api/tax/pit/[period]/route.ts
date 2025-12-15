// src/app/api/tax/pit/[period]/route.ts
// GET /api/tax/pit/:period - Get PIT calculations for specific period

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

        const { period } = await context.params;
        const decodedPeriod = decodeURIComponent(period);

        const calculations = await listPITCalculations(farmId, decodedPeriod);

        const totalPit = calculations.reduce((sum, c) => sum + c.pit_amount, 0);
        const totalGross = calculations.reduce((sum, c) => sum + c.gross_income, 0);

        // Summary by tax method
        const summary = {
            progressive: calculations.filter(c => c.tax_method === 'PROGRESSIVE').length,
            flat_10: calculations.filter(c => c.tax_method === 'FLAT_10').length,
            flat_20: calculations.filter(c => c.tax_method === 'FLAT_20').length,
            exempt: calculations.filter(c => c.tax_method === 'EXEMPT').length,
        };

        return NextResponse.json({
            success: true,
            data: {
                period: decodedPeriod,
                total_employees: calculations.length,
                total_gross: totalGross,
                total_pit: totalPit,
                effective_rate: totalGross > 0 ? (totalPit / totalGross) * 100 : 0,
                summary,
                calculations,
            },
        });
    } catch (error) {
        console.error('Get PIT error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Lỗi lấy PIT' },
            { status: 500 }
        );
    }
}

export const GET = withAuth(handler);
