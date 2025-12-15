// src/lib/validations/inventory.ts
// Validation schemas cho Inventory Management

import { z } from 'zod';

// Define movement types locally to avoid Prisma import issues
const StockMovementType = {
    IN: 'IN',
    OUT: 'OUT',
    ADJUST_IN: 'ADJUST_IN',
    ADJUST_OUT: 'ADJUST_OUT',
    TRANSFER: 'TRANSFER',
    RETURN: 'RETURN',
} as const;

const MAX_QUANTITY = 999_999_999;
const MAX_MONEY = 999_999_999_999;

// ==========================================
// STOCK LIST
// ==========================================

export const stockListSchema = z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    search: z.string().optional(),
    category: z.string().optional(),
    location_code: z.string().optional(),
    low_stock: z.coerce.boolean().optional(),
    out_of_stock: z.coerce.boolean().optional(),
    sort_by: z.enum(['name', 'quantity', 'total_value', 'updated_at']).optional().default('name'),
    sort_order: z.enum(['asc', 'desc']).optional().default('asc'),
});

// ==========================================
// STOCK MOVEMENT LIST
// ==========================================

export const stockMovementListSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    product_id: z.string().uuid().optional(),
    type: z.nativeEnum(StockMovementType).optional(),
    partner_id: z.string().uuid().optional(),
    date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    sort_by: z.enum(['date', 'code', 'quantity']).default('date'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
});

// ==========================================
// STOCK IN (NHẬP KHO)
// ==========================================

export const stockInSchema = z.object({
    product_id: z.string().uuid('ID sản phẩm không hợp lệ'),
    quantity: z.number()
        .positive('Số lượng phải lớn hơn 0')
        .max(MAX_QUANTITY, 'Số lượng quá lớn'),
    unit_price: z.number()
        .min(0, 'Đơn giá không được âm')
        .max(MAX_MONEY, 'Đơn giá quá lớn'),
    date: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ')
        .optional(),
    partner_id: z.string().uuid().optional(),
    location_code: z.string().max(50).optional().default('DEFAULT'),
    reason: z.string().max(255).optional(),
    notes: z.string().max(1000).optional(),
    transaction_id: z.string().uuid().optional(),
});

// ==========================================
// STOCK OUT (XUẤT KHO)
// ==========================================

export const stockOutSchema = z.object({
    product_id: z.string().uuid('ID sản phẩm không hợp lệ'),
    quantity: z.number()
        .positive('Số lượng phải lớn hơn 0')
        .max(MAX_QUANTITY, 'Số lượng quá lớn'),
    date: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ')
        .optional(),
    partner_id: z.string().uuid().optional(),
    location_code: z.string().max(50).optional().default('DEFAULT'),
    reason: z.string().max(255).optional(),
    notes: z.string().max(1000).optional(),
    transaction_id: z.string().uuid().optional(),
});

// ==========================================
// STOCK ADJUST (ĐIỀU CHỈNH)
// ==========================================

export const stockAdjustSchema = z.object({
    product_id: z.string().uuid('ID sản phẩm không hợp lệ'),
    new_quantity: z.number()
        .min(0, 'Số lượng không được âm')
        .max(MAX_QUANTITY, 'Số lượng quá lớn'),
    reason: z.string()
        .min(1, 'Vui lòng nhập lý do điều chỉnh')
        .max(255, 'Lý do quá dài'),
    notes: z.string().max(1000).optional(),
});

// ==========================================
// STOCK IMPORT (IMPORT EXCEL)
// ==========================================

const stockImportItemSchema = z.object({
    product_code: z.string().min(1, 'Mã sản phẩm không được trống'),
    quantity: z.number().positive('Số lượng phải lớn hơn 0'),
    unit_price: z.number().min(0, 'Đơn giá không được âm').optional().default(0),
});

export const stockImportSchema = z.object({
    type: z.enum(['IN', 'OUT']),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ'),
    items: z.array(stockImportItemSchema).min(1, 'Phải có ít nhất 1 sản phẩm'),
    partner_id: z.string().uuid().optional(),
    notes: z.string().max(1000).optional(),
});

// ==========================================
// STOCK COUNT (KIỂM KÊ)
// ==========================================

export const createStockCountSchema = z.object({
    count_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ'),
    product_ids: z.array(z.string().uuid()).optional(),
    notes: z.string().max(1000).optional(),
});

export const updateStockCountItemSchema = z.object({
    item_id: z.string().uuid(),
    counted_qty: z.number().min(0, 'Số lượng không được âm'),
    variance_reason: z.string().max(255).optional(),
});

export const completeStockCountSchema = z.object({
    stock_count_id: z.string().uuid(),
    auto_adjust: z.boolean().default(false),
});

// Export types
export type StockInInput = z.infer<typeof stockInSchema>;
export type StockOutInput = z.infer<typeof stockOutSchema>;
export type StockAdjustInput = z.infer<typeof stockAdjustSchema>;
export type StockImportInput = z.infer<typeof stockImportSchema>;
export type CreateStockCountInput = z.infer<typeof createStockCountSchema>;
