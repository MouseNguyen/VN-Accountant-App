// src/services/financial-statement.service.ts
// Financial Statements Service - Balance Sheet & Income Statement
// Task 11 Phase 3

import { prisma } from '@/lib/prisma';
import { getCurrentFarmId } from '@/lib/context';
import Decimal from 'decimal.js';

// ==========================================
// TYPES
// ==========================================

export interface BalanceSheetSection {
    label: string;
    code?: string;
    amount: number;
    items?: BalanceSheetSection[];
}

export interface BalanceSheet {
    as_of_date: string;
    farm_name: string;
    farm_tax_code?: string;
    generated_at: string;

    // Tài sản (Assets)
    assets: {
        current: BalanceSheetSection;  // Tài sản ngắn hạn
        fixed: BalanceSheetSection;     // Tài sản cố định
        total: number;
    };

    // Nguồn vốn (Liabilities + Equity)
    liabilities: {
        current: BalanceSheetSection;   // Nợ ngắn hạn
        long_term: BalanceSheetSection; // Nợ dài hạn
        total: number;
    };

    equity: {
        capital: number;           // Vốn đầu tư
        retained_earnings: number; // Lợi nhuận giữ lại
        current_year_profit: number; // Lợi nhuận năm nay
        total: number;
    };

    // Balance check
    total_assets: number;
    total_liabilities_equity: number;
    is_balanced: boolean;

    // Year-over-year comparison
    comparison?: {
        previous_date: string;
        total_assets_previous: number;
        total_liabilities_equity_previous: number;
        assets_change_percent: number;
    };
}

export interface IncomeStatementSection {
    label: string;
    code?: string;
    amount: number;
    items?: { label: string; amount: number }[];
}

export interface IncomeStatement {
    period: {
        from: string;
        to: string;
    };
    farm_name: string;
    farm_tax_code?: string;
    generated_at: string;

    // 1. Doanh thu (Revenue)
    revenue: {
        sales: number;           // Doanh thu bán hàng
        other_income: number;    // Thu nhập khác
        total: number;
    };

    // 2. Giá vốn hàng bán (COGS)
    cost_of_goods_sold: number;

    // 3. Lợi nhuận gộp
    gross_profit: number;

    // 4. Chi phí hoạt động (Operating Expenses)
    operating_expenses: {
        selling: number;         // Chi phí bán hàng
        admin: number;          // Chi phí quản lý
        depreciation: number;    // Khấu hao
        other: number;          // Chi phí khác
        total: number;
    };

    // 5. Lợi nhuận từ hoạt động kinh doanh
    operating_income: number;

    // 6. Chi phí/Thu nhập tài chính
    financial: {
        income: number;
        expense: number;
        net: number;
    };

    // 7. Lợi nhuận trước thuế
    profit_before_tax: number;

    // 8. Thuế TNDN
    tax: number;

    // 9. Lợi nhuận sau thuế
    net_profit: number;

    // Tỷ suất
    ratios: {
        gross_margin: number;    // Tỷ suất lợi nhuận gộp
        operating_margin: number; // Tỷ suất lợi nhuận hoạt động
        net_margin: number;      // Tỷ suất lợi nhuận ròng
    };

    // Year-over-year comparison
    comparison?: {
        previous_period: { from: string; to: string };
        previous_net_profit: number;
        change_amount: number;
        change_percent: number;
    };
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function toNumber(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (value instanceof Decimal) return value.toNumber();
    return new Decimal(String(value)).toNumber();
}

function calculatePercentChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / Math.abs(previous)) * 100;
}

// ==========================================
// GENERATE BALANCE SHEET
// ==========================================

export async function generateBalanceSheet(
    farmId: string,
    asOfDate: string
): Promise<BalanceSheet> {
    const farm = await prisma.farm.findUnique({
        where: { id: farmId },
        select: { name: true, tax_code: true },
    });

    const endDate = new Date(asOfDate);
    const startOfYear = new Date(endDate.getFullYear(), 0, 1);
    const previousYearEnd = new Date(endDate.getFullYear() - 1, 11, 31);

    // ==========================================
    // 1. CURRENT ASSETS (Tài sản ngắn hạn)
    // ==========================================

    // Calculate cash balance from income - expense (CASH payments)
    const cashIncome = await prisma.transaction.aggregate({
        where: {
            farm_id: farmId,
            trans_date: { lte: endDate },
            payment_status: 'PAID',
            payment_method: 'CASH',
            trans_type: { in: ['INCOME', 'SALE', 'CASH_IN'] },
        },
        _sum: { total_amount: true },
    });

    const cashExpense = await prisma.transaction.aggregate({
        where: {
            farm_id: farmId,
            trans_date: { lte: endDate },
            payment_status: 'PAID',
            payment_method: 'CASH',
            trans_type: { in: ['EXPENSE', 'PURCHASE', 'CASH_OUT'] },
        },
        _sum: { total_amount: true },
    });

    const cashBalance = toNumber(cashIncome._sum?.total_amount) - toNumber(cashExpense._sum?.total_amount);

    // Bank transactions (TK 112)
    const bankIncome = await prisma.transaction.aggregate({
        where: {
            farm_id: farmId,
            trans_date: { lte: endDate },
            payment_status: 'PAID',
            payment_method: 'BANK_TRANSFER',
            trans_type: { in: ['INCOME', 'SALE', 'CASH_IN'] },
        },
        _sum: { total_amount: true },
    });

    const bankExpense = await prisma.transaction.aggregate({
        where: {
            farm_id: farmId,
            trans_date: { lte: endDate },
            payment_status: 'PAID',
            payment_method: 'BANK_TRANSFER',
            trans_type: { in: ['EXPENSE', 'PURCHASE', 'CASH_OUT'] },
        },
        _sum: { total_amount: true },
    });

    const bankBalance = toNumber(bankIncome._sum?.total_amount) - toNumber(bankExpense._sum?.total_amount);

    // Accounts Receivable (TK 131) - using ARTransaction model
    const receivables = await prisma.aRTransaction.aggregate({
        where: {
            farm_id: farmId,
            trans_date: { lte: endDate },
            status: { not: 'PAID' },
        },
        _sum: { balance: true },
    });

    const receivablesAmount = toNumber(receivables._sum?.balance);

    // Inventory (TK 152, 155, 156)
    const products = await prisma.product.findMany({
        where: {
            farm_id: farmId,
            deleted_at: null,
        },
        select: {
            stock_qty: true,
            avg_cost: true,
        },
    });

    const inventoryValue = products.reduce((sum, p) => {
        return sum + toNumber(p.stock_qty) * toNumber(p.avg_cost);
    }, 0);

    const currentAssets: BalanceSheetSection = {
        label: 'Tài sản ngắn hạn',
        code: '100',
        amount: Math.max(0, cashBalance) + Math.max(0, bankBalance) + receivablesAmount + inventoryValue,
        items: [
            { label: 'Tiền mặt', code: '111', amount: Math.max(0, cashBalance) },
            { label: 'Tiền gửi ngân hàng', code: '112', amount: Math.max(0, bankBalance) },
            { label: 'Phải thu khách hàng', code: '131', amount: receivablesAmount },
            { label: 'Hàng tồn kho', code: '152', amount: inventoryValue },
        ],
    };

    // ==========================================
    // 2. FIXED ASSETS (Tài sản cố định)
    // ==========================================

    const assets = await prisma.asset.findMany({
        where: {
            farm_id: farmId,
            status: 'ACTIVE',
            purchase_date: { lte: endDate },
        },
        select: {
            original_cost: true,
            accumulated_depreciation: true,
            book_value: true,
        },
    });

    const originalCost = assets.reduce((sum, a) => sum + toNumber(a.original_cost), 0);
    const accumulatedDepreciation = assets.reduce((sum, a) => sum + toNumber(a.accumulated_depreciation), 0);
    const bookValue = assets.reduce((sum, a) => sum + toNumber(a.book_value), 0);

    const fixedAssets: BalanceSheetSection = {
        label: 'Tài sản cố định',
        code: '200',
        amount: bookValue,
        items: [
            { label: 'Nguyên giá TSCĐ', code: '211', amount: originalCost },
            { label: 'Hao mòn lũy kế', code: '214', amount: -accumulatedDepreciation },
        ],
    };

    const totalAssets = currentAssets.amount + fixedAssets.amount;

    // ==========================================
    // 3. LIABILITIES (Nợ phải trả)
    // ==========================================

    // Accounts Payable (TK 331) - using APTransaction model
    const payables = await prisma.aPTransaction.aggregate({
        where: {
            farm_id: farmId,
            trans_date: { lte: endDate },
            status: { not: 'PAID' },
        },
        _sum: { balance: true },
    });

    const payablesAmount = toNumber(payables._sum?.balance);

    // Taxes Payable (from CIT calculations for current year)
    const yearStart = `${endDate.getFullYear()}`;
    const citCalculations = await prisma.cITCalculation.findMany({
        where: {
            farm_id: farmId,
            period: { startsWith: yearStart },
        },
        select: { cit_amount: true },
    });

    const taxesPayable = citCalculations.reduce((sum, c) => sum + toNumber(c.cit_amount), 0);

    // Salary Payable (unpaid payrolls)
    const unpaidPayrolls = await prisma.payroll.aggregate({
        where: {
            farm_id: farmId,
            period_end: { lte: endDate },
            status: 'DRAFT',
        },
        _sum: { total_net: true },
    });

    const salaryPayable = toNumber(unpaidPayrolls._sum?.total_net);

    const currentLiabilities: BalanceSheetSection = {
        label: 'Nợ ngắn hạn',
        code: '300',
        amount: payablesAmount + taxesPayable + salaryPayable,
        items: [
            { label: 'Phải trả nhà cung cấp', code: '331', amount: payablesAmount },
            { label: 'Thuế phải nộp', code: '333', amount: taxesPayable },
            { label: 'Phải trả người lao động', code: '334', amount: salaryPayable },
        ],
    };

    const longTermLiabilities: BalanceSheetSection = {
        label: 'Nợ dài hạn',
        code: '330',
        amount: 0,
        items: [],
    };

    const totalLiabilities = currentLiabilities.amount + longTermLiabilities.amount;

    // ==========================================
    // 4. EQUITY (Vốn chủ sở hữu)
    // ==========================================

    // Calculate cumulative profit as equity (no initial_capital field)
    // Retained earnings = all profits from previous years
    const previousYearsProfitResult = await calculatePeriodProfit(
        farmId,
        new Date('2000-01-01'),
        previousYearEnd
    );
    const retainedEarnings = previousYearsProfitResult;

    // Current year profit
    const currentYearProfit = await calculatePeriodProfit(
        farmId,
        startOfYear,
        endDate
    );

    // Capital = Total Assets - Liabilities - Accumulated Profits
    // (Balancing figure)
    const calculatedCapital = totalAssets - totalLiabilities - retainedEarnings - currentYearProfit;
    const capital = Math.max(0, calculatedCapital);

    const totalEquity = capital + retainedEarnings + currentYearProfit;
    const totalLiabilitiesEquity = totalLiabilities + totalEquity;

    // ==========================================
    // 5. YEAR-OVER-YEAR COMPARISON
    // ==========================================

    let comparison: BalanceSheet['comparison'];
    // Skip comparison for recursive calls to avoid infinite loop
    const isRecursiveCall = asOfDate === previousYearEnd.toISOString().split('T')[0];
    if (!isRecursiveCall && previousYearEnd.getFullYear() >= 2020) {
        try {
            const previousYear = await generateBalanceSheet(
                farmId,
                previousYearEnd.toISOString().split('T')[0]
            );
            comparison = {
                previous_date: previousYearEnd.toISOString().split('T')[0],
                total_assets_previous: previousYear.total_assets,
                total_liabilities_equity_previous: previousYear.total_liabilities_equity,
                assets_change_percent: calculatePercentChange(totalAssets, previousYear.total_assets),
            };
        } catch {
            // Skip comparison if previous year data not available
        }
    }

    return {
        as_of_date: asOfDate,
        farm_name: farm?.name || '',
        farm_tax_code: farm?.tax_code || undefined,
        generated_at: new Date().toISOString(),

        assets: {
            current: currentAssets,
            fixed: fixedAssets,
            total: totalAssets,
        },

        liabilities: {
            current: currentLiabilities,
            long_term: longTermLiabilities,
            total: totalLiabilities,
        },

        equity: {
            capital,
            retained_earnings: retainedEarnings,
            current_year_profit: currentYearProfit,
            total: totalEquity,
        },

        total_assets: totalAssets,
        total_liabilities_equity: totalLiabilitiesEquity,
        is_balanced: Math.abs(totalAssets - totalLiabilitiesEquity) < 1, // Allow 1đ rounding error

        comparison,
    };
}

// ==========================================
// CALCULATE PERIOD PROFIT (Helper)
// ==========================================

async function calculatePeriodProfit(
    farmId: string,
    fromDate: Date,
    toDate: Date
): Promise<number> {
    // Revenue
    const revenue = await prisma.transaction.aggregate({
        where: {
            farm_id: farmId,
            trans_date: { gte: fromDate, lte: toDate },
            payment_status: 'PAID',
            trans_type: { in: ['INCOME', 'SALE'] },
        },
        _sum: { total_amount: true },
    });

    // Expenses
    const expenses = await prisma.transaction.aggregate({
        where: {
            farm_id: farmId,
            trans_date: { gte: fromDate, lte: toDate },
            payment_status: 'PAID',
            trans_type: { in: ['EXPENSE', 'PURCHASE'] },
        },
        _sum: { total_amount: true },
    });

    return toNumber(revenue._sum?.total_amount) - toNumber(expenses._sum?.total_amount);
}

// ==========================================
// GENERATE INCOME STATEMENT
// ==========================================

export async function generateIncomeStatement(
    farmId: string,
    fromDate: string,
    toDate: string
): Promise<IncomeStatement> {
    const farm = await prisma.farm.findUnique({
        where: { id: farmId },
        select: { name: true, tax_code: true },
    });

    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);

    // ==========================================
    // 1. REVENUE (Doanh thu)
    // ==========================================

    // Sales revenue (SALE transactions)
    const salesRevenue = await prisma.transaction.aggregate({
        where: {
            farm_id: farmId,
            trans_date: { gte: startDate, lte: endDate },
            payment_status: 'PAID',
            trans_type: 'SALE',
        },
        _sum: { total_amount: true },
    });

    // Other income (INCOME, CASH_IN transactions)
    const otherIncome = await prisma.transaction.aggregate({
        where: {
            farm_id: farmId,
            trans_date: { gte: startDate, lte: endDate },
            payment_status: 'PAID',
            trans_type: { in: ['INCOME', 'CASH_IN'] },
        },
        _sum: { total_amount: true },
    });

    const sales = toNumber(salesRevenue._sum?.total_amount);
    const other = toNumber(otherIncome._sum?.total_amount);
    const totalRevenue = sales + other;

    // ==========================================
    // 2. COST OF GOODS SOLD (Giá vốn hàng bán)
    // ==========================================

    // COGS = Purchase transactions (product-related)
    const cogsResult = await prisma.transaction.aggregate({
        where: {
            farm_id: farmId,
            trans_date: { gte: startDate, lte: endDate },
            payment_status: 'PAID',
            trans_type: 'PURCHASE',
        },
        _sum: { total_amount: true },
    });

    const cogs = toNumber(cogsResult._sum?.total_amount);

    // ==========================================
    // 3. GROSS PROFIT
    // ==========================================

    const grossProfit = totalRevenue - cogs;

    // ==========================================
    // 4. OPERATING EXPENSES
    // ==========================================

    // Get all expense transactions with categories
    const expenseTransactions = await prisma.transaction.findMany({
        where: {
            farm_id: farmId,
            trans_date: { gte: startDate, lte: endDate },
            payment_status: 'PAID',
            trans_type: { in: ['EXPENSE', 'CASH_OUT'] },
        },
        select: {
            total_amount: true,
            expense_type: true,
            description: true,
        },
    });

    // Categorize expenses
    let sellingExpenses = 0;
    let adminExpenses = 0;
    let otherExpenses = 0;

    expenseTransactions.forEach((tx) => {
        const amount = toNumber(tx.total_amount);
        const desc = (tx.description || '').toLowerCase();

        // Simple categorization based on description keywords
        if (desc.includes('bán hàng') || desc.includes('vận chuyển') || desc.includes('marketing')) {
            sellingExpenses += amount;
        } else if (desc.includes('quản lý') || desc.includes('văn phòng') || desc.includes('lương')) {
            adminExpenses += amount;
        } else {
            otherExpenses += amount;
        }
    });

    // Depreciation from assets (DepreciationSchedule model)
    const startPeriod = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
    const endPeriod = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;

    const depreciationResult = await prisma.depreciationSchedule.aggregate({
        where: {
            asset: { farm_id: farmId },
            period: {
                gte: startPeriod,
                lte: endPeriod,
            },
        },
        _sum: { depreciation_amount: true },
    });

    const depreciation = toNumber(depreciationResult._sum?.depreciation_amount);

    const totalOperatingExpenses = sellingExpenses + adminExpenses + depreciation + otherExpenses;

    // ==========================================
    // 5. OPERATING INCOME
    // ==========================================

    const operatingIncome = grossProfit - totalOperatingExpenses;

    // ==========================================
    // 6. FINANCIAL INCOME/EXPENSE
    // ==========================================

    // Financial income (interest, etc.)
    const financialIncomeResult = await prisma.transaction.aggregate({
        where: {
            farm_id: farmId,
            trans_date: { gte: startDate, lte: endDate },
            payment_status: 'PAID',
            trans_type: { in: ['INCOME', 'CASH_IN'] },
            description: { contains: 'lãi', mode: 'insensitive' },
        },
        _sum: { total_amount: true },
    });

    // Financial expense (interest expense)
    const financialExpenseResult = await prisma.transaction.aggregate({
        where: {
            farm_id: farmId,
            trans_date: { gte: startDate, lte: endDate },
            payment_status: 'PAID',
            trans_type: { in: ['EXPENSE', 'CASH_OUT'] },
            description: { contains: 'lãi vay', mode: 'insensitive' },
        },
        _sum: { total_amount: true },
    });

    const financialIncome = toNumber(financialIncomeResult._sum?.total_amount);
    const financialExpense = toNumber(financialExpenseResult._sum?.total_amount);
    const netFinancial = financialIncome - financialExpense;

    // ==========================================
    // 7. PROFIT BEFORE TAX
    // ==========================================

    const profitBeforeTax = operatingIncome + netFinancial;

    // ==========================================
    // 8. TAX (from CIT calculations)
    // ==========================================

    const year = endDate.getFullYear();
    const quarters = getQuartersInRange(startDate, endDate);
    const periodPatterns = quarters.map((q) => `${year}-Q${q}`);

    const citCalculations = await prisma.cITCalculation.findMany({
        where: {
            farm_id: farmId,
            period: { in: periodPatterns },
        },
        select: { cit_amount: true },
    });

    const tax = citCalculations.reduce((sum, c) => sum + toNumber(c.cit_amount), 0);

    // ==========================================
    // 9. NET PROFIT
    // ==========================================

    const netProfit = profitBeforeTax - tax;

    // ==========================================
    // 10. RATIOS
    // ==========================================

    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const operatingMargin = totalRevenue > 0 ? (operatingIncome / totalRevenue) * 100 : 0;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // ==========================================
    // 11. YEAR-OVER-YEAR COMPARISON
    // ==========================================

    let comparison: IncomeStatement['comparison'];

    // Calculate previous period (same duration, 1 year ago)
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const previousEndDate = new Date(startDate);
    previousEndDate.setDate(previousEndDate.getDate() - 1);
    const previousStartDate = new Date(previousEndDate);
    previousStartDate.setDate(previousStartDate.getDate() - periodDays + 1);

    if (previousStartDate.getFullYear() >= 2020) {
        try {
            const previousStatement = await generateIncomeStatement(
                farmId,
                previousStartDate.toISOString().split('T')[0],
                previousEndDate.toISOString().split('T')[0]
            );

            comparison = {
                previous_period: {
                    from: previousStartDate.toISOString().split('T')[0],
                    to: previousEndDate.toISOString().split('T')[0],
                },
                previous_net_profit: previousStatement.net_profit,
                change_amount: netProfit - previousStatement.net_profit,
                change_percent: calculatePercentChange(netProfit, previousStatement.net_profit),
            };
        } catch {
            // Skip comparison if previous period data not available
        }
    }

    return {
        period: { from: fromDate, to: toDate },
        farm_name: farm?.name || '',
        farm_tax_code: farm?.tax_code || undefined,
        generated_at: new Date().toISOString(),

        revenue: {
            sales,
            other_income: other,
            total: totalRevenue,
        },

        cost_of_goods_sold: cogs,
        gross_profit: grossProfit,

        operating_expenses: {
            selling: sellingExpenses,
            admin: adminExpenses,
            depreciation,
            other: otherExpenses,
            total: totalOperatingExpenses,
        },

        operating_income: operatingIncome,

        financial: {
            income: financialIncome,
            expense: financialExpense,
            net: netFinancial,
        },

        profit_before_tax: profitBeforeTax,
        tax,
        net_profit: netProfit,

        ratios: {
            gross_margin: Math.round(grossMargin * 100) / 100,
            operating_margin: Math.round(operatingMargin * 100) / 100,
            net_margin: Math.round(netMargin * 100) / 100,
        },

        comparison,
    };
}

// ==========================================
// HELPER: Get quarters in date range
// ==========================================

function getQuartersInRange(startDate: Date, endDate: Date): number[] {
    const quarters: number[] = [];
    const startQ = Math.ceil((startDate.getMonth() + 1) / 3);
    const endQ = Math.ceil((endDate.getMonth() + 1) / 3);

    for (let q = startQ; q <= endQ; q++) {
        quarters.push(q);
    }

    return quarters;
}

// ==========================================
// CONVENIENCE WRAPPERS (use current farm context)
// ==========================================

export async function getBalanceSheet(asOfDate: string): Promise<BalanceSheet> {
    const farmId = getCurrentFarmId();
    return generateBalanceSheet(farmId, asOfDate);
}

export async function getIncomeStatement(
    fromDate: string,
    toDate: string
): Promise<IncomeStatement> {
    const farmId = getCurrentFarmId();
    return generateIncomeStatement(farmId, fromDate, toDate);
}
