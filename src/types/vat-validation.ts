// src/types/vat-validation.ts
// Types for VAT Validation Service - Task 3

import { PaymentMethod, SupplierStatus, UsagePurpose } from '@prisma/client';

// ==========================================
// VAT VALIDATION INPUT
// ==========================================

export interface VATValidationInput {
    // Transaction identity (optional for preview mode)
    transaction_id?: string;

    // Invoice info
    invoice_number?: string;
    invoice_date: string | Date;
    invoice_series?: string;

    // Supplier
    partner_id?: string;
    supplier_tax_code?: string;
    supplier_name?: string;
    supplier_status?: SupplierStatus;

    // Buyer info (for VAT_INFO_CHECK)
    buyer_tax_code?: string;
    buyer_name?: string;

    // Amounts
    goods_value: number;         // Tiền hàng
    vat_rate: number;            // Thuế suất (10, 8, 5, 0)
    vat_amount: number;          // Tiền VAT
    total_amount: number;        // Tổng thanh toán

    // Payment
    payment_method: PaymentMethod | 'CASH' | 'BANK_TRANSFER' | 'CREDIT';
    has_bank_payment?: boolean;  // Có chứng từ chuyển khoản

    // Usage purpose (for VAT_NON_BIZ)
    usage_purpose?: UsagePurpose | 'BUSINESS' | 'PERSONAL' | 'WELFARE_FUND';

    // Category
    category?: string;

    // Vehicle specific (for VAT_CAR_LUXURY, VAT_VEHICLE_9SEATS)
    is_vehicle?: boolean;
    asset_type?: 'CAR_UNDER_9_SEATS' | 'VEHICLE' | 'MACHINERY' | 'BUILDING' | 'EQUIPMENT';
    vehicle_type?: 'CAR' | 'TRUCK' | 'MOTORCYCLE';
    vehicle_seats?: number;

    // Transport business (for VAT_CAR_LUXURY exception)
    is_transport_biz?: boolean;

    // Entertainment (for CIT warning)
    is_entertainment?: boolean;
    number_of_persons?: number;

    // Options
    skip_mst_lookup?: boolean;   // Skip VietQR lookup
    save_result?: boolean;       // Save result to transaction
}

// ==========================================
// VAT VALIDATION RESULT
// ==========================================

export interface VATValidationResult {
    // Overall status
    is_deductible: boolean;

    // Amounts
    original_vat_amount: number;
    deductible_amount: number;
    non_deductible_amount: number;

    // Rejection details
    rejection_code?: string;        // VAT_NON_CASH, VAT_CAR_LUXURY, etc.
    rejection_reason?: string;

    // For PARTIAL deduction (VAT_CAR_LUXURY)
    is_partial?: boolean;
    deduction_ratio?: number;       // e.g., 0.64 for 64%

    // Validation details
    errors: VATValidationError[];
    warnings: VATValidationWarning[];
    applied_rules: string[];        // Rule codes that were evaluated

    // MST lookup result
    mst_lookup?: {
        found: boolean;
        registered_name?: string;
        name_match?: boolean;
        name_match_score?: number;
    };

    // Summary for display
    summary: string;
}

export interface VATValidationError {
    code: string;                   // MISSING_INVOICE_NUMBER, CASH_OVER_LIMIT, etc.
    rule_code: string;              // VAT_NON_CASH, VAT_MISSING_MST, etc.
    message: string;
    reference?: string;             // TT219/2013/TT-BTC
    fix_suggestion?: string;
}

export interface VATValidationWarning {
    code: string;
    rule_code: string;
    message: string;
    exceeded_amount?: number;
}

// ==========================================
// VAT ISSUES REPORT
// ==========================================

export interface VATIssuesReport {
    period: {
        from_date: string;
        to_date: string;
    };

    summary: {
        total_invoices: number;
        deductible_count: number;
        non_deductible_count: number;
        partial_count: number;
        warning_count: number;

        total_vat: number;
        deductible_vat: number;
        non_deductible_vat: number;
    };

    issues: VATIssueItem[];
}

export interface VATIssueItem {
    transaction_id: string;
    invoice_number: string;
    invoice_date: string;
    supplier_name: string;
    supplier_tax_code?: string;

    total_amount: number;
    vat_amount: number;
    deductible_amount: number;

    is_deductible: boolean;
    is_partial: boolean;
    rejection_code?: string;

    errors: string[];
    warnings: string[];

    fix_link?: string;
}

// ==========================================
// BATCH VALIDATION
// ==========================================

export interface VATBatchValidationInput {
    transactions: VATValidationInput[];
    save_results?: boolean;
}

export interface VATBatchValidationResult {
    total: number;
    deductible_count: number;
    non_deductible_count: number;
    partial_count: number;

    results: VATValidationResult[];

    summary: {
        total_vat: number;
        deductible_vat: number;
        non_deductible_vat: number;
    };
}
