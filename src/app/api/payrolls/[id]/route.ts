// src/app/api/payrolls/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { getPayroll, deletePayroll } from '@/services/payroll.service';

import { serializeDecimals } from '@/lib/api-utils';
export const GET = withAuth(async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> },
    _user: AuthUser
) => {
    try {
        const params = await context.params;
        const payroll = await getPayroll(params.id);

        if (!payroll) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy bảng lương' } },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: serializeDecimals(payroll) });
    } catch (error: any) {
        console.error('[GET /api/payrolls/[id]]', error);
        return NextResponse.json(
            { success: false, error: { message: error.message } },
            { status: 500 }
        );
    }
});

export const DELETE = withAuth(async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> },
    _user: AuthUser
) => {
    try {
        const params = await context.params;
        await deletePayroll(params.id);
        return new NextResponse(null, { status: 204 });
    } catch (error: any) {
        console.error('[DELETE /api/payrolls/[id]]', error);

        if (error.message.includes('Chỉ có thể xóa')) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_ALLOWED', message: error.message } },
                { status: 403 }
            );
        }

        return NextResponse.json(
            { success: false, error: { message: error.message } },
            { status: 500 }
        );
    }
});
