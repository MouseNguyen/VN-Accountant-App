// src/services/dashboard.service.ts

import { prismaBase } from '@/lib/prisma';
import { getCurrentFarmId } from '@/lib/context';
import Decimal from 'decimal.js';
import {
    DashboardData,
    CashBalanceWidget,
    IncomeExpenseWidget,
    PayableWidget,
    TopProductsWidget,
    WorkerWidget,
    AlertWidget,
    IncomeExpenseChart,
    ChartDataPoint,
} from '@/types/dashboard';

// ==========================================
// MAIN DASHBOARD FUNCTION
// ==========================================

export async function getDashboardData(
    widgets: string[] = ['all'],
    chartPeriod: 'week' | 'month' = 'week',
    forceRefresh: boolean = false
): Promise<DashboardData> {
    const farmId = getCurrentFarmId();
    const now = new Date();

    // Parallel load các widgets
    const [
        cashBalance,
        incomeExpenseToday,
        incomeExpenseMonth,
        payables,
        topProducts,
        workers,
        alerts,
        chart,
    ] = await Promise.all([
        getCashBalanceWidget(farmId),
        getIncomeExpenseWidget(farmId, 'today'),
        getIncomeExpenseWidget(farmId, 'month'),
        getPayableWidget(farmId),
        getTopProductsWidget(farmId, chartPeriod),
        getWorkerWidget(farmId),
        getAlertWidget(farmId),
        getIncomeExpenseChart(farmId, chartPeriod),
    ]);

    return {
        generated_at: now.toISOString(),
        cash_balance: cashBalance,
        income_expense_today: incomeExpenseToday,
        income_expense_month: incomeExpenseMonth,
        payables,
        top_products: topProducts,
        workers,
        alerts,
        chart,
    };
}

// ==========================================
// WIDGET: SỐ DƯ TIỀN
// ==========================================

async function getCashBalanceWidget(farmId: string): Promise<CashBalanceWidget> {
    // Tính tổng từ transactions
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayIncome, todayExpense, allTimeIncome, allTimeExpense] = await Promise.all([
        prismaBase.transaction.aggregate({
            where: {
                farm_id: farmId,
                trans_date: { gte: todayStart },
                trans_type: 'INCOME',
            },
            _sum: { paid_amount: true },
        }),
        prismaBase.transaction.aggregate({
            where: {
                farm_id: farmId,
                trans_date: { gte: todayStart },
                trans_type: 'EXPENSE',
            },
            _sum: { paid_amount: true },
        }),
        prismaBase.transaction.aggregate({
            where: {
                farm_id: farmId,
                trans_type: 'INCOME',
            },
            _sum: { paid_amount: true },
        }),
        prismaBase.transaction.aggregate({
            where: {
                farm_id: farmId,
                trans_type: 'EXPENSE',
            },
            _sum: { paid_amount: true },
        }),
    ]);

    const totalIncome = Number(allTimeIncome._sum.paid_amount || 0);
    const totalExpense = Number(allTimeExpense._sum.paid_amount || 0);
    const total = totalIncome - totalExpense;

    const todayIncomeVal = Number(todayIncome._sum.paid_amount || 0);
    const todayExpenseVal = Number(todayExpense._sum.paid_amount || 0);
    const changeToday = todayIncomeVal - todayExpenseVal;

    const previousBalance = total - changeToday;
    const changePercentage = previousBalance !== 0
        ? Number(((changeToday / Math.abs(previousBalance)) * 100).toFixed(2))
        : 0;

    return {
        total,
        by_account: [
            {
                account_id: 'cash',
                name: 'Tiền mặt',
                type: 'CASH',
                balance: total, // Simplified - all in cash for now
            },
        ],
        change_today: changeToday,
        change_percentage: changePercentage,
    };
}

// ==========================================
// WIDGET: THU CHI
// ==========================================

async function getIncomeExpenseWidget(
    farmId: string,
    period: 'today' | 'week' | 'month'
): Promise<IncomeExpenseWidget> {
    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;

    switch (period) {
        case 'today':
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            previousStartDate = new Date(startDate);
            previousStartDate.setDate(previousStartDate.getDate() - 1);
            previousEndDate = new Date(startDate);
            break;
        case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            previousStartDate = new Date(startDate);
            previousStartDate.setDate(previousStartDate.getDate() - 7);
            previousEndDate = new Date(startDate);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            previousEndDate = new Date(startDate);
            break;
    }

    // Current period
    const [income, expense, count] = await Promise.all([
        prismaBase.transaction.aggregate({
            where: {
                farm_id: farmId,
                trans_date: { gte: startDate },
                trans_type: 'INCOME',
            },
            _sum: { total_amount: true },
        }),
        prismaBase.transaction.aggregate({
            where: {
                farm_id: farmId,
                trans_date: { gte: startDate },
                trans_type: 'EXPENSE',
            },
            _sum: { total_amount: true },
        }),
        prismaBase.transaction.count({
            where: {
                farm_id: farmId,
                trans_date: { gte: startDate },
            },
        }),
    ]);

    // Previous period
    const [prevIncome, prevExpense] = await Promise.all([
        prismaBase.transaction.aggregate({
            where: {
                farm_id: farmId,
                trans_date: { gte: previousStartDate, lt: previousEndDate },
                trans_type: 'INCOME',
            },
            _sum: { total_amount: true },
        }),
        prismaBase.transaction.aggregate({
            where: {
                farm_id: farmId,
                trans_date: { gte: previousStartDate, lt: previousEndDate },
                trans_type: 'EXPENSE',
            },
            _sum: { total_amount: true },
        }),
    ]);

    const currentIncome = Number(income._sum.total_amount || 0);
    const currentExpense = Number(expense._sum.total_amount || 0);
    const previousIncomeVal = Number(prevIncome._sum.total_amount || 0);
    const previousExpenseVal = Number(prevExpense._sum.total_amount || 0);

    return {
        period,
        income: currentIncome,
        expense: currentExpense,
        net: currentIncome - currentExpense,
        transaction_count: count,
        compare_previous: {
            income_change: previousIncomeVal > 0
                ? ((currentIncome - previousIncomeVal) / previousIncomeVal) * 100
                : 0,
            expense_change: previousExpenseVal > 0
                ? ((currentExpense - previousExpenseVal) / previousExpenseVal) * 100
                : 0,
            net_change: (currentIncome - currentExpense) - (previousIncomeVal - previousExpenseVal),
        },
    };
}

// ==========================================
// WIDGET: CÔNG NỢ
// ==========================================

async function getPayableWidget(farmId: string): Promise<PayableWidget> {
    // Phải thu (Khách nợ ta) - CUSTOMER with balance > 0
    const receivables = await prismaBase.partner.aggregate({
        where: {
            farm_id: farmId,
            partner_type: 'CUSTOMER',
            balance: { gt: 0 },
            deleted_at: null,
        },
        _sum: { balance: true },
        _count: true,
    });

    // Phải trả (Ta nợ NCC) - VENDOR with balance > 0
    const payables = await prismaBase.partner.aggregate({
        where: {
            farm_id: farmId,
            partner_type: 'VENDOR',
            balance: { gt: 0 },
            deleted_at: null,
        },
        _sum: { balance: true },
        _count: true,
    });

    return {
        receivable: {
            total: Number(receivables._sum.balance || 0),
            overdue: 0, // Simplified for now
            overdue_count: 0,
        },
        payable: {
            total: Number(payables._sum.balance || 0),
            overdue: 0,
            overdue_count: 0,
        },
    };
}

// ==========================================
// WIDGET: TOP SẢN PHẨM
// ==========================================

async function getTopProductsWidget(
    farmId: string,
    period: 'week' | 'month'
): Promise<TopProductsWidget> {
    const startDate = new Date();
    if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
    } else {
        startDate.setMonth(startDate.getMonth() - 1);
    }

    const topProducts = await prismaBase.$queryRaw<Array<{
        product_id: string;
        code: string;
        name: string;
        quantity_sold: number;
        revenue: number;
        profit: number;
    }>>`
    SELECT 
      p.id as product_id,
      p.code,
      p.name,
      COALESCE(SUM(ti.quantity), 0)::numeric as quantity_sold,
      COALESCE(SUM(ti.line_total), 0)::numeric as revenue,
      COALESCE(SUM(ti.line_total - (ti.quantity * COALESCE(ti.unit_cost, 0))), 0)::numeric as profit
    FROM transaction_items ti
    JOIN products p ON ti.product_id = p.id
    JOIN transactions t ON ti.transaction_id = t.id
    WHERE t.farm_id = ${farmId}
      AND t.trans_type = 'INCOME'
      AND t.trans_date >= ${startDate}
    GROUP BY p.id, p.code, p.name
    ORDER BY revenue DESC
    LIMIT 5
  `;

    return {
        period,
        items: topProducts.map((p) => ({
            product_id: p.product_id,
            code: p.code,
            name: p.name,
            quantity_sold: Number(p.quantity_sold),
            revenue: Number(p.revenue),
            profit: Number(p.profit),
        })),
    };
}

// ==========================================
// WIDGET: NHÂN CÔNG
// ==========================================

async function getWorkerWidget(farmId: string): Promise<WorkerWidget> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activeCount, todayAttendance, pendingPayroll, onLeave] = await Promise.all([
        // Tổng nhân viên đang làm
        prismaBase.worker.count({
            where: { farm_id: farmId, status: 'ACTIVE', deleted_at: null },
        }),

        // Đang làm hôm nay
        prismaBase.attendance.count({
            where: {
                farm_id: farmId,
                work_date: today,
                attendance_type: { in: ['NORMAL', 'OVERTIME'] },
            },
        }),

        // Tổng lương chưa trả
        prismaBase.payrollItem.aggregate({
            where: {
                farm_id: farmId,
                is_paid: false,
                payroll: { status: 'CONFIRMED' },
            },
            _sum: { net_amount: true },
        }),

        // Đang nghỉ phép
        prismaBase.worker.count({
            where: { farm_id: farmId, status: 'ON_LEAVE', deleted_at: null },
        }),
    ]);

    return {
        total_active: activeCount,
        total_working_today: todayAttendance,
        pending_payroll: Number(pendingPayroll._sum.net_amount || 0),
        workers_on_leave: onLeave,
    };
}

// ==========================================
// WIDGET: CẢNH BÁO
// ==========================================

async function getAlertWidget(farmId: string): Promise<AlertWidget> {
    const alerts: AlertWidget['items'] = [];

    // 1. Tồn kho thấp
    const lowStockProducts = await prismaBase.product.findMany({
        where: {
            farm_id: farmId,
            deleted_at: null,
            min_stock: { gt: 0 },
            stock_qty: { lte: prismaBase.product.fields.min_stock },
        },
        select: { id: true, name: true, stock_qty: true, min_stock: true },
        take: 5,
    });

    for (const item of lowStockProducts) {
        alerts.push({
            type: 'LOW_STOCK',
            severity: Number(item.stock_qty) === 0 ? 'error' : 'warning',
            title: 'Tồn kho thấp',
            message: `${item.name}: còn ${item.stock_qty} (tối thiểu ${item.min_stock})`,
            link: `/san-pham/${item.id}`,
            entity_id: item.id,
        });
    }

    // 2. Công nợ quá hạn
    const overduePartners = await prismaBase.partner.findMany({
        where: {
            farm_id: farmId,
            partner_type: 'CUSTOMER',
            balance: { gt: 0 },
            deleted_at: null,
        },
        select: { id: true, name: true, balance: true },
        take: 5,
        orderBy: { balance: 'desc' },
    });

    for (const partner of overduePartners) {
        alerts.push({
            type: 'OVERDUE_RECEIVABLE',
            severity: 'warning',
            title: 'Công nợ chưa thu',
            message: `${partner.name}: ${Number(partner.balance).toLocaleString()}đ`,
            link: `/doi-tac/${partner.id}`,
            entity_id: partner.id,
        });
    }

    // 3. Lương chưa trả
    const pendingPayrolls = await prismaBase.payroll.findMany({
        where: {
            farm_id: farmId,
            status: 'CONFIRMED',
        },
        select: { id: true, code: true, total_net: true, paid_amount: true },
        take: 3,
        orderBy: { created_at: 'desc' },
    });

    for (const payroll of pendingPayrolls) {
        const remaining = Number(payroll.total_net) - Number(payroll.paid_amount);
        if (remaining > 0) {
            alerts.push({
                type: 'PENDING_PAYROLL',
                severity: 'warning',
                title: 'Lương chưa trả',
                message: `${payroll.code}: ${remaining.toLocaleString()}đ`,
                link: `/bang-luong/${payroll.id}`,
                entity_id: payroll.id,
            });
        }
    }

    return {
        items: alerts.slice(0, 10),
        total_count: alerts.length,
    };
}

// ==========================================
// CHART: THU CHI THEO NGÀY
// ==========================================

async function getIncomeExpenseChart(
    farmId: string,
    period: 'week' | 'month'
): Promise<IncomeExpenseChart> {
    const endDate = new Date();
    const startDate = new Date();

    if (period === 'week') {
        startDate.setDate(endDate.getDate() - 7);
    } else {
        startDate.setDate(endDate.getDate() - 30);
    }

    const chartData = await prismaBase.$queryRaw<Array<{
        date: Date;
        income: number;
        expense: number;
    }>>`
    SELECT 
      DATE(trans_date) as date,
      SUM(CASE WHEN trans_type = 'INCOME' THEN total_amount ELSE 0 END)::numeric as income,
      SUM(CASE WHEN trans_type = 'EXPENSE' THEN total_amount ELSE 0 END)::numeric as expense
    FROM transactions
    WHERE farm_id = ${farmId}
      AND trans_date >= ${startDate}
      AND trans_date <= ${endDate}
    GROUP BY DATE(trans_date)
    ORDER BY date ASC
  `;

    // Fill missing dates
    const dataMap = new Map(
        chartData.map((d) => [d.date.toISOString().split('T')[0], d])
    );

    const fullData: ChartDataPoint[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const existing = dataMap.get(dateStr);

        fullData.push({
            date: dateStr,
            income: Number(existing?.income || 0),
            expense: Number(existing?.expense || 0),
            net: Number(existing?.income || 0) - Number(existing?.expense || 0),
        });

        currentDate.setDate(currentDate.getDate() + 1);
    }

    const totalIncome = fullData.reduce((sum, d) => sum + d.income, 0);
    const totalExpense = fullData.reduce((sum, d) => sum + d.expense, 0);
    const days = fullData.length;

    return {
        period,
        data: fullData,
        summary: {
            total_income: totalIncome,
            total_expense: totalExpense,
            avg_daily_income: days > 0 ? totalIncome / days : 0,
            avg_daily_expense: days > 0 ? totalExpense / days : 0,
        },
    };
}
