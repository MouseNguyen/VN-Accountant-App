// src/types/invoice.ts

import { InvoiceStatus } from '@prisma/client';

// ==========================================
// OCR TYPES
// ==========================================

export interface OCRResult {
    // Raw text
    raw_text: string;

    // Parsed fields
    invoice_number?: string;
    invoice_date?: string;
    supplier_name?: string;
    supplier_tax_code?: string;
    supplier_address?: string;

    // Amounts
    subtotal?: number;
    tax_rate?: number;
    tax_amount?: number;
    total_amount?: number;

    // Line items (nếu parse được)
    items?: Array<{
        description: string;
        quantity?: number;
        unit_price?: number;
        amount?: number;
    }>;

    // Confidence score
    confidence: number;

    // Warnings
    warnings?: string[];
}

// ==========================================
// INVOICE ENTITY
// ==========================================

export interface Invoice {
    id: string;
    farm_id: string;

    image_url?: string | null;
    image_hash?: string | null;
    file_size?: number | null;

    invoice_type?: string | null;

    ocr_raw?: unknown;
    ocr_parsed?: OCRResult | null;
    ocr_confidence?: number | null;
    ocr_provider?: string | null;

    invoice_number?: string | null;
    invoice_date?: string | null;
    invoice_serial?: string | null;

    supplier_name?: string | null;
    supplier_tax_code?: string | null;

    subtotal?: number | null;
    tax_amount?: number | null;
    total_amount?: number | null;

    matched_partner_id?: string | null;
    match_confidence?: number | null;

    status: InvoiceStatus;
    error_message?: string | null;
    retry_count: number;

    transaction_id?: string | null;

    created_at: string;
    updated_at: string;
    created_by?: string | null;
    confirmed_at?: string | null;
    confirmed_by?: string | null;
    expires_at?: string | null;
}

// ==========================================
// REQUEST/RESPONSE
// ==========================================

export interface UploadInvoiceInput {
    image: string; // Base64 encoded image
    auto_create_transaction?: boolean;
}

export interface UploadInvoiceResponse {
    id: string;
    status: InvoiceStatus;
    image_url?: string;
    ocr_result?: OCRResult;
    message: string;
}

export interface ConfirmInvoiceInput {
    invoice_id: string;

    // User có thể sửa data trước khi confirm
    invoice_number?: string;
    invoice_date?: string;
    supplier_name?: string;
    supplier_tax_code?: string;
    total_amount?: number;
    tax_amount?: number;

    // Thông tin để tạo Transaction
    partner_id?: string;
    create_partner?: boolean;
    payment_method?: string;
    paid_amount?: number;
    note?: string;
}

export interface ConfirmInvoiceResponse {
    invoice: Invoice;
    transaction?: {
        id: string;
        code: string;
    };
    partner?: {
        id: string;
        code: string;
        name: string;
        is_new: boolean;
    };
}

export interface InvoiceListParams {
    page?: number;
    limit?: number;
    status?: InvoiceStatus;
    date_from?: string;
    date_to?: string;
    search?: string;
    sort_by?: 'created_at' | 'invoice_date' | 'total_amount';
    sort_order?: 'asc' | 'desc';
}

export interface InvoiceListResponse {
    items: Invoice[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    summary: {
        total_pending: number;
        total_processed: number;
        total_confirmed: number;
        total_failed: number;
    };
}
