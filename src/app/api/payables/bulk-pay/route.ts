// src/app/api/payables/bulk-pay/route.ts
// POST - Thanh toán hàng loạt

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { bulkPayDebtSchema } from '@/lib/validations/payable';
import { bulkPayDebt } from '@/services/payable.service';

export const POST = withAuth(async (request: NextRequest, _context, _user: AuthUser) => {
    try {
        const body = await request.json();
        const validation = bulkPayDebtSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        details: validation.error.flatten().fieldErrors,
                    },
                },
                { status: 400 }
            );
        }

        const result = await bulkPayDebt(validation.data);

        return NextResponse.json({
            success: true,
            message: `Đã thanh toán ${result.success_count}/${result.total} khoản`,
            data: result,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Lỗi thanh toán hàng loạt';
        console.error('Bulk pay error:', error);
        return NextResponse.json({ success: false, error: { message } }, { status: 500 });
    }
});
