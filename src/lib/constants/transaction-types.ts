// src/lib/constants/transaction-types.ts
// Centralized transaction type constants to prevent filtering bugs
// See: Docs/BUG_REPORT_20251216.md for context

/**
 * Transaction types that represent Accounts Receivable (Công nợ phải thu)
 * - SALE: Sales transactions (Bán hàng)
 * - INCOME: Other income (Thu nhập khác)
 */
export const AR_TRANSACTION_TYPES = ['SALE', 'INCOME'] as const;

/**
 * Transaction types that represent Accounts Payable (Công nợ phải trả)
 * - PURCHASE: Purchase transactions (Mua hàng)
 * - EXPENSE: Operating expenses (Chi phí)
 */
export const AP_TRANSACTION_TYPES = ['PURCHASE', 'EXPENSE'] as const;

/**
 * Transaction types that represent Revenue (Doanh thu)
 * - SALE: Product/service sales
 * - INCOME: Other income sources
 */
export const REVENUE_TYPES = ['SALE', 'INCOME'] as const;

/**
 * Transaction types that represent Costs/Expenses (Chi phí)
 * - PURCHASE: Cost of goods purchased
 * - EXPENSE: Operating expenses
 */
export const COST_TYPES = ['PURCHASE', 'EXPENSE'] as const;

/**
 * Transaction types that represent Cash Inflow
 * - INCOME: Regular income
 * - SALE: Sales revenue
 * - CASH_IN: Direct cash receipts
 */
export const CASH_INFLOW_TYPES = ['INCOME', 'SALE', 'CASH_IN'] as const;

/**
 * Transaction types that represent Cash Outflow
 * - EXPENSE: Operating expenses
 * - PURCHASE: Purchase payments
 * - CASH_OUT: Direct cash disbursements
 */
export const CASH_OUTFLOW_TYPES = ['EXPENSE', 'PURCHASE', 'CASH_OUT'] as const;

/**
 * VAT Output types (VAT bán ra) - subject to output VAT
 */
export const VAT_OUTPUT_TYPES = ['SALE'] as const;

/**
 * VAT Input types (VAT mua vào) - eligible for input VAT credit
 */
export const VAT_INPUT_TYPES = ['PURCHASE', 'EXPENSE'] as const;

// Type definitions for type safety
export type ARTransactionType = (typeof AR_TRANSACTION_TYPES)[number];
export type APTransactionType = (typeof AP_TRANSACTION_TYPES)[number];
export type RevenueType = (typeof REVENUE_TYPES)[number];
export type CostType = (typeof COST_TYPES)[number];
export type CashInflowType = (typeof CASH_INFLOW_TYPES)[number];
export type CashOutflowType = (typeof CASH_OUTFLOW_TYPES)[number];

// Helper functions
export function isARType(type: string): boolean {
    return AR_TRANSACTION_TYPES.includes(type as ARTransactionType);
}

export function isAPType(type: string): boolean {
    return AP_TRANSACTION_TYPES.includes(type as APTransactionType);
}

export function isRevenueType(type: string): boolean {
    return REVENUE_TYPES.includes(type as RevenueType);
}

export function isCostType(type: string): boolean {
    return COST_TYPES.includes(type as CostType);
}

export function isCashInflowType(type: string): boolean {
    return CASH_INFLOW_TYPES.includes(type as CashInflowType);
}

export function isCashOutflowType(type: string): boolean {
    return CASH_OUTFLOW_TYPES.includes(type as CashOutflowType);
}
