// src/types/payable.ts
// Types cho Công nợ module

import type { PartnerType, PaymentMethod } from '@prisma/client';

// ==========================================
// CÔNG NỢ PARTNER
// ==========================================

export interface PartnerPayable {
    // ID fields (aliases for frontend convenience)
    id: string;
    partner_id: string; // alias of id
    code: string;
    partner_code: string; // alias of code
    name: string;
    partner_name: string; // alias of name
    partner_type: PartnerType;
    phone?: string | null;

    balance: number;
    credit_limit: number | null;
    payment_term_days: number;

    // Thống kê
    total_transactions: number;
    unpaid_transactions: number; // Số hóa đơn chưa TT hết
    unpaid_invoice_count: number; // alias of unpaid_transactions
    oldest_unpaid_date?: string | null;
    overdue_days: number;
    overdue_balance: number; // Số tiền quá hạn
    is_overdue: boolean;

    // Chi tiết hóa đơn chưa TT (cho drill-down)
    unpaid_invoices?: UnpaidInvoice[];
}

export interface UnpaidInvoice {
    transaction_id: string;
    code: string | null;  // Transaction code (can be null)
    trans_date: string;
    total_amount: number;
    paid_amount: number;
    remaining: number;
    due_date: string;
    overdue_days: number;
}

// ==========================================
// LỊCH SỬ THANH TOÁN
// ==========================================

export interface PaymentHistory {
    id: string;
    partner_id: string;
    partner?: {
        id: string;
        code: string;
        name: string;
        partner_type: PartnerType;
    };

    amount: number;
    payment_method: PaymentMethod;
    payment_date: string;
    note?: string | null;

    balance_before: number;
    balance_after: number;

    // FIFO Allocations
    allocations?: PaymentAllocationItem[];

    created_at: string;
}

export interface PaymentAllocationItem {
    transaction_id: string;
    transaction_code: string | null;  // Can be null
    amount: number;
    transaction_paid_before: number;
    transaction_paid_after: number;
}

// ==========================================
// REQUEST/RESPONSE
// ==========================================

export interface PayableListParams {
    page?: number;
    limit?: number;
    partner_type?: 'CUSTOMER' | 'VENDOR';
    search?: string;
    is_overdue?: boolean;
    min_balance?: number;
    include_invoices?: boolean; // Có load chi tiết hóa đơn không
    sort_by?: 'balance' | 'name' | 'overdue_days';
    sort_order?: 'asc' | 'desc';
}

export interface PayableListResponse {
    items: PartnerPayable[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    summary: {
        total_balance: number;
        total_overdue: number;
        total_current: number;
        partner_count: number;
        total_receivable: number;
        total_payable: number;
        overdue_count: number;
        overdue_amount: number;
    };
}

export interface PaymentHistoryParams {
    partner_id?: string;
    page?: number;
    limit?: number;
    date_from?: string;
    date_to?: string;
}

export interface PaymentHistoryResponse {
    items: PaymentHistory[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

// ==========================================
// THANH TOÁN CÔNG NỢ
// ==========================================

export interface PayDebtInput {
    partner_id: string;
    amount: number;
    payment_method?: PaymentMethod;
    payment_date?: string;
    note?: string;
}

export interface BulkPayDebtInput {
    payments: Array<{
        partner_id: string;
        amount: number;
    }>;
    payment_method?: PaymentMethod;
    payment_date?: string;
    note?: string;
}

export interface PayDebtResult {
    payment_id: string;
    partner_id: string;
    amount: number;
    balance_before: number;
    balance_after: number;
    allocations: PaymentAllocationItem[];
}

// ==========================================
// ERROR CODES
// ==========================================

export const PayableErrorCodes = {
    PARTNER_NOT_FOUND: 'PARTNER_NOT_FOUND',
    NO_OUTSTANDING_DEBT: 'NO_OUTSTANDING_DEBT',
    AMOUNT_EXCEEDS_BALANCE: 'AMOUNT_EXCEEDS_BALANCE',
    CREDIT_LIMIT_EXCEEDED: 'CREDIT_LIMIT_EXCEEDED',
    CONCURRENT_MODIFICATION: 'CONCURRENT_MODIFICATION',
} as const;

// ==========================================
// TYPE ALIASES cho hooks
// ==========================================

// Query types (aliases for hook compatibility)
export type PayableQuery = PayableListParams & {
    farm_id?: string;
    status?: 'all' | 'current' | 'overdue' | 'warning';
};

export type PaymentHistoryQuery = PaymentHistoryParams & {
    farm_id?: string;
    start_date?: string;
    end_date?: string;
};

// Request/Response aliases for hooks
export type PayDebtRequest = PayDebtInput;
export type PayDebtResponse = PayDebtResult;

export interface BulkPayDebtRequest extends BulkPayDebtInput { }

export interface BulkPayDebtResponse {
    success_count: number;
    failed_count: number;
    total: number;
    results: Array<{
        partner_id: string;
        success: boolean;
        error?: string;
        result?: PayDebtResult;
    }>;
}

export interface UpdateCreditLimitRequest {
    partner_id: string;
    credit_limit: number;
    payment_term_days?: number;
}

