// src/types/reports.ts
// Accounting Reports Types - Phase 2 Task 6

// ==========================================
// COMMON
// ==========================================

export interface ReportPeriod {
    from_date: string;
    to_date: string;
}

export interface ReportMeta {
    report_name: string;
    period: ReportPeriod;
    generated_at: string;
    farm_name: string;
    farm_tax_code?: string;
}

// ==========================================
// QUERY PARAMS
// ==========================================

export interface ReportQueryParams {
    from: string;
    to: string;
    payment_method?: string;  // CASH, BANK_TRANSFER
    partner_id?: string;
    product_id?: string;
    include_comparison?: boolean;
}

// ==========================================
// 1. SỔ QUỸ TIỀN MẶT (TK 111)
// ==========================================

export interface CashBookEntry {
    date: string;
    code: string;
    description: string;
    partner_name?: string;

    debit: number;   // Thu
    credit: number;  // Chi
    balance: number;

    transaction_id: string;
}

export interface CashBookReport {
    meta: ReportMeta;
    account: {
        code: string;
        name: string;
    };

    opening_balance: number;

    entries: CashBookEntry[];

    totals: {
        total_debit: number;
        total_credit: number;
    };

    closing_balance: number;
}

// ==========================================
// 2. SỔ TIỀN GỬI NGÂN HÀNG (TK 112)
// ==========================================

export interface BankBookEntry {
    date: string;
    code: string;
    description: string;
    partner_name?: string;
    reference?: string;  // Số chứng từ ngân hàng

    debit: number;
    credit: number;
    balance: number;

    transaction_id: string;
}

export interface BankBookReport {
    meta: ReportMeta;
    account: {
        code: string;
        name: string;
        bank_name?: string;
        bank_account?: string;
    };

    opening_balance: number;
    entries: BankBookEntry[];
    totals: {
        total_debit: number;
        total_credit: number;
    };
    closing_balance: number;
}

// ==========================================
// 3. BẢNG KÊ HÓA ĐƠN MUA VÀO (Chi phí)
// ==========================================

export interface PurchaseInvoiceEntry {
    stt: number;
    invoice_number: string;
    invoice_date: string;

    vendor_tax_code: string;
    vendor_name: string;
    vendor_address?: string;

    goods_value: number;      // Giá trị hàng hóa
    vat_rate: number;         // Thuế suất (0, 5, 8, 10)
    vat_amount: number;       // Tiền thuế
    total_amount: number;     // Tổng thanh toán

    is_deductible: boolean;   // Được khấu trừ
    notes?: string;

    transaction_id?: string;
}

export interface PurchaseInvoiceReport {
    meta: ReportMeta;
    entries: PurchaseInvoiceEntry[];

    summary: {
        total_invoices: number;
        total_goods_value: number;
        total_vat_amount: number;
        total_amount: number;

        // Theo thuế suất
        by_vat_rate: Array<{
            rate: number;
            goods_value: number;
            vat_amount: number;
        }>;
    };
}

// ==========================================
// 4. BẢNG KÊ HÓA ĐƠN BÁN RA (Thu nhập)
// ==========================================

export interface SalesInvoiceEntry {
    stt: number;
    invoice_number: string;
    invoice_date: string;

    customer_tax_code?: string;
    customer_name: string;
    customer_address?: string;

    goods_value: number;
    vat_rate: number;
    vat_amount: number;
    total_amount: number;

    payment_status: 'PAID' | 'PENDING' | 'PARTIAL';

    transaction_id?: string;
}

export interface SalesInvoiceReport {
    meta: ReportMeta;
    entries: SalesInvoiceEntry[];

    summary: {
        total_invoices: number;
        total_goods_value: number;
        total_vat_amount: number;
        total_amount: number;

        by_vat_rate: Array<{
            rate: number;
            goods_value: number;
            vat_amount: number;
        }>;

        by_payment_status: {
            paid: number;
            pending: number;
            partial: number;
        };
    };
}

// ==========================================
// 5. SỔ CHI TIẾT CÔNG NỢ 131 (Phải thu KH)
// ==========================================

export interface AR131Entry {
    date: string;
    code: string;
    description: string;

    debit: number;   // Phát sinh nợ (bán hàng)
    credit: number;  // Thu tiền
    balance: number;
}

export interface AR131CustomerDetail {
    customer_id: string;
    customer_code: string;
    customer_name: string;

    opening_balance: number;
    entries: AR131Entry[];
    total_debit: number;
    total_credit: number;
    closing_balance: number;
}

export interface AR131Report {
    meta: ReportMeta;

    // Tổng hợp
    summary_opening: number;
    summary_debit: number;
    summary_credit: number;
    summary_closing: number;

    // Chi tiết theo khách hàng
    customers: AR131CustomerDetail[];
}

// ==========================================
// 6. SỔ CHI TIẾT CÔNG NỢ 331 (Phải trả NCC)
// ==========================================

export interface AP331Entry {
    date: string;
    code: string;
    description: string;

    debit: number;   // Trả tiền
    credit: number;  // Phát sinh nợ (mua hàng)
    balance: number;
}

export interface AP331VendorDetail {
    vendor_id: string;
    vendor_code: string;
    vendor_name: string;

    opening_balance: number;
    entries: AP331Entry[];
    total_debit: number;
    total_credit: number;
    closing_balance: number;
}

export interface AP331Report {
    meta: ReportMeta;

    summary_opening: number;
    summary_debit: number;
    summary_credit: number;
    summary_closing: number;

    vendors: AP331VendorDetail[];
}

// ==========================================
// 7. BÁO CÁO NXT KHO
// ==========================================

export interface StockReportEntry {
    product_id: string;
    product_code: string;
    product_name: string;
    unit: string;

    opening_qty: number;
    opening_value: number;

    in_qty: number;
    in_value: number;

    out_qty: number;
    out_value: number;

    closing_qty: number;
    closing_value: number;
}

export interface StockMovementReport {
    meta: ReportMeta;
    entries: StockReportEntry[];

    totals: {
        opening_value: number;
        in_value: number;
        out_value: number;
        closing_value: number;
    };
}

// ==========================================
// 8. BẢNG CÂN ĐỐI SỐ PHÁT SINH
// ==========================================

export interface TrialBalanceAccount {
    account_code: string;
    account_name: string;
    level: number;        // 1 = tài khoản cấp 1, 2 = cấp 2

    // Số dư đầu kỳ
    opening_debit: number;
    opening_credit: number;

    // Phát sinh trong kỳ
    period_debit: number;
    period_credit: number;

    // Số dư cuối kỳ
    closing_debit: number;
    closing_credit: number;
}

export interface TrialBalanceReport {
    meta: ReportMeta;

    accounts: TrialBalanceAccount[];

    totals: {
        opening_debit: number;
        opening_credit: number;
        period_debit: number;
        period_credit: number;
        closing_debit: number;
        closing_credit: number;
    };

    // Kiểm tra cân đối
    is_balanced: boolean;
}

// ==========================================
// 9. BÁO CÁO LÃI LỖ ĐƠN GIẢN
// ==========================================

export interface ProfitLossReport {
    meta: ReportMeta;

    revenue: {
        sales: number;
        other_income: number;
        total: number;
    };

    cost_of_goods_sold: number;

    gross_profit: number;

    expenses: {
        operating: number;
        payroll: number;
        other: number;
        total: number;
    };

    net_profit: number;

    // So sánh kỳ trước
    comparison?: {
        previous_period: ReportPeriod;
        previous_net_profit: number;
        change_amount: number;
        change_percent: number;
    };
}
