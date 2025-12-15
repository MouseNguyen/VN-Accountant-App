// src/app/api/reports/[type]/export/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import * as reportService from '@/services/reports.service';
import { exportReport } from '@/lib/export/excel';

const reportHandlers: Record<string, Function> = {
    'cash-book': reportService.getCashBookReport,
    'bank-book': reportService.getBankBookReport,
    'purchase-invoices': reportService.getPurchaseInvoiceReport,
    'sales-invoices': reportService.getSalesInvoiceReport,
    'ar-131': reportService.getAR131Report,
    'ap-331': reportService.getAP331Report,
    'trial-balance': reportService.getTrialBalanceReport,
    'profit-loss': reportService.getProfitLossReport,
};

const reportFileNames: Record<string, string> = {
    'cash-book': 'SoQuyTienMat',
    'bank-book': 'SoTienGuiNH',
    'purchase-invoices': 'BangKeHDMuaVao',
    'sales-invoices': 'BangKeHDBanRa',
    'ar-131': 'SoChiTietCongNo131',
    'ap-331': 'SoChiTietCongNo331',
    'trial-balance': 'BangCanDoiSPS',
    'profit-loss': 'BaoCaoLaiLo',
};

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
                { success: false, error: { message: `Loại báo cáo không hợp lệ: ${reportType}` } },
                { status: 400 }
            );
        }

        const url = new URL(req.url);
        const format = url.searchParams.get('format') || 'xlsx';
        const dateFrom = url.searchParams.get('from') || url.searchParams.get('date_from') || '';
        const dateTo = url.searchParams.get('to') || url.searchParams.get('date_to') || '';

        // Get report data - handlers need (farmId, params)
        const reportData = await handler(user.farm_id, { from: dateFrom, to: dateTo });

        if (format === 'xlsx') {
            const buffer = await exportReport(reportType, reportData);
            const fileName = reportFileNames[reportType] || reportType;
            const fullFileName = `${fileName}_${dateFrom}_${dateTo}.xlsx`;

            return new NextResponse(new Uint8Array(buffer), {
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="${fullFileName}"`,
                },
            });
        }

        if (format === 'pdf') {
            // PDF export not implemented yet
            return NextResponse.json(
                { success: false, error: { message: 'PDF export sẽ được hỗ trợ sớm' } },
                { status: 501 }
            );
        }

        return NextResponse.json(
            { success: false, error: { message: 'Định dạng không hỗ trợ' } },
            { status: 400 }
        );
    } catch (error) {
        console.error('Export error:', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message } },
            { status: 500 }
        );
    }
});
