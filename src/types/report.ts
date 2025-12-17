// src/types/report.ts
// Types cho Báo cáo module

// ==========================================
// BÁO CÁO THU CHI
// ==========================================

export interface IncomeExpenseReportParams {
    farm_id: string;
    start_date: string;
    end_date: string;
    group_by?: 'day' | 'week' | 'month';
    include_details?: boolean;
}

export interface IncomeExpenseReport {
    period: {
        from: string;
        to: string;
        type: 'day' | 'week' | 'month';
    };

    // Flat summary fields for easy access
    total_income: number;
    total_expense: number;
    net: number;
    transaction_count: number;

    // Summary object for compatibility
    summary: {
        total_income: number;
        total_expense: number;
        net_profit: number;
        transaction_count: number;
    };

    by_date: Array<{
        date: string;
        income: number;
        expense: number;
        net: number;
        transaction_ids?: string[];
    }>;

    by_category: Array<{
        category: string;
        income: number;
        expense: number;
        transaction_ids?: string[];
    }>;

    by_payment_method: Array<{
        method: string;
        payment_method: string; // alias
        amount: number;
        count: number;
    }>;
}

// ==========================================
// BÁO CÁO LÃI LỖ
// ==========================================

export interface ProfitLossReportParams {
    farm_id: string;
    start_date: string;
    end_date: string;
    include_details?: boolean;
}

export interface ProfitLossReport {
    period: {
        from: string;
        to: string;
    };

    // Flat fields for easy access
    revenue: number;
    total_expense: number;
    cogs: number;
    gross_profit: number;
    net_profit: number;
    profit_margin: number;

    // Detailed breakdown
    revenue_breakdown: {
        sales: number;
        other_income: number;
        total: number;
        transaction_ids?: string[];
    };

    cost_of_goods_sold: {
        opening_stock: number;
        purchases: number;
        closing_stock: number;
        total: number;
        transaction_ids?: string[];
    };

    operating_expenses: {
        items: Array<{
            name: string;
            amount: number;
            transaction_ids?: string[];
        }>;
        total: number;
    };
}

// ==========================================
// BÁO CÁO TỒN KHO
// ==========================================

export interface InventoryReportParams {
    farm_id: string;
    as_of_date?: string;
    low_stock_only?: boolean;
}

export interface InventoryItem {
    product_id: string;
    product_code: string;
    product_name: string;
    category?: string | null;
    base_unit: string;
    current_stock: number;
    avg_cost: number;
    value: number;
    min_stock: number | null;
    is_low_stock: boolean;
    last_purchase_date?: string | null;
    last_sale_date?: string | null;
}

export interface LowStockItem {
    product_id: string;
    product_name: string;
    current_stock: number;
    min_stock: number;
    base_unit: string;
}

export interface InventoryReport {
    generated_at: string;

    // Flat fields for easy access
    total_products: number;
    total_value: number;
    low_stock_count: number;
    out_of_stock_count: number;

    // Summary object for compatibility
    summary: {
        total_products: number;
        total_value: number;
        low_stock_count: number;
        out_of_stock_count: number;
    };

    items: InventoryItem[];

    low_stock_items: LowStockItem[];

    by_category: Array<{
        category: string;
        product_count: number;
        total_value: number;
    }>;
}

// ==========================================
// BÁO CÁO CÔNG NỢ
// ==========================================

export interface PayablePartner {
    partner_id: string;
    partner_code: string;
    partner_name: string;
    partner_type: 'CUSTOMER' | 'VENDOR';
    balance: number;
    overdue_balance: number;
    overdue_days: number;
}

export interface AgingAnalysis {
    current: number;
    days_1_30: number;
    days_31_60: number;
    days_over_60: number;
}

export interface PayableReport {
    generated_at: string;

    // Flat fields for easy access
    total_receivable: number;
    total_payable: number;
    total_overdue: number;
    partner_count: number;

    aging: AgingAnalysis;

    partners: PayablePartner[];

    // Detailed breakdown (for compatibility)
    receivables: {
        total: number;
        overdue: number;
        current: number;

        by_aging: Array<{
            range: string;
            amount: number;
            count: number;
            partner_ids?: string[];
        }>;

        top_debtors: Array<{
            partner_id: string;
            name: string;
            balance: number;
            overdue_days: number;
        }>;
    };

    payables: {
        total: number;
        overdue: number;
        current: number;

        by_aging: Array<{
            range: string;
            amount: number;
            count: number;
            partner_ids?: string[];
        }>;

        top_creditors: Array<{
            partner_id: string;
            name: string;
            balance: number;
            overdue_days: number;
        }>;
    };
}

// ==========================================
// PARAMS
// ==========================================

export interface ReportParams {
    from: string;
    to: string;
    group_by?: 'day' | 'week' | 'month';
    include_drill_down?: boolean;
}

export interface ExportParams {
    report_type: 'income_expense' | 'profit_loss' | 'inventory' | 'payable' | 'balance_sheet' | 'income_statement';
    format: 'xlsx';
    from?: string;
    to?: string;
}

// ==========================================
// BÁO CÁO TÀI CHÍNH (Financial Statements)
// ==========================================

// Re-export from financial-statement.service.ts for convenience
export type { BalanceSheet, IncomeStatement, BalanceSheetSection, IncomeStatementSection } from '@/services/financial-statement.service';
