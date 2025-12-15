// src/app/api/transactions/route.ts
// GET (list) và POST (create) transactions

import { NextRequest, NextResponse } from 'next/server';
import { prismaBase } from '@/lib/prisma';
import { withAuth, type AuthUser } from '@/lib/auth';
import { transactionQuerySchema, createTransactionSchema } from '@/lib/validations/transaction';
import { createTransaction } from '@/services/transaction.service';
import { Prisma } from '@prisma/client';

import { serializeDecimals } from '@/lib/api-utils';
// ==========================================
// GET - Danh sách giao dịch
// ==========================================

export const GET = withAuth(async (request: NextRequest, _context, user: AuthUser) => {
    try {
        const { searchParams } = new URL(request.url);
        const query = transactionQuerySchema.parse(Object.fromEntries(searchParams));

        const farmId = user.farm_id;
        const {
            page,
            limit,
            search,
            trans_type,
            payment_status,
            partner_id,
            date_from,
            date_to,
            sort_by,
            sort_order,
        } = query;
        const skip = (page - 1) * limit;

        // Build where clause
        const where: Prisma.TransactionWhereInput = { farm_id: farmId, deleted_at: null };
        if (trans_type) where.trans_type = trans_type;
        if (payment_status) where.payment_status = payment_status;
        if (partner_id) where.partner_id = partner_id;

        if (date_from || date_to) {
            where.trans_date = {};
            if (date_from) where.trans_date.gte = new Date(date_from);
            if (date_to) {
                const endDate = new Date(date_to);
                endDate.setHours(23, 59, 59, 999);
                where.trans_date.lte = endDate;
            }
        }

        if (search) {
            where.OR = [
                { code: { contains: search.toUpperCase(), mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { partner: { name: { contains: search, mode: 'insensitive' } } },
            ];
        }

        // Execute queries in parallel
        const [items, total, summaryResult] = await Promise.all([
            prismaBase.transaction.findMany({
                where,
                orderBy: { [sort_by]: sort_order },
                skip,
                take: limit,
                select: {
                    id: true,
                    code: true,
                    trans_type: true,
                    trans_date: true,
                    description: true,
                    total_amount: true,
                    paid_amount: true,
                    payment_status: true,
                    payment_method: true,
                    version: true,
                    created_at: true,
                    partner: { select: { id: true, code: true, name: true, partner_type: true } },
                    _count: { select: { items: true } },
                },
            }),
            prismaBase.transaction.count({ where }),
            prismaBase.transaction.groupBy({
                by: ['trans_type'],
                where,
                _sum: { total_amount: true },
            }),
        ]);

        // Serialize Decimal
        const serializedItems = items.map((item) => ({
            ...item,
            total_amount: Number(item.total_amount),
            paid_amount: Number(item.paid_amount),
            trans_date: item.trans_date.toISOString(),
            created_at: item.created_at.toISOString(),
        }));

        // Calculate summary
        const summary = { total_income: 0, total_expense: 0, net: 0 };
        summaryResult.forEach((r) => {
            const amount = Number(r._sum.total_amount || 0);
            if (r.trans_type === 'INCOME' || r.trans_type === 'CASH_IN') {
                summary.total_income += amount;
            } else if (r.trans_type === 'EXPENSE' || r.trans_type === 'CASH_OUT') {
                summary.total_expense += amount;
            }
            // (removed - now handled above)
        });
        summary.net = summary.total_income - summary.total_expense;

        return NextResponse.json({
            success: true,
            data: {
                items: serializedItems,
                total,
                page,
                limit,
                hasMore: skip + items.length < total,
                summary,
            },
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        return NextResponse.json(
            { success: false, error: { code: 'SERVER_ERROR', message: 'Lỗi server' } },
            { status: 500 }
        );
    }
});

// ==========================================
// POST - Tạo giao dịch mới
// ==========================================

export const POST = withAuth(async (request: NextRequest, _context, _user: AuthUser) => {
    try {
        const body = await request.json();
        console.log('[Transaction POST] Body:', JSON.stringify(body, null, 2));

        const validation = createTransactionSchema.safeParse(body);

        if (!validation.success) {
            console.log('[Transaction POST] Validation failed:', validation.error.issues);
            const firstError = validation.error.issues[0];
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: firstError?.message || 'Dữ liệu không hợp lệ',
                        details: validation.error.flatten().fieldErrors,
                    },
                },
                { status: 400 }
            );
        }

        const transaction = await createTransaction(validation.data) as any;

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
            items: transaction.items.map((item: any) => ({
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

        return NextResponse.json(
            { success: true, message: 'Tạo giao dịch thành công!', data: serializeDecimals(serialized) },
            { status: 201 }
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Lỗi server';

        if (message.includes('không đủ tồn kho')) {
            return NextResponse.json(
                { success: false, error: { code: 'INSUFFICIENT_STOCK', message } },
                { status: 400 }
            );
        }

        console.error('Create transaction error:', error);
        return NextResponse.json(
            { success: false, error: { code: 'SERVER_ERROR', message } },
            { status: 500 }
        );
    }
});
