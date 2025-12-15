// src/types/inventory.ts
// Types cho Inventory Management (Quản lý Kho)

import { StockMovementType, StockCountStatus } from '@prisma/client';

// ==========================================
// STOCK (TỒN KHO)
// ==========================================

export interface Stock {
    id: string;
    product_id: string;
    product?: {
        id: string;
        code: string;
        name: string;
        unit: string;
        category: string;
    };

    quantity: number;
    avg_cost: number;
    total_value: number;

    min_quantity?: number | null;
    max_quantity?: number | null;
    reorder_point?: number | null;
    location_code: string;

    last_movement_at?: string | null;
    updated_at: string;
}

export interface StockListParams {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    location_code?: string;
    low_stock?: boolean;
    out_of_stock?: boolean;
    sort_by?: 'name' | 'quantity' | 'total_value' | 'updated_at';
    sort_order?: 'asc' | 'desc';
}

export interface StockListResponse {
    items: Stock[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    summary: {
        total_products: number;
        total_value: number;
        low_stock_count: number;
        out_of_stock_count: number;
    };
}

// ==========================================
// STOCK MOVEMENT (NHẬP/XUẤT KHO)
// ==========================================

export interface StockMovement {
    id: string;
    type: StockMovementType;
    code: string;
    date: string;

    product_id: string;
    product?: {
        id: string;
        code: string;
        name: string;
        unit: string;
    };

    quantity: number;
    unit: string;
    unit_price: number;

    avg_cost_before: number;
    avg_cost_after: number;
    cogs_amount: number;

    qty_before: number;
    qty_after: number;

    from_location?: string | null;
    to_location?: string | null;

    transaction_id?: string | null;
    partner_id?: string | null;
    partner?: {
        id: string;
        code: string;
        name: string;
    } | null;

    reason?: string | null;
    notes?: string | null;

    created_at: string;
    created_by?: string | null;
}

export interface StockMovementListParams {
    page?: number;
    limit?: number;
    product_id?: string;
    type?: StockMovementType;
    partner_id?: string;
    date_from?: string;
    date_to?: string;
    sort_by?: 'date' | 'code' | 'quantity';
    sort_order?: 'asc' | 'desc';
}

export interface StockMovementListResponse {
    items: StockMovement[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    summary: {
        total_in: number;
        total_out: number;
        total_value_in: number;
        total_value_out: number;
    };
}

// ==========================================
// INPUT TYPES
// ==========================================

export interface StockInInput {
    product_id: string;
    quantity: number;
    unit_price: number;
    date?: string;
    partner_id?: string;
    location_code?: string;
    reason?: string;
    notes?: string;
    transaction_id?: string;
}

export interface StockOutInput {
    product_id: string;
    quantity: number;
    date?: string;
    partner_id?: string;
    location_code?: string;
    reason?: string;
    notes?: string;
    transaction_id?: string;
}

export interface StockAdjustInput {
    product_id: string;
    new_quantity: number;
    reason: string;
    notes?: string;
}

export interface StockImportItem {
    product_code: string;
    quantity: number;
    unit_price: number;
}

export interface StockImportInput {
    type: 'IN' | 'OUT';
    date: string;
    items: StockImportItem[];
    partner_id?: string;
    notes?: string;
}

// ==========================================
// STOCK COUNT (KIỂM KÊ)
// ==========================================

export interface StockCount {
    id: string;
    code: string;
    count_date: string;
    status: StockCountStatus;

    total_products: number;
    total_variance: number;

    notes?: string | null;
    completed_at?: string | null;
    completed_by?: string | null;
    created_at: string;

    items?: StockCountItem[];
}

export interface StockCountItem {
    id: string;
    product_id: string;
    product?: {
        id: string;
        code: string;
        name: string;
        unit: string;
    };

    system_qty: number;
    counted_qty: number;
    variance_qty: number;
    variance_value: number;
    variance_reason?: string | null;
}

export interface CreateStockCountInput {
    count_date: string;
    product_ids?: string[];
    notes?: string;
}

export interface UpdateStockCountItemInput {
    item_id: string;
    counted_qty: number;
    variance_reason?: string;
}

export interface CompleteStockCountInput {
    stock_count_id: string;
    auto_adjust: boolean;
}
