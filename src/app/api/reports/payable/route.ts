// src/app/api/reports/payable/route.ts
// GET - Báo cáo công nợ (aging)

import { NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { getPayableReport } from '@/services/report.service';

import { serializeDecimals } from '@/lib/api-utils';
export const GET = withAuth(async (_request, _context, _user: AuthUser) => {
    try {
        const result = await getPayableReport();
        return NextResponse.json({ success: true, data: serializeDecimals(result) });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Lỗi khi tải báo cáo công nợ';
        console.error('Payable report error:', error);
        return NextResponse.json({ success: false, error: { message } }, { status: 500 });
    }
});
