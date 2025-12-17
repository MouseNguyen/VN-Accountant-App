// src/app/api/transactions/daily/route.ts
// GET endpoint cho daily transaction summary (for charts)

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

        // Default: last 30 days
        const now = new Date();
        const endDate = end_date ? new Date(end_date + 'T23:59:59.999Z') : now;
        const startDate = start_date
            ? new Date(start_date)
            : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Get daily aggregates using raw SQL for better performance
        const dailyData = await prismaBase.$queryRaw<
            Array<{
                date: Date;
                trans_type: string;
                total: number;
                count: bigint;
            }>
        >`
            SELECT 
                DATE(trans_date) as date,
                trans_type,
                SUM(total_amount)::float as total,
                COUNT(*)::bigint as count
            FROM transactions
            WHERE farm_id = ${farmId}
                AND trans_date >= ${startDate}
                AND trans_date <= ${endDate}
                AND deleted_at IS NULL
            GROUP BY DATE(trans_date), trans_type
            ORDER BY date ASC
        `;

        // Transform to daily summary format
        const dailyMap = new Map<string, {
            date: string;
            income: number;
            expense: number;
            incomeCount: number;
            expenseCount: number;
            net: number;
        }>();

        // Initialize all dates in range
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            dailyMap.set(dateStr, {
                date: dateStr,
                income: 0,
                expense: 0,
                incomeCount: 0,
                expenseCount: 0,
                net: 0,
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Fill in actual data - include SALE/PURCHASE in income/expense
        const incomeTypes = ['SALE', 'INCOME', 'CASH_IN'];
        const expenseTypes = ['PURCHASE', 'EXPENSE', 'CASH_OUT'];

        for (const row of dailyData) {
            const dateStr = new Date(row.date).toISOString().split('T')[0];
            const existing = dailyMap.get(dateStr);

            if (existing) {
                if (incomeTypes.includes(row.trans_type)) {
                    existing.income += row.total || 0;
                    existing.incomeCount += Number(row.count) || 0;
                } else if (expenseTypes.includes(row.trans_type)) {
                    existing.expense += row.total || 0;
                    existing.expenseCount += Number(row.count) || 0;
                }
                existing.net = existing.income - existing.expense;
            }
        }

        // Convert map to array
        const dailyArray = Array.from(dailyMap.values());

        // Calculate totals
        const totals = dailyArray.reduce(
            (acc, day) => {
                acc.income += day.income;
                acc.expense += day.expense;
                acc.incomeCount += day.incomeCount;
                acc.expenseCount += day.expenseCount;
                return acc;
            },
            { income: 0, expense: 0, incomeCount: 0, expenseCount: 0 }
        );

        return NextResponse.json({
            success: true,
            data: {
                period: {
                    start: startDate.toISOString().split('T')[0],
                    end: endDate.toISOString().split('T')[0],
                    days: dailyArray.length,
                },
                daily: dailyArray,
                totals: {
                    ...totals,
                    net: totals.income - totals.expense,
                    avgDailyIncome: dailyArray.length > 0 ? totals.income / dailyArray.length : 0,
                    avgDailyExpense: dailyArray.length > 0 ? totals.expense / dailyArray.length : 0,
                },
            },
        });
    } catch (error) {
        console.error('Daily summary error:', error);
        return NextResponse.json(
            { success: false, error: { message: 'Lỗi khi tải báo cáo hàng ngày' } },
            { status: 500 }
        );
    }
});
