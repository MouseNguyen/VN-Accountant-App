// src/app/api/transactions/[id]/route.ts
// GET (detail), PUT (update), DELETE transactions

import { NextRequest, NextResponse } from 'next/server';
import { prismaBase } from '@/lib/prisma';
import { withAuth, type AuthUser } from '@/lib/auth';
import { updateTransactionSchema } from '@/lib/validations/transaction';
import { updateTransaction, deleteTransaction, getTransactionById } from '@/services/transaction.service';

import { serializeDecimals } from '@/lib/api-utils';
// ==========================================
// GET - Chi tiết giao dịch
// ==========================================

export const GET = withAuth(async (request: NextRequest, context, user: AuthUser) => {
    try {
        const params = await context.params;
        const id = params.id as string;

        const transaction = await getTransactionById(id);

        if (!transaction) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy giao dịch' } },
                { status: 404 }
            );
        }

        // Verify farm ownership
        if (transaction.farm_id !== user.farm_id) {
            return NextResponse.json(
                { success: false, error: { code: 'FORBIDDEN', message: 'Không có quyền truy cập' } },
                { status: 403 }
            );
        }

        // Serialize Decimals
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
            items: transaction.items.map((item) => ({
                ...item,
                quantity: Number(item.quantity),
                unit_price: Number(item.unit_price),
                unit_cost: Number(item.unit_cost),
                tax_rate: Number(item.tax_rate),
                tax_amount: Number(item.tax_amount),
                discount_percent: Number(item.discount_percent),
                discount_amount: Number(item.discount_amount),
                line_total: Number(item.line_total),
                created_at: item.created_at.toISOString(),
            })),
        };

        return NextResponse.json({ success: true, data: serializeDecimals(serialized) });
    } catch (error) {
        console.error('Get transaction error:', error);
        return NextResponse.json(
            { success: false, error: { code: 'SERVER_ERROR', message: 'Lỗi server' } },
            { status: 500 }
        );
    }
});

// ==========================================
// PUT - Cập nhật giao dịch
// ==========================================

export const PUT = withAuth(async (request: NextRequest, context, _user: AuthUser) => {
    try {
        const params = await context.params;
        const id = params.id as string;
        const body = await request.json();

        const validation = updateTransactionSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: validation.error.issues[0]?.message || 'Dữ liệu không hợp lệ',
                        details: validation.error.flatten().fieldErrors,
                    },
                },
                { status: 400 }
            );
        }

        const transaction = await updateTransaction(id, validation.data);

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
            items: transaction.items.map((item) => ({
                ...item,
                quantity: Number(item.quantity),
                unit_price: Number(item.unit_price),
                unit_cost: Number(item.unit_cost),
                tax_rate: Number(item.tax_rate),
                tax_amount: Number(item.tax_amount),
                discount_percent: Number(item.discount_percent),
                discount_amount: Number(item.discount_amount),
                line_total: Number(item.line_total),
            })),
        };

        return NextResponse.json({
            success: true,
            message: 'Cập nhật giao dịch thành công!',
            data: serializeDecimals(serialized),
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Lỗi server';

        if (message.includes('Không tìm thấy')) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message } },
                { status: 404 }
            );
        }
        if (message.includes('đã bị thay đổi')) {
            return NextResponse.json(
                { success: false, error: { code: 'CONFLICT', message } },
                { status: 409 }
            );
        }
        if (message.includes('không đủ tồn kho')) {
            return NextResponse.json(
                { success: false, error: { code: 'INSUFFICIENT_STOCK', message } },
                { status: 400 }
            );
        }
        if (message.includes('Không thể sửa')) {
            return NextResponse.json(
                { success: false, error: { code: 'FORBIDDEN', message } },
                { status: 403 }
            );
        }

        console.error('Update transaction error:', error);
        return NextResponse.json(
            { success: false, error: { code: 'SERVER_ERROR', message } },
            { status: 500 }
        );
    }
});

// ==========================================
// DELETE - Xóa giao dịch
// ==========================================

export const DELETE = withAuth(async (request: NextRequest, context, _user: AuthUser) => {
    try {
        const params = await context.params;
        const id = params.id as string;

        await deleteTransaction(id);
        return new NextResponse(null, { status: 204 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Lỗi server';

        if (message.includes('Không thể xóa')) {
            return NextResponse.json(
                { success: false, error: { code: 'FORBIDDEN', message } },
                { status: 403 }
            );
        }
        if (message.includes('Không tìm thấy')) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message } },
                { status: 404 }
            );
        }

        console.error('Delete transaction error:', error);
        return NextResponse.json(
            { success: false, error: { code: 'SERVER_ERROR', message } },
            { status: 500 }
        );
    }
});
