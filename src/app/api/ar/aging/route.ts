// src/app/api/ar/aging/route.ts
// API: GET /api/ar/aging - Báo cáo tuổi nợ phải thu (Enhanced)
// Phase 4 Task 5

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { getAgingReport, getAgingExportData } from '@/services/ar-aging.service';
import { serializeDecimals } from '@/lib/api-utils';

export const GET = withAuth(
    async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: AuthUser) => {
        try {
            const searchParams = req.nextUrl.searchParams;
            const format = searchParams.get('format'); // 'json' or 'excel'
            const asOfDate = searchParams.get('as_of_date') || undefined;
            const customerId = searchParams.get('customer_id') || undefined;

            if (format === 'excel') {
                // Return data for Excel export
                const exportData = await getAgingExportData(user.farm_id, asOfDate);
                return NextResponse.json({
                    success: true,
                    data: serializeDecimals(exportData),
                });
            }

            // Standard JSON report
            const report = await getAgingReport(user.farm_id, {
                as_of_date: asOfDate,
                customer_id: customerId,
            });

            return NextResponse.json({
                success: true,
                data: serializeDecimals(report),
            });
        } catch (error) {
            console.error('GET /api/ar/aging error:', error);
            return NextResponse.json(
                { success: false, error: { message: (error as Error).message } },
                { status: 500 }
            );
        }
    }
);
