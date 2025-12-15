// src/app/api/alerts/stock/route.ts
// API: Cảnh báo kho

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { getStockAlerts } from '@/services/stock-alerts.service';
import type { StockAlertType, AlertSeverity } from '@/types/stock-reports';

export const GET = withAuth(async (
    req: NextRequest,
    context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const url = new URL(req.url);
        const type = url.searchParams.get('type') as StockAlertType | null;
        const severity = url.searchParams.get('severity') as AlertSeverity | null;

        const result = await getStockAlerts(user.farm_id, {
            type: type || undefined,
            severity: severity || undefined,
        });

        return NextResponse.json({
            success: true,
            items: result.items,
            counts: result.counts,
        });
    } catch (error) {
        console.error('[Stock Alerts Error]', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message } },
            { status: 500 }
        );
    }
});
