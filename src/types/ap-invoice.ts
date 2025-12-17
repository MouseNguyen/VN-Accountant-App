// src/types/ap-invoice.ts
// AP Invoice Types - Phase 4 Task 6

export interface APInvoice {
    id: string;
    farm_id: string;
    invoice_number: string;
    invoice_date: string;
    vendor_id: string;
    vendor_name?: string;
    sub_total: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;
    paid_amount: number;
    balance: number;
    due_date: string;
    payment_term_days: number;
    status: 'DRAFT' | 'POSTED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOID';
    posted_at?: string;
    posted_by?: string;
    description?: string;
    notes?: string;
    journal_entry_id?: string;
    created_at: string;
    updated_at: string;
    created_by?: string;
    lines?: APInvoiceLine[];
}

export interface APInvoiceLine {
    id: string;
    farm_id: string;
    invoice_id: string;
    line_number: number;
    product_id?: string;
    product_name: string;
    unit?: string;
    quantity: number;
    unit_price: number;
    discount: number;
    tax_rate: number;
    sub_total: number;
    tax_amount: number;
    total_amount: number;
}

export interface APInvoiceListParams {
    page?: number;
    limit?: number;
    status?: string;
    vendor_id?: string;
    from_date?: string;
    to_date?: string;
    search?: string;
}

export interface APInvoiceListResponse {
    items: APInvoice[];
    total: number;
    page: number;
    limit: number;
    summary: {
        total_invoices: number;
        total_amount: number;
        total_paid: number;
        total_outstanding: number;
    };
}

export interface CreateAPInvoiceInput {
    farm_id: string;
    vendor_id: string;
    invoice_date: string;
    payment_term_days?: number;
    description?: string;
    notes?: string;
    created_by?: string;
    lines: APInvoiceLineInput[];
}

export interface APInvoiceLineInput {
    product_id?: string;
    product_name: string;
    unit?: string;
    quantity: number;
    unit_price: number;
    discount?: number;
    tax_rate: number;
}

export interface UpdateAPInvoiceInput {
    invoice_date?: string;
    vendor_id?: string;
    payment_term_days?: number;
    description?: string;
    notes?: string;
    lines?: APInvoiceLineInput[];
}

// AP Payment Types
export interface APPayment {
    id: string;
    farm_id: string;
    payment_number: string;
    payment_date: string;
    vendor_id: string;
    vendor_name?: string;
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
    allocations?: APPaymentAllocation[];
}

export interface APPaymentAllocation {
    id: string;
    farm_id: string;
    payment_id: string;
    invoice_id: string;
    amount: number;
    allocated_at: string;
    invoice_number?: string;
    invoice_total?: number;
}

export interface APPaymentListParams {
    page?: number;
    limit?: number;
    status?: string;
    vendor_id?: string;
    from_date?: string;
    to_date?: string;
    search?: string;
}

export interface CreateAPPaymentInput {
    farm_id: string;
    vendor_id: string;
    payment_date: string;
    payment_method: 'CASH' | 'BANK_TRANSFER' | 'CREDIT';
    amount: number;
    bank_account_id?: string;
    reference?: string;
    notes?: string;
    created_by?: string;
}

export interface AllocateAPPaymentInput {
    allocations: {
        invoice_id: string;
        amount: number;
    }[];
}
