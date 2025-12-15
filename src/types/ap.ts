// src/types/ap.ts
// AP (Accounts Payable) - Công nợ Phải trả

import { APTransactionType, ARAPStatus } from '@prisma/client';

// ==========================================
// AP TRANSACTION
// ==========================================

export interface APTransaction {
    id: string;
    farm_id: string;

    vendor_id: string;
    vendor?: {
        id: string;
        code: string;
        name: string;
        phone?: string;
        email?: string;
        bank_account?: string;
        bank_name?: string;
    };

    type: APTransactionType;
    code: string;
    trans_date: string;

    amount: number;
    paid_amount: number;
    balance: number;

    due_date?: string | null;
    days_overdue: number;
    status: ARAPStatus;

    transaction_id?: string | null;
    description?: string | null;
    notes?: string | null;

    created_at: string;
    updated_at: string;

    payments?: APPaymentAllocation[];
}

export interface APPaymentAllocation {
    id: string;
    ap_transaction_id: string;
    payment_id: string;
    amount: number;
    allocated_at: string;
}

// ==========================================
// LIST PARAMS & RESPONSE
// ==========================================

export interface APListParams {
    page?: number;
    limit?: number;
    vendor_id?: string;
    type?: APTransactionType;
    status?: ARAPStatus;
    date_from?: string;
    date_to?: string;
    overdue_only?: boolean;
    search?: string;
    sort_by?: 'trans_date' | 'due_date' | 'amount' | 'balance';
    sort_order?: 'asc' | 'desc';
}

export interface APListResponse {
    items: APTransaction[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    summary: {
        total_payable: number;
        total_overdue: number;
        total_paid_this_month: number;
    };
}

// ==========================================
// CREATE AP (TỪ MUA HÀNG)
// ==========================================

export interface CreateAPInput {
    vendor_id: string;
    amount: number;
    trans_date: string;
    due_date?: string;
    description?: string;
    transaction_id?: string;
}

// ==========================================
// MAKE PAYMENT (TRẢ TIỀN)
// ==========================================

export interface MakePaymentInput {
    vendor_id: string;
    amount: number;
    payment_date: string;

    payment_method: 'CASH' | 'BANK';
    account_id: string;

    invoice_ids?: string[];
    auto_allocate?: boolean;

    notes?: string;
}

export interface MakePaymentResponse {
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

    vendor: {
        id: string;
        name: string;
        new_balance: number;
    };
}

// ==========================================
// AGING REPORT
// ==========================================

export interface APAgingItem {
    vendor_id: string;
    vendor_code: string;
    vendor_name: string;

    total_balance: number;

    current: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    over_90: number;
}

export interface APAgingReport {
    as_of_date: string;
    items: APAgingItem[];
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
// PAYMENT SCHEDULE
// ==========================================

export interface PaymentScheduleItem {
    invoice_id: string;
    invoice_code: string;
    vendor_id: string;
    vendor_name: string;

    amount: number;
    balance: number;
    due_date: string;
    days_until_due: number; // Âm nếu quá hạn

    priority: 'high' | 'medium' | 'low';
}

export interface PaymentSchedule {
    // Phân theo tuần
    this_week: PaymentScheduleItem[];
    next_week: PaymentScheduleItem[];
    this_month: PaymentScheduleItem[];
    later: PaymentScheduleItem[];
    overdue: PaymentScheduleItem[];

    summary: {
        overdue_amount: number;
        this_week_amount: number;
        next_week_amount: number;
        this_month_amount: number;
    };

    generated_at: string;
}

// ==========================================
// CASH FLOW FORECAST
// ==========================================

export interface CashFlowForecastDay {
    date: string;

    // Thu
    expected_income: number; // Từ AR due

    // Chi
    expected_expense: number; // Từ AP due
    payroll_due: number; // Lương phải trả

    // Số dư
    opening_balance: number;
    closing_balance: number;

    // Cảnh báo
    is_negative: boolean;
}

export interface CashFlowForecast {
    from_date: string;
    to_date: string;

    current_balance: number;

    daily_forecast: CashFlowForecastDay[];

    summary: {
        total_expected_income: number;
        total_expected_expense: number;
        min_balance: number;
        min_balance_date: string;
        days_with_negative_balance: number;
    };

    generated_at: string;
}

// ==========================================
// AP SUMMARY (Dashboard)
// ==========================================

export interface APSummary {
    total_payable: number;
    total_overdue: number;
    due_soon_count: number; // Đến hạn trong 7 ngày
    vendor_count: number; // Số NCC đang nợ
}
