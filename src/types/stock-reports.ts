// src/types/stock-reports.ts
// Types cho Stock Reports & Alerts

// ==========================================
// BÁO CÁO NHẬP XUẤT TỒN
// ==========================================

export interface StockMovementReportParams {
    date_from: string;
    date_to: string;
    product_id?: string;
    category?: string;
    location_code?: string;
}

export interface StockMovementReportItem {
    product_id: string;
    product_code: string;
    product_name: string;
    unit: string;
    category: string;

    // Tồn đầu kỳ
    opening_qty: number;
    opening_value: number;

    // Nhập trong kỳ
    in_qty: number;
    in_value: number;

    // Xuất trong kỳ
    out_qty: number;
    out_value: number;  // COGS

    // Tồn cuối kỳ
    closing_qty: number;
    closing_value: number;
    closing_avg_cost: number;
}

export interface StockMovementReport {
    period: {
        from: string;
        to: string;
    };
    items: StockMovementReportItem[];
    summary: {
        total_opening_value: number;
        total_in_value: number;
        total_out_value: number;
        total_closing_value: number;
    };
    generated_at: string;
}

// ==========================================
// THẺ KHO
// ==========================================

export interface StockCardParams {
    product_id: string;
    date_from: string;
    date_to: string;
}

export interface StockCardEntry {
    date: string;
    code: string;
    type: 'IN' | 'OUT' | 'ADJUST_IN' | 'ADJUST_OUT';
    description: string;
    partner_name?: string;

    in_qty?: number;
    in_price?: number;
    in_value?: number;

    out_qty?: number;
    out_price?: number;
    out_value?: number;

    balance_qty: number;
    balance_value: number;
    avg_cost: number;
}

export interface StockCard {
    product: {
        id: string;
        code: string;
        name: string;
        unit: string;
    };
    period: {
        from: string;
        to: string;
    };

    // Số dư đầu kỳ
    opening: {
        qty: number;
        value: number;
        avg_cost: number;
    };

    // Các bút toán
    entries: StockCardEntry[];

    // Tổng kết
    totals: {
        in_qty: number;
        in_value: number;
        out_qty: number;
        out_value: number;
    };

    // Số dư cuối kỳ
    closing: {
        qty: number;
        value: number;
        avg_cost: number;
    };

    generated_at: string;
}

// ==========================================
// BÁO CÁO TUỔI TỒN KHO (AGING)
// ==========================================

export interface StockAgingItem {
    product_id: string;
    product_code: string;
    product_name: string;
    unit: string;

    total_qty: number;
    total_value: number;

    // Phân theo tuổi (ngày)
    age_0_30: { qty: number; value: number };   // 0-30 ngày
    age_31_60: { qty: number; value: number };  // 31-60 ngày
    age_61_90: { qty: number; value: number };  // 61-90 ngày
    age_over_90: { qty: number; value: number }; // >90 ngày

    // Ngày nhập gần nhất
    last_in_date?: string;
    // Ngày xuất gần nhất
    last_out_date?: string;
    // Số ngày không có movement
    days_since_last_movement: number;
}

export interface StockAgingReport {
    as_of_date: string;
    items: StockAgingItem[];
    summary: {
        total_products: number;
        total_value: number;
        slow_moving_count: number;  // >60 ngày
        dead_stock_count: number;   // >90 ngày
    };
    generated_at: string;
}

// ==========================================
// BÁO CÁO GIÁ TRỊ TỒN KHO
// ==========================================

export interface StockValuationItem {
    product_id: string;
    product_code: string;
    product_name: string;
    category: string;
    unit: string;

    quantity: number;
    avg_cost: number;
    total_value: number;

    // Phần trăm so với tổng
    value_percentage: number;
}

export interface StockValuationReport {
    as_of_date: string;
    items: StockValuationItem[];

    // Tổng hợp theo category
    by_category: Array<{
        category: string;
        total_value: number;
        percentage: number;
    }>;

    summary: {
        total_products: number;
        total_quantity: number;
        total_value: number;
    };
    generated_at: string;
}

// ==========================================
// CẢNH BÁO KHO
// ==========================================

export type StockAlertType =
    | 'LOW_STOCK'       // Tồn thấp
    | 'OUT_OF_STOCK'    // Hết hàng
    | 'OVER_STOCK'      // Tồn quá mức
    | 'SLOW_MOVING';    // Hàng chậm luân chuyển

export type AlertSeverity = 'info' | 'warning' | 'error';

export interface StockAlert {
    id: string;
    type: StockAlertType;
    severity: AlertSeverity;

    product_id: string;
    product_code: string;
    product_name: string;

    current_qty: number;
    threshold_qty: number;  // min_stock hoặc max_stock

    title: string;
    message: string;

    created_at: string;
    dismissed_at?: string | null;
    dismissed_by?: string | null;
}

export interface StockAlertListParams {
    type?: StockAlertType;
    severity?: AlertSeverity;
    include_dismissed?: boolean;
}

export interface StockAlertListResponse {
    items: StockAlert[];
    counts: {
        total: number;
        low_stock: number;
        out_of_stock: number;
        over_stock: number;
        slow_moving: number;
    };
}
