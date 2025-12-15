// src/app/api/transactions/summary/route.ts
// GET endpoint cho transaction summary theo period

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { prismaBase } from '@/lib/prisma';
import { TransactionType } from '@prisma/client';

import { serializeDecimals } from '@/lib/api-utils';
export const GET = withAuth(async (request: NextRequest, _context, user: AuthUser) => {
    try {
        const farmId = user.farm_id;

        // Parse query params
        const { searchParams } = new URL(request.url);
        const startDateStr = searchParams.get('start_date');
        const endDateStr = searchParams.get('end_date');

        // Default: current month
        const now = new Date();
        const startDate = startDateStr
            ? new Date(startDateStr)
            : new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = endDateStr
            ? new Date(endDateStr)
            : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // Get summary data
        const [incomeData, expenseData, paymentStats] = await Promise.all([
            // Total INCOME (sales)
            prismaBase.transaction.aggregate({
                where: {
                    farm_id: farmId,
                    trans_type: TransactionType.INCOME,
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

            // Total EXPENSE (purchases)
            prismaBase.transaction.aggregate({
                where: {
                    farm_id: farmId,
                    trans_type: TransactionType.EXPENSE,
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
