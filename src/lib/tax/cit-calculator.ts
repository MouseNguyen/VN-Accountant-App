// src/lib/tax/cit-calculator.ts
// CIT (Corporate Income Tax) Calculator Service - Task 4
// Integrates with Tax Rules Engine for add-back detection

import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/context';
import {
    CITCalculationInput,
    CITCalculationResult,
    CITAddBacksResult,
    CITAdjustmentItem,
    CIT_CATEGORY_LABELS,
} from '@/types/cit';
import { getRuleValue } from './engine';
import Decimal from 'decimal.js';

// ==========================================
// CONSTANTS
// ==========================================

const DEFAULT_CIT_RATE = 20; // 20%
const DEFAULT_CASH_LIMIT = 20000000; // 20 triệu
const DEFAULT_ENTERTAINMENT_LIMIT = 500000; // 500k/người

// ==========================================
// MAIN CALCULATE CIT FUNCTION
// ==========================================

export async function calculateCIT(
    farmId: string,
    input: CITCalculationInput
): Promise<CITCalculationResult> {
    // Validate period format
    validatePeriodFormat(input.period, input.period_type);

    const { startDate, endDate } = parsePeriod(input.period, input.period_type);
    const userId = getCurrentUserId();

    // 1. Calculate REVENUE (SALE + INCOME transactions)
    const revenueResult = await prisma.transaction.aggregate({
        where: {
            farm_id: farmId,
            trans_type: { in: ['SALE', 'INCOME'] },
            trans_date: { gte: startDate, lte: endDate },
            deleted_at: null,
        },
        _sum: { total_amount: true },
    });
    const totalRevenue = Number(revenueResult._sum.total_amount || 0);

    // 2. Calculate EXPENSES (PURCHASE + EXPENSE + CASH_OUT transactions)
    const expensesResult = await prisma.transaction.aggregate({
        where: {
            farm_id: farmId,
            trans_type: { in: ['PURCHASE', 'EXPENSE', 'CASH_OUT'] },
            trans_date: { gte: startDate, lte: endDate },
            deleted_at: null,
        },
        _sum: { total_amount: true },
    });
    const totalExpenses = Number(expensesResult._sum.total_amount || 0);

    // 3. Calculate OTHER INCOME (CASH_IN with specific categories)
    const otherIncomeResult = await prisma.transaction.aggregate({
        where: {
            farm_id: farmId,
            trans_type: 'CASH_IN',
            cash_in_category: { in: ['INTEREST_INCOME', 'INSURANCE_CLAIM', 'OTHER_INCOME'] },
            trans_date: { gte: startDate, lte: endDate },
            deleted_at: null,
        },
        _sum: { total_amount: true },
    });
    const otherIncome = Number(otherIncomeResult._sum.total_amount || 0);

    // 4. Calculate ACCOUNTING PROFIT
    const accountingProfit = new Decimal(totalRevenue)
        .plus(otherIncome)
        .minus(totalExpenses)
        .toNumber();

    // 5. Detect ADD-BACKS (non-deductible expenses)
    const addBacks = await detectCITAddBacks(farmId, startDate, endDate);

    // 6. Calculate TAXABLE INCOME
    // Formula: Taxable Income = Accounting Profit + Add-backs - Deductions
    const taxableIncome = Math.max(0, accountingProfit + addBacks.total);

    // 7. Get TAX RATE from rules (default 20%)
    let taxRate = DEFAULT_CIT_RATE;
    try {
        taxRate = await getRuleValue(farmId, 'CIT_TAX_RATE');
    } catch {
        // Use default
    }

    // 8. Calculate CIT AMOUNT
    const citAmount = new Decimal(taxableIncome)
        .times(taxRate)
        .dividedBy(100)
        .toDecimalPlaces(0)
        .toNumber();

    // 9. Calculate LOSS CARRIED FORWARD
    const lossCarried = accountingProfit < 0 ? Math.abs(accountingProfit) : 0;

    // 10. SAVE to database
    const calculation = await prisma.cITCalculation.upsert({
        where: {
            farm_id_period: { farm_id: farmId, period: input.period }
        },
        update: {
            period_type: input.period_type,
            total_revenue: totalRevenue,
            other_income: otherIncome,
            total_expenses: totalExpenses,
            accounting_profit: accountingProfit,
            add_backs: addBacks.total,
            deductions: 0,
            taxable_income: taxableIncome,
            tax_rate: taxRate,
            cit_amount: citAmount,
            loss_carried: lossCarried,
            status: 'CALCULATED',
            calculated_at: new Date(),
        },
        create: {
            farm_id: farmId,
            period: input.period,
            period_type: input.period_type,
            total_revenue: totalRevenue,
            other_income: otherIncome,
            total_expenses: totalExpenses,
            accounting_profit: accountingProfit,
            add_backs: addBacks.total,
            deductions: 0,
            taxable_income: taxableIncome,
            tax_rate: taxRate,
            cit_amount: citAmount,
            loss_carried: lossCarried,
            status: 'CALCULATED',
            calculated_at: new Date(),
            created_by: userId,
        },
    });

    // 11. SAVE adjustments
    await prisma.cITAdjustment.deleteMany({
        where: { cit_calculation_id: calculation.id },
    });

    for (const item of addBacks.items) {
        await prisma.cITAdjustment.create({
            data: {
                cit_calculation_id: calculation.id,
                adjustment_type: 'ADD_BACK',
                category: item.category,
                description: item.description,
                amount: item.amount,
                transaction_id: item.transaction_id || null,
            },
        });
    }

    return formatCITResult(calculation, addBacks.items);
}

// ==========================================
// DETECT CIT ADD-BACKS
// ==========================================

export async function detectCITAddBacks(
    farmId: string,
    startDate: Date,
    endDate: Date
): Promise<CITAddBacksResult> {
    const items: CITAdjustmentItem[] = [];

    // Get limits from Tax Rules
    let cashLimit = DEFAULT_CASH_LIMIT;
    let entertainmentLimitPerPerson = DEFAULT_ENTERTAINMENT_LIMIT;

    try {
        cashLimit = await getRuleValue(farmId, 'VAT_NON_CASH');
    } catch { /* use default */ }

    // ==========================================
    // RULE 1: ADMIN_PENALTY - 100% add-back
    // ==========================================
    const penalties = await prisma.transaction.findMany({
        where: {
            farm_id: farmId,
            trans_type: { in: ['EXPENSE', 'CASH_OUT'] },
            expense_type: 'ADMIN_PENALTY',
            trans_date: { gte: startDate, lte: endDate },
            deleted_at: null,
        },
    });

    for (const trans of penalties) {
        const amount = Number(trans.total_amount);
        items.push({
            id: `penalty-${trans.id}`,
            adjustment_type: 'ADD_BACK',
            category: 'ADMIN_PENALTY',
            category_label: CIT_CATEGORY_LABELS['ADMIN_PENALTY'],
            rule_code: 'CIT_PENALTY',
            description: `Phạt hành chính: ${trans.trans_number}`,
            amount,
            transaction_id: trans.id,
            transaction_code: trans.trans_number,
            reference: 'TT78/2014/TT-BTC Điều 6',
        });
    }

    // ==========================================
    // RULE 2: WELFARE EXCESS - Phúc lợi > 1 tháng lương
    // ==========================================
    const welfareTransactions = await prisma.transaction.findMany({
        where: {
            farm_id: farmId,
            trans_type: { in: ['EXPENSE', 'CASH_OUT'] },
            expense_type: 'WELFARE',
            trans_date: { gte: startDate, lte: endDate },
            deleted_at: null,
        },
    });

    if (welfareTransactions.length > 0) {
        // Get average monthly salary
        const avgSalary = await getAverageMonthlyWage(farmId, startDate, endDate);
        const totalWelfare = welfareTransactions.reduce((sum, t) => sum + Number(t.total_amount), 0);

        if (totalWelfare > avgSalary && avgSalary > 0) {
            const excessAmount = totalWelfare - avgSalary;
            items.push({
                id: `welfare-excess`,
                adjustment_type: 'ADD_BACK',
                category: 'WELFARE_EXCESS',
                category_label: CIT_CATEGORY_LABELS['WELFARE_EXCESS'],
                rule_code: 'CIT_WELFARE_CAP',
                description: `Phúc lợi vượt mức 1 tháng lương TB (${formatVND(avgSalary)})`,
                amount: excessAmount,
                reference: 'TT96/2015/TT-BTC Điều 6',
            });
        }
    }

    // ==========================================
    // RULE 3: ENTERTAINMENT EXCESS - Tiếp khách vượt mức
    // ==========================================
    const entertainmentTrans = await prisma.transaction.findMany({
        where: {
            farm_id: farmId,
            trans_type: { in: ['EXPENSE', 'CASH_OUT'] },
            expense_type: 'ENTERTAINMENT',
            trans_date: { gte: startDate, lte: endDate },
            deleted_at: null,
        },
    });

    // Get total revenue for entertainment limit check (0.15% of revenue for production)
    const revenueForLimit = await prisma.transaction.aggregate({
        where: {
            farm_id: farmId,
            trans_type: { in: ['SALE', 'INCOME'] },
            trans_date: { gte: startDate, lte: endDate },
            deleted_at: null,
        },
        _sum: { total_amount: true },
    });
    const totalRevenueForLimit = Number(revenueForLimit._sum.total_amount || 0);
    const entertainmentLimit = totalRevenueForLimit * 0.0015; // 0.15% of revenue

    const totalEntertainment = entertainmentTrans.reduce((sum, t) => sum + Number(t.total_amount), 0);

    if (totalEntertainment > entertainmentLimit && entertainmentLimit > 0) {
        const excessAmount = totalEntertainment - entertainmentLimit;
        items.push({
            id: `entertainment-excess`,
            adjustment_type: 'ADD_BACK',
            category: 'ENTERTAINMENT_EXCESS',
            category_label: CIT_CATEGORY_LABELS['ENTERTAINMENT_EXCESS'],
            rule_code: 'CIT_ENTERTAINMENT',
            description: `Tiếp khách vượt 0.15% doanh thu (Limit: ${formatVND(entertainmentLimit)})`,
            amount: excessAmount,
            reference: 'TT78/2014/TT-BTC Điều 6',
        });
    }

    // ==========================================
    // RULE 4: CASH OVER LIMIT - Chi >= 20 triệu tiền mặt không HĐ
    // ==========================================
    const cashOverLimit = await prisma.transaction.findMany({
        where: {
            farm_id: farmId,
            trans_type: { in: ['EXPENSE', 'CASH_OUT'] },
            payment_method: 'CASH',
            total_amount: { gte: cashLimit },
            trans_date: { gte: startDate, lte: endDate },
            deleted_at: null,
        },
    });

    for (const trans of cashOverLimit) {
        const amount = Number(trans.total_amount);
        items.push({
            id: `cash-limit-${trans.id}`,
            adjustment_type: 'ADD_BACK',
            category: 'CASH_OVER_LIMIT',
            category_label: CIT_CATEGORY_LABELS['CASH_OVER_LIMIT'],
            rule_code: 'CIT_NO_INVOICE',
            description: `Chi tiền mặt >= ${formatVND(cashLimit)}: ${trans.trans_number}`,
            amount,
            transaction_id: trans.id,
            transaction_code: trans.trans_number,
            reference: 'TT96/2015/TT-BTC Điều 6',
        });
    }

    // ==========================================
    // RULE 5: LOAN_REPAYMENT - Không ảnh hưởng P&L
    // Note: Trả nợ vay là cash flow, không phải expense
    // Đã được xử lý ở chỗ khác, không cần add-back
    // ==========================================

    // ==========================================
    // GROUP BY CATEGORY
    // ==========================================
    const byCategory = items.reduce((acc, item) => {
        const existing = acc.find(c => c.category === item.category);
        if (existing) {
            existing.amount += item.amount;
            existing.count++;
        } else {
            acc.push({
                category: item.category,
                label: item.category_label,
                amount: item.amount,
                count: 1,
                rule_code: item.rule_code,
            });
        }
        return acc;
    }, [] as CITAddBacksResult['by_category']);

    const total = items.reduce((sum, item) => sum + item.amount, 0);

    return { items, total, by_category: byCategory };
}

// ==========================================
// GET CIT CALCULATION BY PERIOD
// ==========================================

export async function getCITCalculation(
    farmId: string,
    period: string
): Promise<CITCalculationResult | null> {
    const calculation = await prisma.cITCalculation.findUnique({
        where: {
            farm_id_period: { farm_id: farmId, period }
        },
        include: {
            adjustments: {
                include: {
                    transaction: {
                        select: { trans_number: true }
                    }
                }
            }
        }
    });

    if (!calculation) return null;

    const items: CITAdjustmentItem[] = calculation.adjustments.map(adj => ({
        id: adj.id,
        adjustment_type: adj.adjustment_type as 'ADD_BACK' | 'DEDUCTION',
        category: adj.category,
        category_label: CIT_CATEGORY_LABELS[adj.category] || adj.category,
        rule_code: '',
        description: adj.description,
        amount: Number(adj.amount),
        transaction_id: adj.transaction_id || undefined,
        transaction_code: adj.transaction?.trans_number,
    }));

    return formatCITResult(calculation, items);
}

// ==========================================
// LIST CIT CALCULATIONS
// ==========================================

export async function listCITCalculations(
    farmId: string,
    periodType?: 'QUARTERLY' | 'ANNUAL'
): Promise<CITCalculationResult[]> {
    const where: {
        farm_id: string;
        period_type?: 'QUARTERLY' | 'ANNUAL';
    } = { farm_id: farmId };

    if (periodType) {
        where.period_type = periodType;
    }

    const calculations = await prisma.cITCalculation.findMany({
        where,
        orderBy: { period: 'desc' },
        include: {
            adjustments: true,
        },
    });

    return calculations.map(calc => formatCITResult(calc, []));
}

// ==========================================
// HELPERS
// ==========================================

function validatePeriodFormat(period: string, type: 'QUARTERLY' | 'ANNUAL'): void {
    if (type === 'QUARTERLY') {
        if (!period.match(/^\d{4}-Q[1-4]$/)) {
            throw new Error(`Invalid quarterly period format: ${period}. Expected format: YYYY-Q1, YYYY-Q2, YYYY-Q3, or YYYY-Q4`);
        }
    } else {
        if (!period.match(/^\d{4}$/)) {
            throw new Error(`Invalid annual period format: ${period}. Expected format: YYYY`);
        }
    }
}

export function parsePeriod(period: string, type: 'QUARTERLY' | 'ANNUAL' | string): { startDate: Date; endDate: Date } {
    if (type === 'QUARTERLY') {
        const year = parseInt(period.slice(0, 4));
        const quarter = parseInt(period.slice(-1));
        const startMonth = (quarter - 1) * 3;
        return {
            startDate: new Date(year, startMonth, 1),
            endDate: new Date(year, startMonth + 3, 0, 23, 59, 59),
        };
    } else {
        const year = parseInt(period);
        return {
            startDate: new Date(year, 0, 1),
            endDate: new Date(year, 11, 31, 23, 59, 59),
        };
    }
}

async function getAverageMonthlyWage(
    farmId: string,
    startDate: Date,
    endDate: Date
): Promise<number> {
    // Get total salary from CASH_OUT with expense_type = SALARY
    const salaryResult = await prisma.transaction.aggregate({
        where: {
            farm_id: farmId,
            trans_type: 'CASH_OUT',
            expense_type: 'SALARY',
            trans_date: { gte: startDate, lte: endDate },
            deleted_at: null,
        },
        _sum: { total_amount: true },
    });

    const totalSalary = Number(salaryResult._sum.total_amount || 0);

    // Calculate number of months in period
    const months = Math.ceil((endDate.getTime() - startDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000));

    return months > 0 ? totalSalary / months : 0;
}

function formatVND(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatCITResult(calc: {
    id: string;
    period: string;
    period_type: string;
    total_revenue: { toNumber?: () => number } | number;
    other_income: { toNumber?: () => number } | number;
    total_expenses: { toNumber?: () => number } | number;
    accounting_profit: { toNumber?: () => number } | number;
    add_backs: { toNumber?: () => number } | number;
    deductions: { toNumber?: () => number } | number;
    taxable_income: { toNumber?: () => number } | number;
    tax_rate: { toNumber?: () => number } | number;
    cit_amount: { toNumber?: () => number } | number;
    loss_carried: { toNumber?: () => number } | number;
    status: string;
    calculated_at?: Date | null;
}, items: CITAdjustmentItem[]): CITCalculationResult {
    const toNum = (val: { toNumber?: () => number } | number | null): number => {
        if (val === null || val === undefined) return 0;
        if (typeof val === 'number') return val;
        if (typeof val.toNumber === 'function') return val.toNumber();
        return Number(val);
    };

    return {
        id: calc.id,
        period: calc.period,
        period_type: calc.period_type,
        total_revenue: toNum(calc.total_revenue),
        other_income: toNum(calc.other_income),
        total_expenses: toNum(calc.total_expenses),
        accounting_profit: toNum(calc.accounting_profit),
        add_backs: toNum(calc.add_backs),
        deductions: toNum(calc.deductions),
        adjustments: items,
        taxable_income: toNum(calc.taxable_income),
        tax_rate: toNum(calc.tax_rate),
        cit_amount: toNum(calc.cit_amount),
        loss_carried: toNum(calc.loss_carried),
        status: calc.status,
        calculated_at: calc.calculated_at?.toISOString(),
    };
}
