// src/app/api/payrolls/[id]/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { confirmPayroll } from '@/services/payroll.service';

export const POST = withAuth(async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> },
    _user: AuthUser
) => {
    try {
        const params = await context.params;
        const payroll = await confirmPayroll(params.id);
        return NextResponse.json({ success: true, message: 'Xác nhận bảng lương thành công!', data: payroll });
    } catch (error: any) {
        console.error('[POST /api/payrolls/[id]/confirm]', error);
        return NextResponse.json(
            { success: false, error: { message: error.message } },
            { status: 400 }
        );
    }
});
