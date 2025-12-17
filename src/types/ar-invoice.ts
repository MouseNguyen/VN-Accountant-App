// src/types/ar-invoice.ts
// AR Invoice Types for Phase 4

import type { ARInvoiceStatus, PaymentMethod } from '@prisma/client';

// ==========================================
// AR INVOICE TYPES
// ==========================================

export interface ARInvoiceLine {
    id: string;
    farm_id: string;
    invoice_id: string;
    line_number: number;
    product_id?: string | null;
    product_name: string;
    unit?: string | null;
    quantity: number;
    unit_price: number;
    discount: number;
    tax_rate: number;
    sub_total: number;
    tax_amount: number;
    total_amount: number;
}

export interface ARInvoice {
    id: string;
    farm_id: string;
    invoice_number: string;
    invoice_date: string;
    customer_id: string;
    customer_name?: string;
    sub_total: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;
    paid_amount: number;
    balance: number;
    due_date: string;
    payment_term_days: number;
    status: ARInvoiceStatus;
    posted_at?: string | null;
    posted_by?: string | null;
    description?: string | null;
    notes?: string | null;
    journal_entry_id?: string | null;
    created_at: string;
    updated_at: string;
    created_by?: string | null;
    lines?: ARInvoiceLine[];
}

// ==========================================
// LIST PARAMS & RESPONSE
// ==========================================

export interface ARInvoiceListParams {
    page?: number;
    limit?: number;
    status?: ARInvoiceStatus;
    customer_id?: string;
    from_date?: string;
    to_date?: string;
    search?: string;
}

export interface ARInvoiceListResponse {
    items: ARInvoice[];
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

// ==========================================
// CREATE / UPDATE INPUT
// ==========================================

export interface ARInvoiceLineInput {
    product_id?: string;
    product_name: string;
    unit?: string;
    quantity: number;
    unit_price: number;
    discount?: number;
    tax_rate: number;
}

export interface CreateARInvoiceInput {
    farm_id: string;
    invoice_date: string;
    customer_id: string;
    payment_term_days?: number;
    description?: string;
    notes?: string;
    lines: ARInvoiceLineInput[];
    created_by?: string;
}

export interface UpdateARInvoiceInput {
    invoice_date?: string;
    customer_id?: string;
    payment_term_days?: number;
    description?: string;
    notes?: string;
    lines?: ARInvoiceLineInput[];
}
