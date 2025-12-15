// src/app/api/payrolls/[id]/pay/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { payrollPaymentSchema } from '@/lib/validations/payroll';
import { payPayroll } from '@/services/payroll.service';

export const POST = withAuth(async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> },
    _user: AuthUser
) => {
    try {
        const params = await context.params;
        const body = await request.json();
        const validation = payrollPaymentSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: { code: 'VALIDATION_ERROR' } },
                { status: 400 }
            );
        }

        const payroll = await payPayroll(params.id, validation.data);
        return NextResponse.json({ success: true, message: 'Chi trả lương thành công!', data: payroll });
    } catch (error: any) {
        console.error('[POST /api/payrolls/[id]/pay]', error);

        if (error.message.includes('vượt quá')) {
            return NextResponse.json(
                { success: false, error: { code: 'AMOUNT_EXCEEDED', message: error.message } },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: { message: error.message } },
            { status: 400 }
        );
    }
});
