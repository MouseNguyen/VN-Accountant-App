// src/types/asset.ts
// TypeScript types for Fixed Assets Management

import { AssetCategory, AssetStatus, DepreciationMethod } from '@prisma/client';

// ==========================================
// INPUT TYPES
// ==========================================

export interface CreateAssetInput {
    code?: string; // Auto-generate if not provided
    name: string;
    category: AssetCategory;
    purchase_date: string; // ISO date string
    purchase_price: number;
    useful_life_months?: number; // Default based on category
    depreciation_method?: DepreciationMethod;
    residual_value?: number; // Giá trị còn lại dự kiến
    supplier?: string;
    invoice_number?: string;
    location?: string;
    serial_number?: string;
    image_url?: string;
    // Vehicle specific for TT96
    is_transport_biz?: boolean;
}

export interface UpdateAssetInput {
    name?: string;
    category?: AssetCategory;
    useful_life_months?: number;
    residual_value?: number;
    location?: string;
    serial_number?: string;
    image_url?: string;
    status?: AssetStatus;
}

export interface DisposeAssetInput {
    disposed_value?: number; // Sale price (0 or null = disposal, >0 = sale)
    disposal_reason?: string;
    disposed_at?: string; // ISO date string
}

// ==========================================
// OUTPUT TYPES
// ==========================================

export interface AssetDetail {
    id: string;
    code: string;
    name: string;
    category: AssetCategory;
    category_label: string;

    // Purchase info
    purchase_date: string;
    purchase_price: number;
    supplier?: string;
    invoice_number?: string;

    // Depreciation
    useful_life_months: number;
    useful_life_years: number;
    depreciation_method: DepreciationMethod;
    monthly_depreciation: number;
    residual_value: number;

    // Values
    original_cost: number;
    accumulated_depreciation: number;
    book_value: number;
    depreciation_progress: number; // 0-100%

    // Tax
    max_deductible_value?: number;
    is_transport_biz: boolean;

    // Location & Info
    location?: string;
    serial_number?: string;
    image_url?: string;

    // Status
    status: AssetStatus;
    status_label: string;

    // Disposal
    disposed_at?: string;
    disposed_value?: number;
    disposal_reason?: string;
    gain_loss?: number; // disposed_value - book_value

    // Meta
    created_at: string;
    updated_at: string;
}

export interface AssetSummary {
    total_count: number;
    active_count: number;
    disposed_count: number;
    sold_count: number;

    total_original_cost: number;
    total_accumulated_depreciation: number;
    total_book_value: number;
    total_monthly_depreciation: number;

    by_category: {
        category: AssetCategory;
        category_label: string;
        count: number;
        total_value: number;
    }[];
}

export interface DepreciationScheduleRow {
    id: string;
    asset_id: string;
    asset_code: string;
    asset_name: string;
    period: string; // "YYYY-MM"
    depreciation_amount: number;
    accumulated_amount: number;
    remaining_value: number;
    is_posted: boolean;
    posted_at?: string;
}

export interface DepreciationResult {
    processed: number;
    skipped: number;
    errors: number;
    details: {
        asset_code: string;
        asset_name: string;
        status: 'PROCESSED' | 'SKIPPED' | 'ERROR';
        amount?: number;
        reason?: string;
    }[];
}

// ==========================================
// FILTER TYPES
// ==========================================

export interface AssetFilters {
    status?: AssetStatus;
    category?: AssetCategory;
    search?: string;
    from_date?: string;
    to_date?: string;
}

export interface DepreciationScheduleFilters {
    asset_id?: string;
    year?: number;
    month?: number;
    is_posted?: boolean;
}

// ==========================================
// PAGINATION
// ==========================================

export interface PaginatedAssets {
    data: AssetDetail[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
