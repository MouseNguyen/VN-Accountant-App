// src/services/financial-reports.service.ts
// Financial Reports Service - Phase 4 Tasks 7-8-9

import prisma from '@/lib/prisma';
import { roundMoney } from '@/lib/decimal';
import { addDays, format, startOfMonth, endOfMonth, startOfYear, subMonths } from 'date-fns';

// ==========================================
// TYPES
// ==========================================

export interface CashForecastDay {
    date: string;
    opening_balance: number;
    expected_receipts: number;
    expected_payments: number;
    closing_balance: number;
    ar_invoices_due: number;
    ap_invoices_due: number;
}

export interface CashFlowForecast {
    farm_id: string;
    forecast_date: string;
    days: number;
    current_cash_balance: number;
    current_bank_balance: number;
    total_opening: number;
    total_expected_receipts: number;
    total_expected_payments: number;
    total_closing: number;
    daily_forecast: CashForecastDay[];
}

export interface FinancialKPIs {
    // Revenue
    revenue_mtd: number;
    revenue_ytd: number;
    revenue_last_month: number;
    revenue_growth_pct: number;

    // Expenses
    expenses_mtd: number;
    expenses_ytd: number;

    // Outstanding
    ar_outstanding: number;
    ap_outstanding: number;
    net_position: number;

    // Cash
    cash_position: number;
    bank_position: number;
    total_cash: number;

    // Ratios
    dso: number; // Days Sales Outstanding
    dpo: number; // Days Payable Outstanding
    gross_profit_margin: number;
    net_profit_margin: number;

    // Counts
    ar_invoice_count: number;
    ap_invoice_count: number;
    customer_count: number;
    vendor_count: number;
}

export interface RevenueTrend {
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
}

export interface ARAgingPieData {
    bucket: string;
    amount: number;
    percentage: number;
    color: string;
}

export interface TopCustomer {
    customer_id: string;
    customer_name: string;
    revenue: number;
    percentage: number;
}

// ==========================================
// CASH FLOW FORECAST
// ==========================================

export async function getCashFlowForecast(
    farmId: string,
    days: number = 30
): Promise<CashFlowForecast> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get current cash and bank balances
    // For now, sum cash transactions (simplified - in production, use account balances)
    const cashIn = await prisma.transaction.aggregate({
        where: {
            farm_id: farmId,
            trans_type: { in: ['INCOME', 'CASH_IN'] },
            deleted_at: null,
        },
        _sum: { total_amount: true },
    });

    const cashOut = await prisma.transaction.aggregate({
        where: {
            farm_id: farmId,
            trans_type: { in: ['EXPENSE', 'CASH_OUT'] },
            deleted_at: null,
        },
        _sum: { total_amount: true },
    });

    const currentCashBalance = roundMoney(
        Number(cashIn._sum.total_amount || 0) - Number(cashOut._sum.total_amount || 0)
    );
    const currentBankBalance = 0; // Would come from bank account integration

    let runningBalance = currentCashBalance + currentBankBalance;
    const dailyForecast: CashForecastDay[] = [];

    let totalReceipts = 0;
    let totalPayments = 0;

    for (let i = 0; i <= days; i++) {
        const forecastDate = addDays(today, i);
        const dateStr = format(forecastDate, 'yyyy-MM-dd');
        const openingBalance = runningBalance;

        // Get AR invoices due on this date
        const arDue = await prisma.aRInvoice.aggregate({
            where: {
                farm_id: farmId,
                due_date: forecastDate,
                status: { in: ['POSTED', 'PARTIALLY_PAID', 'OVERDUE'] },
            },
            _sum: { total_amount: true, paid_amount: true },
            _count: true,
        });

        const expectedReceipts = roundMoney(
            Number(arDue._sum.total_amount || 0) - Number(arDue._sum.paid_amount || 0)
        );

        // Get AP invoices due on this date
        const apDue = await prisma.aPInvoice.aggregate({
            where: {
                farm_id: farmId,
                due_date: forecastDate,
                status: { in: ['POSTED', 'PARTIALLY_PAID', 'OVERDUE'] },
            },
            _sum: { total_amount: true, paid_amount: true },
            _count: true,
        });

        const expectedPayments = roundMoney(
            Number(apDue._sum.total_amount || 0) - Number(apDue._sum.paid_amount || 0)
        );

        const closingBalance = roundMoney(openingBalance + expectedReceipts - expectedPayments);

        dailyForecast.push({
            date: dateStr,
            opening_balance: openingBalance,
            expected_receipts: expectedReceipts,
            expected_payments: expectedPayments,
            closing_balance: closingBalance,
            ar_invoices_due: arDue._count,
            ap_invoices_due: apDue._count,
        });

        runningBalance = closingBalance;
        totalReceipts += expectedReceipts;
        totalPayments += expectedPayments;
    }

    return {
        farm_id: farmId,
        forecast_date: format(today, 'yyyy-MM-dd'),
        days,
        current_cash_balance: currentCashBalance,
        current_bank_balance: currentBankBalance,
        total_opening: currentCashBalance + currentBankBalance,
        total_expected_receipts: roundMoney(totalReceipts),
        total_expected_payments: roundMoney(totalPayments),
        total_closing: runningBalance,
        daily_forecast: dailyForecast,
    };
}

// ==========================================
// FINANCIAL KPIs
// ==========================================

export async function getFinancialKPIs(farmId: string): Promise<FinancialKPIs> {
    const today = new Date();
    const mtdStart = startOfMonth(today);
    const ytdStart = startOfYear(today);
    const lastMonthStart = startOfMonth(subMonths(today, 1));
    const lastMonthEnd = endOfMonth(subMonths(today, 1));

    // Revenue MTD
    const revenueMTD = await prisma.aRInvoice.aggregate({
        where: {
            farm_id: farmId,
            status: { in: ['POSTED', 'PARTIALLY_PAID', 'PAID'] },
            invoice_date: { gte: mtdStart, lte: today },
        },
        _sum: { total_amount: true },
    });

    // Revenue YTD
    const revenueYTD = await prisma.aRInvoice.aggregate({
        where: {
            farm_id: farmId,
            status: { in: ['POSTED', 'PARTIALLY_PAID', 'PAID'] },
            invoice_date: { gte: ytdStart, lte: today },
        },
        _sum: { total_amount: true },
    });

    // Revenue Last Month
    const revenueLastMonth = await prisma.aRInvoice.aggregate({
        where: {
            farm_id: farmId,
            status: { in: ['POSTED', 'PARTIALLY_PAID', 'PAID'] },
            invoice_date: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { total_amount: true },
    });

    // Expenses MTD
    const expensesMTD = await prisma.aPInvoice.aggregate({
        where: {
            farm_id: farmId,
            status: { in: ['POSTED', 'PARTIALLY_PAID', 'PAID'] },
            invoice_date: { gte: mtdStart, lte: today },
        },
        _sum: { total_amount: true },
    });

    // Expenses YTD
    const expensesYTD = await prisma.aPInvoice.aggregate({
        where: {
            farm_id: farmId,
            status: { in: ['POSTED', 'PARTIALLY_PAID', 'PAID'] },
            invoice_date: { gte: ytdStart, lte: today },
        },
        _sum: { total_amount: true },
    });

    // AR Outstanding
    const arOutstanding = await prisma.aRInvoice.aggregate({
        where: {
            farm_id: farmId,
            status: { in: ['POSTED', 'PARTIALLY_PAID', 'OVERDUE'] },
        },
        _sum: { total_amount: true, paid_amount: true },
        _count: true,
    });

    // AP Outstanding
    const apOutstanding = await prisma.aPInvoice.aggregate({
        where: {
            farm_id: farmId,
            status: { in: ['POSTED', 'PARTIALLY_PAID', 'OVERDUE'] },
        },
        _sum: { total_amount: true, paid_amount: true },
        _count: true,
    });

    // Customer and Vendor counts
    const customerCount = await prisma.partner.count({
        where: { farm_id: farmId, partner_type: 'CUSTOMER' },
    });

    const vendorCount = await prisma.partner.count({
        where: { farm_id: farmId, partner_type: 'VENDOR' },
    });

    // Calculate values
    const revMTD = Number(revenueMTD._sum.total_amount || 0);
    const revYTD = Number(revenueYTD._sum.total_amount || 0);
    const revLastMonth = Number(revenueLastMonth._sum.total_amount || 0);
    const expMTD = Number(expensesMTD._sum.total_amount || 0);
    const expYTD = Number(expensesYTD._sum.total_amount || 0);

    const arTotal = Number(arOutstanding._sum.total_amount || 0) - Number(arOutstanding._sum.paid_amount || 0);
    const apTotal = Number(apOutstanding._sum.total_amount || 0) - Number(apOutstanding._sum.paid_amount || 0);

    // Cash position (simplified)
    const cashIn = await prisma.aRPayment.aggregate({
        where: { farm_id: farmId, status: 'POSTED' },
        _sum: { amount: true },
    });
    const cashOut = await prisma.aPPayment.aggregate({
        where: { farm_id: farmId, status: 'POSTED' },
        _sum: { amount: true },
    });

    const cashPosition = roundMoney(Number(cashIn._sum.amount || 0) - Number(cashOut._sum.amount || 0));

    // DSO = (AR / Revenue) * 30
    const dso = revMTD > 0 ? roundMoney((arTotal / revMTD) * 30) : 0;

    // DPO = (AP / Expenses) * 30
    const dpo = expMTD > 0 ? roundMoney((apTotal / expMTD) * 30) : 0;

    // Gross Profit Margin
    const gpm = revYTD > 0 ? roundMoney(((revYTD - expYTD) / revYTD) * 100) : 0;

    // Revenue growth
    const revenueGrowth = revLastMonth > 0 ? roundMoney(((revMTD - revLastMonth) / revLastMonth) * 100) : 0;

    return {
        revenue_mtd: roundMoney(revMTD),
        revenue_ytd: roundMoney(revYTD),
        revenue_last_month: roundMoney(revLastMonth),
        revenue_growth_pct: revenueGrowth,
        expenses_mtd: roundMoney(expMTD),
        expenses_ytd: roundMoney(expYTD),
        ar_outstanding: roundMoney(arTotal),
        ap_outstanding: roundMoney(apTotal),
        net_position: roundMoney(arTotal - apTotal),
        cash_position: cashPosition,
        bank_position: 0,
        total_cash: cashPosition,
        dso,
        dpo,
        gross_profit_margin: gpm,
        net_profit_margin: gpm, // Simplified
        ar_invoice_count: arOutstanding._count,
        ap_invoice_count: apOutstanding._count,
        customer_count: customerCount,
        vendor_count: vendorCount,
    };
}

// ==========================================
// REVENUE TREND (12 MONTHS)
// ==========================================

export async function getRevenueTrend(farmId: string, months: number = 12): Promise<RevenueTrend[]> {
    const trends: RevenueTrend[] = [];
    const today = new Date();

    for (let i = months - 1; i >= 0; i--) {
        const monthDate = subMonths(today, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const monthStr = format(monthDate, 'yyyy-MM');

        // Revenue for month
        const revenue = await prisma.aRInvoice.aggregate({
            where: {
                farm_id: farmId,
                status: { in: ['POSTED', 'PARTIALLY_PAID', 'PAID'] },
                invoice_date: { gte: monthStart, lte: monthEnd },
            },
            _sum: { total_amount: true },
        });

        // Expenses for month
        const expenses = await prisma.aPInvoice.aggregate({
            where: {
                farm_id: farmId,
                status: { in: ['POSTED', 'PARTIALLY_PAID', 'PAID'] },
                invoice_date: { gte: monthStart, lte: monthEnd },
            },
            _sum: { total_amount: true },
        });

        const rev = Number(revenue._sum.total_amount || 0);
        const exp = Number(expenses._sum.total_amount || 0);

        trends.push({
            month: monthStr,
            revenue: roundMoney(rev),
            expenses: roundMoney(exp),
            profit: roundMoney(rev - exp),
        });
    }

    return trends;
}

// ==========================================
// AR AGING PIE CHART DATA
// ==========================================

export async function getARAgingPieData(farmId: string): Promise<ARAgingPieData[]> {
    const today = new Date();

    const invoices = await prisma.aRInvoice.findMany({
        where: {
            farm_id: farmId,
            status: { in: ['POSTED', 'PARTIALLY_PAID', 'OVERDUE'] },
        },
    });

    const buckets = {
        current: 0,
        days_1_30: 0,
        days_31_60: 0,
        days_61_90: 0,
        over_90: 0,
    };

    for (const inv of invoices) {
        const balance = Number(inv.total_amount) - Number(inv.paid_amount);
        if (balance <= 0) continue;

        const daysOverdue = Math.floor(
            (today.getTime() - inv.due_date.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysOverdue <= 0) buckets.current += balance;
        else if (daysOverdue <= 30) buckets.days_1_30 += balance;
        else if (daysOverdue <= 60) buckets.days_31_60 += balance;
        else if (daysOverdue <= 90) buckets.days_61_90 += balance;
        else buckets.over_90 += balance;
    }

    const total = Object.values(buckets).reduce((sum, val) => sum + val, 0);

    const colors = {
        current: '#22c55e',    // green
        days_1_30: '#eab308',  // yellow
        days_31_60: '#f97316', // orange
        days_61_90: '#ef4444', // red
        over_90: '#7f1d1d',    // dark red
    };

    const labels: Record<string, string> = {
        current: 'Chưa đến hạn',
        days_1_30: '1-30 ngày',
        days_31_60: '31-60 ngày',
        days_61_90: '61-90 ngày',
        over_90: 'Trên 90 ngày',
    };

    return Object.entries(buckets).map(([bucket, amount]) => ({
        bucket: labels[bucket],
        amount: roundMoney(amount),
        percentage: total > 0 ? roundMoney((amount / total) * 100) : 0,
        color: colors[bucket as keyof typeof colors],
    }));
}

// ==========================================
// TOP 10 CUSTOMERS
// ==========================================

export async function getTopCustomers(farmId: string, limit: number = 10): Promise<TopCustomer[]> {
    const ytdStart = startOfYear(new Date());

    const result = await prisma.aRInvoice.groupBy({
        by: ['customer_id'],
        where: {
            farm_id: farmId,
            status: { in: ['POSTED', 'PARTIALLY_PAID', 'PAID'] },
            invoice_date: { gte: ytdStart },
        },
        _sum: { total_amount: true },
        orderBy: { _sum: { total_amount: 'desc' } },
        take: limit,
    });

    const totalRevenue = result.reduce((sum, r) => sum + Number(r._sum.total_amount || 0), 0);

    const customers = await Promise.all(
        result.map(async (r) => {
            const customer = await prisma.partner.findUnique({
                where: { id: r.customer_id },
                select: { id: true, name: true },
            });

            const revenue = Number(r._sum.total_amount || 0);

            return {
                customer_id: r.customer_id,
                customer_name: customer?.name || 'Unknown',
                revenue: roundMoney(revenue),
                percentage: totalRevenue > 0 ? roundMoney((revenue / totalRevenue) * 100) : 0,
            };
        })
    );

    return customers;
}
