// src/app/api/reports/inventory/route.ts
// GET - Báo cáo tồn kho

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { inventoryReportSchema } from '@/lib/validations/report';
import { getInventoryReport } from '@/services/report.service';

import { serializeDecimals } from '@/lib/api-utils';
export const GET = withAuth(async (request: NextRequest, _context, _user: AuthUser) => {
    try {
        const { searchParams } = new URL(request.url);
        const query = inventoryReportSchema.parse(Object.fromEntries(searchParams));
        const result = await getInventoryReport(query);

        return NextResponse.json({ success: true, data: serializeDecimals(result) });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Lỗi khi tải báo cáo tồn kho';
        console.error('Inventory report error:', error);
        return NextResponse.json({ success: false, error: { message } }, { status: 500 });
    }
});
