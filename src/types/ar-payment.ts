// src/types/ar-payment.ts
// AR Payment Types - Phase 4 Task 4

export interface ARPayment {
    id: string;
    farm_id: string;
    payment_number: string;
    payment_date: string;
    customer_id: string;
    customer_name?: string;
    payment_method: string;
    amount: number;
    allocated_amount: number;
    unallocated_amount: number;
    status: 'DRAFT' | 'POSTED' | 'VOID';
    posted_at?: string;
    posted_by?: string;
    bank_account_id?: string;
    reference?: string;
    notes?: string;
    journal_entry_id?: string;
    created_at: string;
    updated_at: string;
    created_by?: string;
    allocations?: ARPaymentAllocation[];
}

export interface ARPaymentAllocation {
    id: string;
    farm_id: string;
    payment_id: string;
    invoice_id: string;
    amount: number;
    allocated_at: string;
    invoice_number?: string;
    invoice_total?: number;
}

export interface ARPaymentListParams {
    page?: number;
    limit?: number;
    status?: string;
    customer_id?: string;
    from_date?: string;
    to_date?: string;
    search?: string;
}

export interface ARPaymentListResponse {
    items: ARPayment[];
    total: number;
    page: number;
    limit: number;
    summary: {
        total_payments: number;
        total_amount: number;
        total_allocated: number;
        total_unallocated: number;
    };
}

export interface CreateARPaymentInput {
    farm_id: string;
    customer_id: string;
    payment_date: string;
    payment_method: 'CASH' | 'BANK_TRANSFER' | 'CREDIT';
    amount: number;
    bank_account_id?: string;
    reference?: string;
    notes?: string;
    created_by?: string;
}

export interface UpdateARPaymentInput {
    payment_date?: string;
    payment_method?: 'CASH' | 'BANK_TRANSFER' | 'CREDIT';
    amount?: number;
    bank_account_id?: string;
    reference?: string;
    notes?: string;
}

export interface AllocatePaymentInput {
    allocations: {
        invoice_id: string;
        amount: number;
    }[];
}
