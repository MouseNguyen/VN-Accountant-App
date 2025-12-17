// src/app/api/reports/charts/route.ts
// Financial Charts API - Phase 4 Task 9

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import {
    getRevenueTrend,
    getARAgingPieData,
    getTopCustomers,
} from '@/services/financial-reports.service';
import { serializeDecimals } from '@/lib/api-utils';

export const GET = withAuth(
    async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: AuthUser) => {
        try {
            const searchParams = req.nextUrl.searchParams;
            const chartType = searchParams.get('type') || 'all';

            let data: any = {};

            if (chartType === 'all' || chartType === 'revenue_trend') {
                const months = parseInt(searchParams.get('months') || '12');
                data.revenue_trend = await getRevenueTrend(user.farm_id, months);
            }

            if (chartType === 'all' || chartType === 'ar_aging_pie') {
                data.ar_aging_pie = await getARAgingPieData(user.farm_id);
            }

            if (chartType === 'all' || chartType === 'top_customers') {
                const limit = parseInt(searchParams.get('limit') || '10');
                data.top_customers = await getTopCustomers(user.farm_id, limit);
            }

            return NextResponse.json({
                success: true,
                data: serializeDecimals(data),
            });
        } catch (error) {
            console.error('GET /api/reports/charts error:', error);
            return NextResponse.json(
                { success: false, error: { message: (error as Error).message } },
                { status: 500 }
            );
        }
    }
);
