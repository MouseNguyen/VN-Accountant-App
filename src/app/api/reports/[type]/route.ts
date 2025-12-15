// src/app/api/reports/[type]/route.ts
// Accounting Reports API - Phase 2 Task 6

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import * as reportService from '@/services/reports.service';
import { z } from 'zod';

// ==========================================
// VALIDATION
// ==========================================

const querySchema = z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    payment_method: z.string().optional(),
    partner_id: z.string().uuid().optional(),
});

// ==========================================
// REPORT HANDLERS MAP
// ==========================================

type ReportHandler = (farmId: string, params: z.infer<typeof querySchema>) => Promise<unknown>;

const reportHandlers: Record<string, ReportHandler> = {
    'cash-book': reportService.getCashBookReport,
    'bank-book': reportService.getBankBookReport,
    'purchase-invoices': reportService.getPurchaseInvoiceReport,
    'sales-invoices': reportService.getSalesInvoiceReport,
    'ar-131': reportService.getAR131Report,
    'ap-331': reportService.getAP331Report,
    'stock-movement': reportService.getStockMovementReport,
    'trial-balance': reportService.getTrialBalanceReport,
    'profit-loss': reportService.getProfitLossReport,
};

// ==========================================
// GET HANDLER
// ==========================================

export const GET = withAuth(async (
    req: NextRequest,
    context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const params = await context.params;
        const reportType = params.type;

        const handler = reportHandlers[reportType];
        if (!handler) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Loại báo cáo không hợp lệ. Có thể dùng: ${Object.keys(reportHandlers).join(', ')}`
                },
                { status: 400 }
            );
        }

        const url = new URL(req.url);
        const query = Object.fromEntries(url.searchParams);

        // Validate query params
        const validationResult = querySchema.safeParse(query);
        if (!validationResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Tham số không hợp lệ',
                    details: validationResult.error.issues,
                },
                { status: 400 }
            );
        }

        const report = await handler(user.farm_id, validationResult.data);

        return NextResponse.json({ success: true, data: report });
    } catch (error) {
        console.error('GET /api/reports/[type] error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Lỗi tạo báo cáo' },
            { status: 500 }
        );
    }
});
