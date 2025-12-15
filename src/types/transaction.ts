// src/types/transaction.ts
// Shared types cho Transaction module

import type { TransactionType, PaymentMethod, PaymentStatus, PartnerType } from '@prisma/client';

// Re-export enums for convenience
export type { TransactionType, PaymentMethod, PaymentStatus };

// ==========================================
// TRANSACTION TYPES
// ==========================================

export interface TransactionPartner {
    id: string;
    code: string;
    name: string;
    partner_type: PartnerType;
    phone?: string | null;
}

export interface TransactionProduct {
    id: string;
    code: string;
    name: string;
    unit: string;
}

export interface TransactionItem {
    id: string;
    product_id?: string | null;
    product?: TransactionProduct | null;
    description?: string | null;
    quantity: number;
    unit: string;
    unit_price: number;
    unit_cost: number;
    tax_rate: number;
    tax_amount: number;
    discount_percent: number;
    discount_amount: number;
    line_total: number;
}

export interface Transaction {
    id: string;
    code: string;
    trans_type: TransactionType;
    trans_date: string; // ISO string

    partner_id?: string | null;
    partner?: TransactionPartner | null;

    description?: string | null;

    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;

    paid_amount: number;
    payment_method: PaymentMethod;
    payment_status: PaymentStatus;
    payment_note?: string | null;

    items: TransactionItem[];

    version: number;
    created_at: string;
    updated_at?: string;
    created_by?: string | null;
}

// ==========================================
// API REQUEST/RESPONSE TYPES
// ==========================================

export interface CreateTransactionItemInput {
    product_id?: string | null;
    description?: string | null;
    quantity: number;
    unit?: string;
    unit_price: number;
    tax_rate?: number;
    discount_percent?: number;
}

export interface CreateTransactionInput {
    trans_type: TransactionType;
    trans_date?: string;
    partner_id?: string | null;
    description?: string | null;
    items: CreateTransactionItemInput[];
    payment_method?: PaymentMethod;
    paid_amount?: number;
    payment_note?: string | null;
    discount_amount?: number;
}

export interface UpdateTransactionInput {
    version: number;
    trans_date?: string;
    partner_id?: string | null;
    description?: string | null;
    items?: CreateTransactionItemInput[];
    payment_method?: PaymentMethod;
    paid_amount?: number;
    payment_note?: string | null;
    discount_amount?: number;
}

export interface AddPaymentInput {
    amount: number;
    payment_method?: PaymentMethod;
    note?: string;
}

// ==========================================
// LIST & QUERY TYPES
// ==========================================

export interface TransactionListParams {
    page?: number;
    limit?: number;
    search?: string;
    trans_type?: TransactionType;
    payment_status?: PaymentStatus;
    partner_id?: string;
    date_from?: string; // YYYY-MM-DD
    date_to?: string;   // YYYY-MM-DD
    sort_by?: 'trans_date' | 'code' | 'total_amount' | 'created_at';
    sort_order?: 'asc' | 'desc';
}

export interface TransactionSummary {
    total_income: number;
    total_expense: number;
    net: number;
}

export interface TransactionListResponse {
    items: Transaction[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    summary: TransactionSummary;
}

// ==========================================
// SUMMARY & REPORT TYPES
// ==========================================

export interface PeriodSummary {
    period: string;
    income: number;
    expense: number;
    net: number;
    transaction_count: number;
}

export interface DailySummary {
    date: string; // YYYY-MM-DD
    income: number;
    expense: number;
    net: number;
}

// ==========================================
// UI HELPER TYPES
// ==========================================

export interface TransactionFormItem {
    id: string; // Temporary ID for React key
    product_id?: string | null;
    product_name?: string; // For display
    description?: string | null;
    quantity: number;
    unit: string;
    unit_price: number;
    tax_rate: number;
    discount_percent: number;
    line_total: number;
}

export interface TransactionFormData {
    trans_type: TransactionType;
    trans_date: Date;
    partner_id?: string | null;
    description?: string | null;
    items: TransactionFormItem[];
    payment_method: PaymentMethod;
    paid_amount: number;
    payment_note?: string | null;
    discount_amount: number;
}

// ==========================================
// CONSTANTS
// ==========================================

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
    INCOME: 'Phiếu thu',
    EXPENSE: 'Phiếu chi',
    CASH_IN: 'Thu tiền mặt',
    CASH_OUT: 'Chi tiền mặt',
    SALE: 'Bán hàng',
    PURCHASE: 'Mua hàng',
    TRANSFER: 'Chuyển khoản',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
    CASH: 'Tiền mặt',
    BANK_TRANSFER: 'Chuyển khoản',
    MOMO: 'MoMo',
    ZALO_PAY: 'ZaloPay',
    CREDIT: 'Công nợ',
    OTHER: 'Khác',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
    PENDING: 'Chưa thanh toán',
    UNPAID: 'Chưa thanh toán',
    PARTIAL: 'Thanh toán một phần',
    PAID: 'Đã thanh toán',
    CANCELLED: 'Đã hủy',
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    UNPAID: 'bg-yellow-100 text-yellow-800',
    PARTIAL: 'bg-blue-100 text-blue-800',
    PAID: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
};
