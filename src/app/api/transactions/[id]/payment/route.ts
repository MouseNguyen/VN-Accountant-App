// src/app/api/transactions/[id]/payment/route.ts
// POST - Add payment to transaction

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { addPaymentSchema } from '@/lib/validations/transaction';
import { addPayment } from '@/services/transaction.service';

export const POST = withAuth(async (request: NextRequest, context, _user: AuthUser) => {
    try {
        const params = await context.params;
        const id = params.id as string;
        const body = await request.json();

        const validation = addPaymentSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: validation.error.issues[0]?.message || 'Dữ liệu không hợp lệ',
                    },
                },
                { status: 400 }
            );
        }

        const transaction = await addPayment(id, validation.data);

        // Serialize response
        const serialized = {
            ...transaction,
            subtotal: Number(transaction.subtotal),
            tax_amount: Number(transaction.tax_amount),
            discount_amount: Number(transaction.discount_amount),
            total_amount: Number(transaction.total_amount),
            paid_amount: Number(transaction.paid_amount),
            trans_date: transaction.trans_date.toISOString(),
            created_at: transaction.created_at.toISOString(),
            updated_at: transaction.updated_at.toISOString(),
        };

        return NextResponse.json({
            success: true,
            message: 'Thanh toán thành công!',
            data: serialized,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Lỗi server';

        if (message.includes('Không tìm thấy')) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message } },
                { status: 404 }
            );
        }
        if (message.includes('đã thanh toán đầy đủ')) {
            return NextResponse.json(
                { success: false, error: { code: 'ALREADY_PAID', message } },
                { status: 400 }
            );
        }
        if (message.includes('vượt quá')) {
            return NextResponse.json(
                { success: false, error: { code: 'EXCEEDS_REMAINING', message } },
                { status: 400 }
            );
        }

        console.error('Add payment error:', error);
        return NextResponse.json(
            { success: false, error: { code: 'SERVER_ERROR', message } },
            { status: 500 }
        );
    }
});
