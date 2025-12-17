// src/app/api/reports/cash-forecast/route.ts
// Cash Flow Forecast API - Phase 4 Task 7

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { getCashFlowForecast } from '@/services/financial-reports.service';
import { serializeDecimals } from '@/lib/api-utils';

export const GET = withAuth(
    async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: AuthUser) => {
        try {
            const searchParams = req.nextUrl.searchParams;
            const days = parseInt(searchParams.get('days') || '30');

            const forecast = await getCashFlowForecast(user.farm_id, days);

            return NextResponse.json({
                success: true,
                data: serializeDecimals(forecast),
            });
        } catch (error) {
            console.error('GET /api/reports/cash-forecast error:', error);
            return NextResponse.json(
                { success: false, error: { message: (error as Error).message } },
                { status: 500 }
            );
        }
    }
);
