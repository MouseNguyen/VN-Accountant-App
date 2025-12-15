// src/types/product.ts
// Shared types for Product between Backend and Frontend

import type { ProductCategory } from '@prisma/client';

/**
 * Product entity (serialized for JSON)
 */
export interface Product {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    category: ProductCategory;
    unit: string;
    selling_price: number;    // Decimal serialized to number
    purchase_price: number;   // Decimal serialized to number
    avg_cost: number;         // Moving Average Cost
    stock_qty: number;        // Decimal serialized to number
    min_stock: number;        // Decimal serialized to number
    image_url?: string | null;
    is_active: boolean;
    version: number;
    created_at: string;
    updated_at: string;
}

/**
 * Query params for product list
 */
export interface ProductListParams {
    page?: number;
    limit?: number;
    search?: string;
    category?: ProductCategory;
    is_active?: boolean;
    sort_by?: 'name' | 'code' | 'selling_price' | 'created_at' | 'stock_qty';
    sort_order?: 'asc' | 'desc';
}

/**
 * Product list response with pagination
 */
export interface ProductListResponse {
    items: Product[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

/**
 * Input for creating a new product
 */
export interface CreateProductInput {
    name: string;
    category: ProductCategory;
    unit?: string;
    selling_price?: number;
    purchase_price?: number;
    stock_qty?: number;
    min_stock?: number;
    image_url?: string;
    description?: string;
}

/**
 * Input for updating a product (with optimistic locking)
 */
export interface UpdateProductInput extends Partial<CreateProductInput> {
    version: number; // Required for optimistic locking
}
