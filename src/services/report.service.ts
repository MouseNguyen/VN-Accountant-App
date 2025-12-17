// src/services/report.service.ts
// Business logic cho Báo cáo module

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getCurrentFarmId } from '@/lib/context';
import { roundMoney, toDecimal, multiply } from '@/lib/decimal';
import Decimal from 'decimal.js';
import type {
    IncomeExpenseReport,
    ProfitLossReport,
    InventoryReport,
    PayableReport,
} from '@/types/report';

// Transaction type helpers - must include SALE/PURCHASE for proper reporting
const INCOME_TYPES = ['INCOME', 'SALE', 'CASH_IN'];
const EXPENSE_TYPES = ['EXPENSE', 'PURCHASE', 'CASH_OUT'];

function isIncomeType(type: string): boolean {
    return INCOME_TYPES.includes(type);
}

function isExpenseType(type: string): boolean {
    return EXPENSE_TYPES.includes(type);
}

// ==========================================
// INCOME/EXPENSE REPORT
// ==========================================

/**
 * Báo cáo Thu Chi với Drill-down
 */
export async function getIncomeExpenseReport(params: {
    from: string;
    to: string;
    group_by?: 'day' | 'week' | 'month';
    include_drill_down?: boolean;
}): Promise<IncomeExpenseReport> {
    const farmId = getCurrentFarmId();
    const { from, to, group_by = 'day', include_drill_down = false } = params;

    const startDate = new Date(from);
    const endDate = new Date(to);
    endDate.setHours(23, 59, 59, 999);

    // Fetch transactions với items cho category breakdown
    const transactions = await prisma.transaction.findMany({
        where: {
            farm_id: farmId,
            trans_date: { gte: startDate, lte: endDate },
            deleted_at: null,
        },
        select: {
            id: true,
            trans_type: true,
            trans_date: true,
            total_amount: true,
            payment_method: true,
            items: {
                select: {
                    product: { select: { category: true } },
                    line_total: true,
                },
            },
        },
    });

    // Dùng Decimal.js cho tính toán
    let totalIncome = new Decimal(0);
    let totalExpense = new Decimal(0);

    transactions.forEach((t) => {
        const amount = toDecimal(t.total_amount);
        // Use helper functions that include SALE/PURCHASE
        if (isIncomeType(t.trans_type)) {
            totalIncome = totalIncome.plus(amount);
        } else if (isExpenseType(t.trans_type)) {
            totalExpense = totalExpense.plus(amount);
        }
    });

    // Group by date
    const dateMap = new Map<string, { income: Decimal; expense: Decimal; ids: string[] }>();

    transactions.forEach((t) => {
        let dateKey: string;
        const d = t.trans_date;

        switch (group_by) {
            case 'week': {
                const weekStart = new Date(d);
                weekStart.setDate(d.getDate() - d.getDay());
                dateKey = weekStart.toISOString().split('T')[0];
                break;
            }
            case 'month':
                dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                break;
            default:
                dateKey = d.toISOString().split('T')[0];
        }

        if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, { income: new Decimal(0), expense: new Decimal(0), ids: [] });
        }

        const entry = dateMap.get(dateKey)!;
        const amount = toDecimal(t.total_amount);
        if (isIncomeType(t.trans_type)) {
            entry.income = entry.income.plus(amount);
        } else if (isExpenseType(t.trans_type)) {
            entry.expense = entry.expense.plus(amount);
        }
        entry.ids.push(t.id);
    });

    const by_date = Array.from(dateMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
            date,
            income: roundMoney(data.income),
            expense: roundMoney(data.expense),
            net: roundMoney(data.income.minus(data.expense)),
            ...(include_drill_down ? { transaction_ids: data.ids } : {}),
        }));

    // Group by category
    const categoryMap = new Map<string, { income: Decimal; expense: Decimal; ids: string[] }>();

    transactions.forEach((t) => {
        t.items.forEach((item) => {
            const cat = item.product?.category || 'Khác';
            if (!categoryMap.has(cat)) {
                categoryMap.set(cat, { income: new Decimal(0), expense: new Decimal(0), ids: [] });
            }
            const entry = categoryMap.get(cat)!;
            const amount = toDecimal(item.line_total);
            if (isIncomeType(t.trans_type)) {
                entry.income = entry.income.plus(amount);
            } else if (isExpenseType(t.trans_type)) {
                entry.expense = entry.expense.plus(amount);
            }
            if (!entry.ids.includes(t.id)) entry.ids.push(t.id);
        });
    });

    const by_category = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        income: roundMoney(data.income),
        expense: roundMoney(data.expense),
        ...(include_drill_down ? { transaction_ids: data.ids } : {}),
    }));

    // Group by payment method
    const methodMap = new Map<string, { amount: Decimal; count: number }>();

    transactions.forEach((t) => {
        const method = t.payment_method;
        if (!methodMap.has(method)) {
            methodMap.set(method, { amount: new Decimal(0), count: 0 });
        }
        const entry = methodMap.get(method)!;
        entry.amount = entry.amount.plus(toDecimal(t.total_amount));
        entry.count += 1;
    });

    const by_payment_method = Array.from(methodMap.entries()).map(([method, data]) => ({
        method,
        payment_method: method, // alias for frontend compatibility
        amount: roundMoney(data.amount),
        count: data.count,
    }));

    const netValue = totalIncome.minus(totalExpense);

    return {
        period: { from, to, type: group_by },
        // Flat fields for easy access
        total_income: roundMoney(totalIncome),
        total_expense: roundMoney(totalExpense),
        net: roundMoney(netValue),
        transaction_count: transactions.length,
        // Summary object for compatibility
        summary: {
            total_income: roundMoney(totalIncome),
            total_expense: roundMoney(totalExpense),
            net_profit: roundMoney(netValue),
            transaction_count: transactions.length,
        },
        by_date,
        by_category,
        by_payment_method,
    };
}

// ==========================================
// PROFIT/LOSS REPORT
// ==========================================

/**
 * Báo cáo Lãi Lỗ với COGS từ avg_cost
 */
export async function getProfitLossReport(params: {
    from: string;
    to: string;
    include_drill_down?: boolean;
}): Promise<ProfitLossReport> {
    const farmId = getCurrentFarmId();
    const { from, to, include_drill_down = false } = params;

    const startDate = new Date(from);
    const endDate = new Date(to);
    endDate.setHours(23, 59, 59, 999);

    // Doanh thu bán hàng (INCOME/SALE)
    const salesTransactions = await prisma.transaction.findMany({
        where: {
            farm_id: farmId,
            trans_type: { in: ['INCOME', 'SALE'] },
            trans_date: { gte: startDate, lte: endDate },
            deleted_at: null,
        },
        select: { id: true, total_amount: true },
    });

    const sales = salesTransactions.reduce(
        (sum, t) => sum.plus(toDecimal(t.total_amount)),
        new Decimal(0)
    );
    const salesIds = salesTransactions.map((t) => t.id);

    // COGS - Giá vốn hàng bán (từ unit_cost trong TransactionItem)
    const soldItems = await prisma.transactionItem.findMany({
        where: {
            transaction: {
                farm_id: farmId,
                trans_type: { in: ['INCOME', 'SALE'] },
                trans_date: { gte: startDate, lte: endDate },
                deleted_at: null,
            },
            product_id: { not: null },
        },
        select: {
            quantity: true,
            unit_cost: true, // Giá vốn tại thời điểm bán
            transaction_id: true,
        },
    });

    let cogs = new Decimal(0);
    const cogsTransactionIds = new Set<string>();

    soldItems.forEach((item) => {
        const qty = toDecimal(item.quantity);
        const cost = toDecimal(item.unit_cost);
        cogs = cogs.plus(qty.times(cost));
        cogsTransactionIds.add(item.transaction_id);
    });

    const grossProfit = sales.minus(cogs);

    // Chi phí hoạt động (EXPENSE/PURCHASE không có product - pure expenses)
    const opExpenseTransactions = await prisma.transaction.findMany({
        where: {
            farm_id: farmId,
            trans_type: { in: ['EXPENSE'] }, // Note: PURCHASE has products, so not pure expense
            trans_date: { gte: startDate, lte: endDate },
            deleted_at: null,
            items: { none: { product_id: { not: null } } },
        },
        select: { id: true, total_amount: true, description: true },
    });

    const opExpenses = opExpenseTransactions.reduce(
        (sum, t) => sum.plus(toDecimal(t.total_amount)),
        new Decimal(0)
    );
    const opExpenseIds = opExpenseTransactions.map((t) => t.id);

    const netProfit = grossProfit.minus(opExpenses);
    const profitMargin = sales.isZero() ? 0 : netProfit.dividedBy(sales).times(100).toNumber();

    return {
        period: { from, to },
        // Flat fields for easy access
        revenue: roundMoney(sales),
        total_expense: roundMoney(cogs.plus(opExpenses)),
        cogs: roundMoney(cogs),
        gross_profit: roundMoney(grossProfit),
        net_profit: roundMoney(netProfit),
        profit_margin: Math.round(profitMargin * 100) / 100,
        // Detailed breakdown
        revenue_breakdown: {
            sales: roundMoney(sales),
            other_income: 0,
            total: roundMoney(sales),
            ...(include_drill_down ? { transaction_ids: salesIds } : {}),
        },
        cost_of_goods_sold: {
            opening_stock: 0,
            purchases: 0,
            closing_stock: 0,
            total: roundMoney(cogs),
            ...(include_drill_down ? { transaction_ids: Array.from(cogsTransactionIds) } : {}),
        },
        operating_expenses: {
            items: [
                {
                    name: 'Chi phí hoạt động',
                    amount: roundMoney(opExpenses),
                    ...(include_drill_down ? { transaction_ids: opExpenseIds } : {}),
                },
            ],
            total: roundMoney(opExpenses),
        },
    };
}

// ==========================================
// INVENTORY REPORT
// ==========================================

/**
 * Báo cáo Tồn kho
 */
export async function getInventoryReport(params: {
    category?: string;
    low_stock_only?: boolean;
    include_zero_stock?: boolean;
}): Promise<InventoryReport> {
    const farmId = getCurrentFarmId();
    const { category, low_stock_only, include_zero_stock } = params;

    const where: Prisma.ProductWhereInput = {
        farm_id: farmId,
        deleted_at: null,
        is_active: true,
    };

    if (category) where.category = category as Prisma.EnumProductCategoryFilter;
    if (!include_zero_stock) where.stock_qty = { gt: 0 };

    const products = await prisma.product.findMany({ where, orderBy: { name: 'asc' } });

    let items = products.map((p) => {
        const stockQty = Number(p.stock_qty);
        const avgCost = Number(p.avg_cost);
        const stockValue = roundMoney(multiply(stockQty, avgCost));
        const minStock = Number(p.min_stock || 0);

        return {
            product_id: p.id,
            product_code: p.code, // match InventoryItem type
            product_name: p.name, // match InventoryItem type
            category: p.category || null,
            base_unit: p.unit, // match InventoryItem type
            current_stock: stockQty, // match InventoryItem type
            avg_cost: avgCost,
            value: stockValue, // match InventoryItem type
            min_stock: minStock || null,
            is_low_stock: minStock > 0 && stockQty < minStock,
        };
    });

    if (low_stock_only) items = items.filter((i) => i.is_low_stock);

    // Group by category với Decimal
    const categoryMap = new Map<string, { count: number; value: Decimal }>();
    items.forEach((i) => {
        const cat = i.category || 'Khác';
        if (!categoryMap.has(cat)) categoryMap.set(cat, { count: 0, value: new Decimal(0) });
        const entry = categoryMap.get(cat)!;
        entry.count += 1;
        entry.value = entry.value.plus(i.value); // Fixed: use i.value instead of i.stock_value
    });

    const by_category = Array.from(categoryMap.entries()).map(([cat, data]) => ({
        category: cat,
        product_count: data.count,
        total_value: roundMoney(data.value),
    }));

    const totalValue = items.reduce((s, i) => s.plus(i.value), new Decimal(0)); // Fixed: use i.value

    const lowStockCount = items.filter((i) => i.is_low_stock).length;
    const outOfStockCount = products.filter((p) => Number(p.stock_qty) <= 0).length;

    // Build low_stock_items array
    const low_stock_items = items
        .filter((i) => i.is_low_stock)
        .map((i) => ({
            product_id: i.product_id,
            product_name: i.product_name,
            current_stock: i.current_stock,
            min_stock: i.min_stock || 0,
            base_unit: i.base_unit,
        }));

    return {
        generated_at: new Date().toISOString(),
        // Flat fields for easy access
        total_products: items.length,
        total_value: roundMoney(totalValue),
        low_stock_count: lowStockCount,
        out_of_stock_count: outOfStockCount,
        // Summary object for compatibility
        summary: {
            total_products: items.length,
            total_value: roundMoney(totalValue),
            low_stock_count: lowStockCount,
            out_of_stock_count: outOfStockCount,
        },
        items,
        low_stock_items,
        by_category,
    };
}

// ==========================================
// PAYABLE REPORT (AGING)
// ==========================================

/**
 * Báo cáo Công nợ với Aging chính xác
 */
export async function getPayableReport(): Promise<PayableReport> {
    const farmId = getCurrentFarmId();

    // Lấy tất cả transactions chưa TT hết (PENDING, PARTIAL, or UNPAID)
    const unpaidTransactions = await prisma.transaction.findMany({
        where: {
            farm_id: farmId,
            deleted_at: null,
            payment_status: { in: ['PENDING', 'PARTIAL', 'UNPAID'] },
        },
        select: {
            id: true,
            trans_type: true,
            trans_date: true,
            total_amount: true,
            paid_amount: true,
            partner: {
                select: { id: true, name: true, partner_type: true, payment_term_days: true },
            },
        },
    });

    const today = new Date();
    const agingRanges = ['0-30', '31-60', '61-90', '>90'] as const;

    // Initialize aging maps
    const receivablesAging = new Map(
        agingRanges.map((r) => [r, { amount: new Decimal(0), count: 0, partnerIds: new Set<string>() }])
    );
    const payablesAging = new Map(
        agingRanges.map((r) => [r, { amount: new Decimal(0), count: 0, partnerIds: new Set<string>() }])
    );

    let totalReceivable = new Decimal(0);
    let overdueReceivable = new Decimal(0);
    let currentReceivable = new Decimal(0);

    let totalPayable = new Decimal(0);
    let overduePayable = new Decimal(0);
    let currentPayable = new Decimal(0);

    // Partner tracking for top debtors/creditors
    const debtorMap = new Map<string, { name: string; balance: Decimal; maxOverdue: number }>();
    const creditorMap = new Map<string, { name: string; balance: Decimal; maxOverdue: number }>();

    unpaidTransactions.forEach((t) => {
        // Handle transactions without partner - use defaults
        const partnerId = t.partner?.id || 'no-partner';
        const partnerName = t.partner?.name || 'Không có đối tác';
        const paymentTermDays = t.partner?.payment_term_days || 0;

        const remaining = toDecimal(t.total_amount).minus(toDecimal(t.paid_amount));
        const dueDate = new Date(t.trans_date);
        dueDate.setDate(dueDate.getDate() + paymentTermDays);
        const overdueDays = Math.max(
            0,
            Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        );

        // Xác định aging range
        let range: typeof agingRanges[number];
        if (overdueDays <= 30) range = '0-30';
        else if (overdueDays <= 60) range = '31-60';
        else if (overdueDays <= 90) range = '61-90';
        else range = '>90';

        // Determine if this is receivable or payable based on transaction type
        // Use helper functions that include SALE/PURCHASE
        const isReceivable = isIncomeType(t.trans_type);
        const isPayable = isExpenseType(t.trans_type);

        if (isReceivable) {
            totalReceivable = totalReceivable.plus(remaining);
            if (overdueDays > 0) overdueReceivable = overdueReceivable.plus(remaining);
            else currentReceivable = currentReceivable.plus(remaining);

            const entry = receivablesAging.get(range)!;
            entry.amount = entry.amount.plus(remaining);
            entry.count += 1;
            entry.partnerIds.add(partnerId);

            // Track debtor
            if (!debtorMap.has(partnerId)) {
                debtorMap.set(partnerId, {
                    name: partnerName,
                    balance: new Decimal(0),
                    maxOverdue: 0,
                });
            }
            const dm = debtorMap.get(partnerId)!;
            dm.balance = dm.balance.plus(remaining);
            dm.maxOverdue = Math.max(dm.maxOverdue, overdueDays);
        }

        if (isPayable) {
            totalPayable = totalPayable.plus(remaining);
            if (overdueDays > 0) overduePayable = overduePayable.plus(remaining);
            else currentPayable = currentPayable.plus(remaining);

            const entry = payablesAging.get(range)!;
            entry.amount = entry.amount.plus(remaining);
            entry.count += 1;
            entry.partnerIds.add(partnerId);

            // Track creditor
            if (!creditorMap.has(partnerId)) {
                creditorMap.set(partnerId, {
                    name: partnerName,
                    balance: new Decimal(0),
                    maxOverdue: 0,
                });
            }
            const cm = creditorMap.get(partnerId)!;
            cm.balance = cm.balance.plus(remaining);
            cm.maxOverdue = Math.max(cm.maxOverdue, overdueDays);
        }
    });

    // Top debtors (sorted by balance desc)
    const topDebtors = Array.from(debtorMap.entries())
        .map(([id, data]) => ({
            partner_id: id,
            name: data.name,
            balance: roundMoney(data.balance),
            overdue_days: data.maxOverdue,
        }))
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 10);

    // Top creditors
    const topCreditors = Array.from(creditorMap.entries())
        .map(([id, data]) => ({
            partner_id: id,
            name: data.name,
            balance: roundMoney(data.balance),
            overdue_days: data.maxOverdue,
        }))
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 10);

    // Build partners array for report
    const allPartners = [...topDebtors.map(d => ({
        partner_id: d.partner_id,
        partner_code: '', // Will be populated if needed
        partner_name: d.name,
        partner_type: 'CUSTOMER' as const,
        balance: d.balance,
        overdue_balance: d.overdue_days > 0 ? d.balance : 0,
        overdue_days: d.overdue_days,
    })), ...topCreditors.map(c => ({
        partner_id: c.partner_id,
        partner_code: '',
        partner_name: c.name,
        partner_type: 'VENDOR' as const,
        balance: c.balance,
        overdue_balance: c.overdue_days > 0 ? c.balance : 0,
        overdue_days: c.overdue_days,
    }))];

    // Calculate aging buckets for flat fields
    const aging = {
        current: roundMoney(currentReceivable.plus(currentPayable)),
        days_1_30: roundMoney(
            (receivablesAging.get('0-30')?.amount || new Decimal(0))
                .plus(payablesAging.get('0-30')?.amount || new Decimal(0))
        ),
        days_31_60: roundMoney(
            (receivablesAging.get('31-60')?.amount || new Decimal(0))
                .plus(payablesAging.get('31-60')?.amount || new Decimal(0))
        ),
        days_over_60: roundMoney(
            (receivablesAging.get('61-90')?.amount || new Decimal(0))
                .plus(receivablesAging.get('>90')?.amount || new Decimal(0))
                .plus(payablesAging.get('61-90')?.amount || new Decimal(0))
                .plus(payablesAging.get('>90')?.amount || new Decimal(0))
        ),
    };

    return {
        generated_at: new Date().toISOString(),
        // Flat fields for easy access
        total_receivable: roundMoney(totalReceivable),
        total_payable: roundMoney(totalPayable),
        total_overdue: roundMoney(overdueReceivable.plus(overduePayable)),
        partner_count: debtorMap.size + creditorMap.size,
        aging,
        partners: allPartners,
        // Detailed breakdown for compatibility
        receivables: {
            total: roundMoney(totalReceivable),
            overdue: roundMoney(overdueReceivable),
            current: roundMoney(currentReceivable),
            by_aging: agingRanges.map((range) => {
                const data = receivablesAging.get(range)!;
                return {
                    range,
                    amount: roundMoney(data.amount),
                    count: data.count,
                    partner_ids: Array.from(data.partnerIds),
                };
            }),
            top_debtors: topDebtors,
        },
        payables: {
            total: roundMoney(totalPayable),
            overdue: roundMoney(overduePayable),
            current: roundMoney(currentPayable),
            by_aging: agingRanges.map((range) => {
                const data = payablesAging.get(range)!;
                return {
                    range,
                    amount: roundMoney(data.amount),
                    count: data.count,
                    partner_ids: Array.from(data.partnerIds),
                };
            }),
            top_creditors: topCreditors,
        },
    };
}
