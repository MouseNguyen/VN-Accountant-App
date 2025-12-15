// src/app/api/payables/pay/route.ts
// POST - Thanh toán công nợ (FIFO)

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { payDebtSchema } from '@/lib/validations/payable';
import { payDebt } from '@/services/payable.service';
import { PayableErrorCodes } from '@/types/payable';

export const POST = withAuth(async (request: NextRequest, _context, _user: AuthUser) => {
    try {
        const body = await request.json();
        const validation = payDebtSchema.safeParse(body);

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

        const result = await payDebt(validation.data);

        return NextResponse.json({
            success: true,
            message: `Đã thanh toán ${validation.data.amount.toLocaleString()}đ (${result.allocations.length} hóa đơn)`,
            data: result,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Lỗi thanh toán';

        // Determine error code
        let code = 'PAYMENT_ERROR';
        let status = 500;

        if (message.includes('không tìm thấy')) {
            code = PayableErrorCodes.PARTNER_NOT_FOUND;
            status = 404;
        } else if (message.includes('không có công nợ')) {
            code = PayableErrorCodes.NO_OUTSTANDING_DEBT;
            status = 400;
        } else if (message.includes('vượt quá công nợ')) {
            code = PayableErrorCodes.AMOUNT_EXCEEDS_BALANCE;
            status = 400;
        }

        console.error('Pay debt error:', error);
        return NextResponse.json({ success: false, error: { code, message } }, { status });
    }
});
