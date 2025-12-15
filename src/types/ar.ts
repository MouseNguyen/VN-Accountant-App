// src/types/ar.ts
// Types for Accounts Receivable (Công nợ phải thu)

import type { ARTransactionType, ARAPStatus, PaymentMethod } from '@prisma/client';

// ==========================================
// AR TRANSACTION
// ==========================================

export interface ARTransaction {
    id: string;
    farm_id: string;

    customer_id: string;
    customer?: {
        id: string;
        code: string;
        name: string;
        phone?: string | null;
        email?: string | null;
        credit_limit?: number;
        credit_used?: number;
    };

    type: ARTransactionType;
    code: string;
    trans_date: string;

    amount: number;
    paid_amount: number;
    balance: number;

    due_date: string | null;
    days_overdue: number;
    status: ARAPStatus;

    transaction_id: string | null;
    description: string | null;
    notes: string | null;

    created_at: string;
    updated_at: string;

    // Payments allocated to this invoice
    payments?: ARPaymentAllocation[];
}

export interface ARPaymentAllocation {
    id: string;
    ar_transaction_id: string;
    payment_id: string;
    amount: number;
    allocated_at: string;
}

// ==========================================
// LIST PARAMS & RESPONSE
// ==========================================

export interface ARListParams {
    page?: number;
    limit?: number;
    customer_id?: string;
    type?: ARTransactionType;
    status?: ARAPStatus;
    date_from?: string;
    date_to?: string;
    overdue_only?: boolean;
    search?: string;
    sort_by?: 'trans_date' | 'due_date' | 'amount' | 'balance';
    sort_order?: 'asc' | 'desc';
}

export interface ARListResponse {
    items: ARTransaction[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    summary: {
        total_receivable: number;
        total_overdue: number;
        total_paid_this_month: number;
    };
}

// ==========================================
// CREATE AR (TỪ BÁN HÀNG)
// ==========================================

export interface CreateARInput {
    customer_id: string;
    amount: number;
    trans_date: string;
    due_date?: string;
    description?: string;
    transaction_id?: string;
}

// ==========================================
// COLLECT PAYMENT (THU TIỀN)
// ==========================================

export interface CollectPaymentInput {
    customer_id: string;
    amount: number;
    payment_date: string;

    // Phương thức
    payment_method: PaymentMethod;

    // Phân bổ vào invoices (nếu chỉ định)
    invoice_ids?: string[];

    // Tự động phân bổ FIFO nếu không chỉ định
    auto_allocate?: boolean;

    notes?: string;
}

export interface CollectPaymentResponse {
    payment_id: string;
    payment_code: string;
    amount: number;

    allocations: Array<{
        invoice_id: string;
        invoice_code: string;
        amount_allocated: number;
        remaining_balance: number;
        status: ARAPStatus;
    }>;

    customer: {
        id: string;
        name: string;
        new_balance: number;
    };
}

// ==========================================
// MANUAL ALLOCATION
// ==========================================

export interface AllocatePaymentInput {
    payment_id: string;
    allocations: Array<{
        invoice_id: string;
        amount: number;
    }>;
}

// ==========================================
// AGING REPORT
// ==========================================

export interface ARAgingItem {
    customer_id: string;
    customer_code: string;
    customer_name: string;

    total_balance: number;

    // Phân theo tuổi nợ
    current: number; // Chưa đến hạn
    days_1_30: number; // 1-30 ngày quá hạn
    days_31_60: number; // 31-60 ngày
    days_61_90: number; // 61-90 ngày
    over_90: number; // >90 ngày
}

export interface ARAgingReport {
    as_of_date: string;
    items: ARAgingItem[];
    totals: {
        total_balance: number;
        current: number;
        days_1_30: number;
        days_31_60: number;
        days_61_90: number;
        over_90: number;
    };
    generated_at: string;
}

// ==========================================
// CUSTOMER AR SUMMARY
// ==========================================

export interface CustomerARSummary {
    customer_id: string;
    customer_name: string;

    // Credit
    credit_limit: number;
    credit_used: number;
    credit_available: number;
    credit_utilization_percent: number;

    // Balance
    total_invoices: number;
    total_amount: number;
    total_paid: number;
    total_balance: number;

    // Overdue
    overdue_amount: number;
    overdue_count: number;
    oldest_overdue_days: number;

    // Activity
    last_invoice_date?: string;
    last_payment_date?: string;
    avg_days_to_pay: number;

    // Recent transactions
    recent_invoices: ARTransaction[];
    recent_payments: ARTransaction[];
}

// ==========================================
// AR SUMMARY FOR DASHBOARD
// ==========================================

export interface ARSummary {
    total_receivable: number;
    total_overdue: number;
    overdue_count: number;
    total_customers_with_debt: number;
    collected_this_month: number;
}
