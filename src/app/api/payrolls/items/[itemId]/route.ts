// src/app/api/payrolls/items/[itemId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { updatePayrollItemSchema } from '@/lib/validations/payroll';
import { updatePayrollItem } from '@/services/payroll.service';

export const PUT = withAuth(async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> },
    _user: AuthUser
) => {
    try {
        const params = await context.params;
        const body = await request.json();
        const validation = updatePayrollItemSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: { code: 'VALIDATION_ERROR' } },
                { status: 400 }
            );
        }

        const payroll = await updatePayrollItem(params.itemId, validation.data);
        return NextResponse.json({ success: true, message: 'Cập nhật thành công!', data: payroll });
    } catch (error: any) {
        console.error('[PUT /api/payrolls/items/[itemId]]', error);
        return NextResponse.json(
            { success: false, error: { message: error.message } },
            { status: 400 }
        );
    }
});
