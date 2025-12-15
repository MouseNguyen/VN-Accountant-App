// src/types/vat.ts
// Types for VAT Declaration (Task 8)

import { VATPeriodType, VATDeclarationStatus } from '@prisma/client';

// ==========================================
// VAT DECLARATION
// ==========================================

export interface VATDeclaration {
    id: string;
    farm_id: string;

    // Kỳ khai
    period_type: VATPeriodType;
    period_code: string;    // "2024-12" hoặc "2024-Q4"
    from_date: string;
    to_date: string;

    // Thuế đầu vào (Mua hàng)
    input_vat: {
        count: number;        // Số hóa đơn
        amount: number;       // Giá trị hàng hóa
        tax: number;          // Tiền thuế GTGT
    };

    // Thuế đầu ra (Bán hàng)
    output_vat: {
        count: number;
        amount: number;
        tax: number;
    };

    // Thuế phải nộp/còn được khấu trừ
    payable_vat: number;      // = output.tax - input.tax
    carried_forward: number;  // Thuế còn được khấu trừ kỳ sau

    // Điều chỉnh
    adjustment_amount: number;
    adjustment_reason?: string;

    // XML
    xml_content?: string;
    xml_file_url?: string;
    xml_generated_at?: string;

    // Trạng thái
    status: VATDeclarationStatus;

    // Nộp
    submitted_at?: string;
    submitted_by?: string;
    submission_ref?: string;

    notes?: string;

    created_at: string;
    updated_at: string;
}

// ==========================================
// INVOICE DETAILS
// ==========================================

export interface VATInvoiceDetail {
    id: string;
    invoice_number: string;
    invoice_date: string;
    invoice_serial?: string;

    // Bên kia
    partner_tax_code: string;
    partner_name: string;
    partner_address?: string;

    // Giá trị
    goods_value: number;
    vat_rate: number;
    vat_amount: number;
    total_amount: number;

    // Loại
    type: 'INPUT' | 'OUTPUT';

    // Trạng thái
    is_deductible: boolean;
    has_issues: boolean;
    issue_reason?: string;
}

// ==========================================
// CREATE / CALCULATE
// ==========================================

export interface CreateVATDeclarationInput {
    period_type: 'MONTHLY' | 'QUARTERLY';
    period_code: string;  // "2024-12" hoặc "2024-Q4"
    notes?: string;
}

export interface CalculateVATResult {
    period: {
        from_date: string;
        to_date: string;
    };

    input_invoices: VATInvoiceDetail[];
    output_invoices: VATInvoiceDetail[];

    input_vat: {
        count: number;
        amount: number;
        tax: number;
        by_rate: Array<{ rate: number; amount: number; tax: number }>;
    };

    output_vat: {
        count: number;
        amount: number;
        tax: number;
        by_rate: Array<{ rate: number; amount: number; tax: number }>;
    };

    payable_vat: number;
    carried_forward: number;

    // Vấn đề cần xem xét
    issues: Array<{
        invoice_id: string;
        invoice_number: string;
        type: 'MISSING_TAX_CODE' | 'INVALID_TAX_CODE' | 'MISSING_INVOICE_NUMBER';
        message: string;
    }>;
}

// ==========================================
// VALIDATION
// ==========================================

export interface TaxCodeValidation {
    tax_code: string;
    is_valid: boolean;
    company_name?: string;
    address?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
    error?: string;
}

// ==========================================
// LIST
// ==========================================

export interface VATDeclarationListParams {
    page?: number;
    limit?: number;
    year?: number;
    status?: VATDeclarationStatus;
}

export interface VATDeclarationListResponse {
    items: VATDeclaration[];
    total: number;
    page: number;
    limit: number;
    summary: {
        total_payable: number;
        total_carried: number;
    };
}

// ==========================================
// RE-EXPORTS
// ==========================================

export { VATPeriodType, VATDeclarationStatus };
