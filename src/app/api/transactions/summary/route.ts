// src/app/api/transactions/summary/route.ts
// GET endpoint cho transaction summary theo period

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { prismaBase } from '@/lib/prisma';
import { transactionSummaryQuerySchema } from '@/lib/validations/transaction';

import { serializeDecimals } from '@/lib/api-utils';
export const GET = withAuth(async (request: NextRequest, _context, user: AuthUser) => {
    try {
        const { searchParams } = new URL(request.url);
        const query = transactionSummaryQuerySchema.parse(Object.fromEntries(searchParams));

        const farmId = user.farm_id;
        const { start_date, end_date } = query;

        // Default: current month
        const now = new Date();
        const startDate = start_date
            ? new Date(start_date)
            : new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = end_date
            ? new Date(end_date + 'T23:59:59.999Z')
            : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // Transaction type groups - use mutable arrays for Prisma
        const INCOME_TYPES: ('SALE' | 'INCOME' | 'CASH_IN')[] = ['SALE', 'INCOME', 'CASH_IN'];
        const EXPENSE_TYPES: ('PURCHASE' | 'EXPENSE' | 'CASH_OUT')[] = ['PURCHASE', 'EXPENSE', 'CASH_OUT'];

        // Get summary data - include SALE/PURCHASE in totals
        const [incomeData, expenseData, paymentStats] = await Promise.all([
            // Total INCOME (includes SALE, INCOME, CASH_IN)
            prismaBase.transaction.aggregate({
                where: {
                    farm_id: farmId,
                    trans_type: { in: INCOME_TYPES },
                    trans_date: { gte: startDate, lte: endDate },
                    deleted_at: null,
                },
                _sum: {
                    total_amount: true,
                    paid_amount: true,
                    discount_amount: true,
                },
                _count: true,
            }),

            // Total EXPENSE (includes PURCHASE, EXPENSE, CASH_OUT)
            prismaBase.transaction.aggregate({
                where: {
                    farm_id: farmId,
                    trans_type: { in: EXPENSE_TYPES },
                    trans_date: { gte: startDate, lte: endDate },
                    deleted_at: null,
                },
                _sum: {
                    total_amount: true,
                    paid_amount: true,
                    discount_amount: true,
                },
                _count: true,
            }),

            // Payment status counts
            prismaBase.transaction.groupBy({
                by: ['payment_status'],
                where: {
                    farm_id: farmId,
                    trans_date: { gte: startDate, lte: endDate },
                    deleted_at: null,
                },
                _count: true,
                _sum: { total_amount: true },
            }),
        ]);

        // Calculate profit/loss
        const totalIncome = Number(incomeData._sum?.total_amount) || 0;
        const totalExpense = Number(expenseData._sum?.total_amount) || 0;
        const netProfit = totalIncome - totalExpense;

        // Payment status breakdown
        const paymentBreakdown = paymentStats.reduce(
            (acc, item) => {
                acc[item.payment_status] = {
                    count: item._count,
                    amount: Number(item._sum?.total_amount) || 0,
                };
                return acc;
            },
            {} as Record<string, { count: number; amount: number }>
        );

        const summary = {
            period: {
                start: startDate.toISOString().split('T')[0],
                end: endDate.toISOString().split('T')[0],
            },
            income: {
                total: totalIncome,
                paid: Number(incomeData._sum?.paid_amount) || 0,
                outstanding: totalIncome - (Number(incomeData._sum?.paid_amount) || 0),
                discount: Number(incomeData._sum?.discount_amount) || 0,
                count: incomeData._count,
            },
            expense: {
                total: totalExpense,
                paid: Number(expenseData._sum?.paid_amount) || 0,
                outstanding: totalExpense - (Number(expenseData._sum?.paid_amount) || 0),
                discount: Number(expenseData._sum?.discount_amount) || 0,
                count: expenseData._count,
            },
            netProfit,
            paymentStatus: paymentBreakdown,
        };

        return NextResponse.json({
            success: true,
            data: serializeDecimals(summary),
        });
    } catch (error) {
        console.error('Transaction summary error:', error);
        return NextResponse.json(
            { success: false, error: { message: 'Lỗi khi tải báo cáo tổng hợp' } },
            { status: 500 }
        );
    }
});
