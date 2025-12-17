// src/app/api/reports/financial-kpis/route.ts
// Financial KPIs API - Phase 4 Task 8

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { getFinancialKPIs } from '@/services/financial-reports.service';
import { serializeDecimals } from '@/lib/api-utils';

export const GET = withAuth(
    async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: AuthUser) => {
        try {
            const kpis = await getFinancialKPIs(user.farm_id);

            return NextResponse.json({
                success: true,
                data: serializeDecimals(kpis),
            });
        } catch (error) {
            console.error('GET /api/reports/financial-kpis error:', error);
            return NextResponse.json(
                { success: false, error: { message: (error as Error).message } },
                { status: 500 }
            );
        }
    }
);
