// src/types/tax-report.ts

// ==========================================
// TAX REPORT TYPES
// ==========================================

export interface VATSummary {
    period: { start: string; end: string };
    output: number;      // VAT bán ra
    input: number;       // VAT mua vào
    payable: number;     // output - input
    transaction_count: { income: number; expense: number };
}

export interface InsuranceSummary {
    period: { start: string; end: string };
    employee_portion: number;  // 10.5% đã trừ từ lương NV
    employer_portion: number;  // 21.5% DN phải đóng
    total_payable: number;     // employee + employer
    worker_count: number;
}

export interface TaxPaymentRecord {
    id: string;
    tax_type: 'VAT' | 'BHXH' | 'TNCN';
    amount: number;
    status: 'PENDING' | 'PAID';
    paid_at?: string;
    transaction_code?: string;
}

export interface TaxReportData {
    quarter: number;
    year: number;

    vat: VATSummary;
    insurance: InsuranceSummary;

    total_liability: number;

    payments: TaxPaymentRecord[];
}

export interface ConfirmTaxPaymentInput {
    tax_type: 'VAT' | 'BHXH';
    quarter: number;
    year: number;
    amount: number;
    payment_method?: string;
}

export interface ConfirmTaxPaymentResponse {
    success: boolean;
    tax_payment: {
        id: string;
        status: string;
        paid_at: string;
    };
    transaction: {
        id: string;
        code: string;
    };
}
