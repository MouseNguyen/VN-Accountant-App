// src/types/partner.ts
// Shared types for Partner between Backend and Frontend

import type { PartnerType, SupplierStatus } from '@prisma/client';

/**
 * Partner entity (serialized for JSON)
 */
export interface Partner {
    id: string;
    code: string;
    name: string;
    partner_type: PartnerType;
    // Tax Engine 2025: VAT_SUPPLIER_STATUS rule
    supplier_status?: SupplierStatus;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    contact_name?: string | null;
    company_name?: string | null;
    tax_code?: string | null;
    notes?: string | null;
    credit_limit: number;   // Decimal serialized to number
    balance: number;        // Decimal serialized to number
    is_active: boolean;
    version: number;
    created_at: string;
    updated_at: string;
}

/**
 * Query params for partner list
 */
export interface PartnerListParams {
    page?: number;
    limit?: number;
    search?: string;
    partner_type?: PartnerType;
    is_active?: boolean;
    sort_by?: 'name' | 'code' | 'balance' | 'created_at';
    sort_order?: 'asc' | 'desc';
}

/**
 * Partner list response with pagination
 */
export interface PartnerListResponse {
    items: Partner[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

/**
 * Input for creating a new partner
 */
export interface CreatePartnerInput {
    name: string;
    partner_type: PartnerType;
    // Tax Engine 2025: VAT_SUPPLIER_STATUS rule
    supplier_status?: SupplierStatus;
    phone?: string;
    email?: string;
    address?: string;
    contact_name?: string;
    company_name?: string;
    tax_code?: string;
    notes?: string;
    credit_limit?: number;
}

/**
 * Input for updating a partner (with optimistic locking)
 */
export interface UpdatePartnerInput extends Partial<CreatePartnerInput> {
    version: number; // Required for optimistic locking
}
