// src/types/tax-package.ts
// Tax Package Export Types (Task 9)

export interface TaxPackageConfig {
    period_type: 'MONTHLY' | 'QUARTERLY';
    period_code: string;        // "2024-12" hoặc "2024-Q4"

    // Options
    include_xml: boolean;
    include_reports: boolean;
    include_images: boolean;

    // Chọn reports
    reports: Array<
        | 'cash-book'
        | 'bank-book'
        | 'purchase-invoices'
        | 'sales-invoices'
        | 'ar-131'
        | 'ap-331'
        | 'trial-balance'
        | 'profit-loss'
    >;

    // Images options
    image_quality: 'original' | 'compressed';

    notes?: string;
}

// ==========================================
// PRE-EXPORT CHECKLIST
// ==========================================

export interface ChecklistItem {
    id: string;
    category: 'data' | 'vat' | 'invoice' | 'partner' | 'period';
    title: string;
    description: string;
    status: 'passed' | 'warning' | 'failed';
    details?: string;
    link?: string;
    fix_action?: string;
}

export interface TaxPackageChecklist {
    period: {
        from_date: string;
        to_date: string;
    };

    items: ChecklistItem[];

    summary: {
        total: number;
        passed: number;
        warnings: number;
        failed: number;
    };

    can_export: boolean;

    generated_at: string;
}

// ==========================================
// EXPORT RESULT
// ==========================================

export interface TaxPackageExportResult {
    id: string;

    period_type: string;
    period_code: string;

    file_name: string;
    file_size: number;
    file_url: string;

    contents: {
        xml_included: boolean;
        reports_count: number;
        images_count: number;
    };

    created_at: string;
    created_by: string;

    download_count: number;
    last_downloaded_at?: string;
}

// ==========================================
// EXPORT HISTORY
// ==========================================

export interface TaxPackageHistoryItem {
    id: string;
    period_code: string;
    file_name: string;
    file_size: number;
    created_at: string;
    created_by_name: string;
    download_count: number;
}

export interface TaxPackageHistoryResponse {
    items: TaxPackageHistoryItem[];
    total: number;
    page: number;
    limit: number;
}

// ==========================================
// METADATA JSON
// ==========================================

export interface TaxPackageMetadata {
    version: '1.0';

    farm: {
        name: string;
        tax_code: string;
        address?: string;
        phone?: string;
    };

    period: {
        type: string;
        code: string;
        from_date: string;
        to_date: string;
    };

    generated: {
        at: string;
        by: string;
        software: 'LABA ERP';
        version: string;
    };

    contents: {
        files: Array<{
            name: string;
            type: 'xml' | 'xlsx' | 'jpg' | 'png';
            size: number;
            description: string;
        }>;
        total_size: number;
    };

    vat_summary: {
        input_count: number;
        input_amount: number;
        input_tax: number;
        output_count: number;
        output_amount: number;
        output_tax: number;
        payable: number;
        carried: number;
    };
}
