// src/lib/validations/product.ts
// Validation schemas for Product

import { z } from 'zod';

// Enum values for ProductCategory
const ProductCategoryEnum = z.enum([
    'NONG_SAN',
    'VAT_TU',
    'MENU',
    'NGUYEN_LIEU',
    'OTHER',
]);

// Max values
const MAX_MONEY = 99_999_999_999; // 99 tỷ
const MAX_QUANTITY = 999_999_999;

/**
 * Schema for creating a new product
 */
export const createProductSchema = z.object({
    name: z
        .string()
        .min(1, 'Tên sản phẩm không được để trống')
        .max(200, 'Tên quá dài (tối đa 200 ký tự)')
        .transform((v) => v.trim()),

    category: ProductCategoryEnum.default('NONG_SAN'),

    unit: z
        .string()
        .max(20, 'Đơn vị quá dài (tối đa 20 ký tự)')
        .transform((v) => v.trim())
        .optional()
        .default('kg'),

    selling_price: z
        .number()
        .min(0, 'Giá bán không được âm')
        .max(MAX_MONEY, 'Giá bán quá lớn')
        .optional()
        .default(0),

    purchase_price: z
        .number()
        .min(0, 'Giá nhập không được âm')
        .max(MAX_MONEY, 'Giá nhập quá lớn')
        .optional()
        .default(0),

    stock_qty: z
        .number()
        .min(0, 'Số lượng tồn không được âm')
        .max(MAX_QUANTITY, 'Số lượng quá lớn')
        .optional()
        .default(0),

    min_stock: z
        .number()
        .min(0, 'Tồn kho tối thiểu không được âm')
        .max(MAX_QUANTITY, 'Số lượng quá lớn')
        .optional()
        .default(0),

    image_url: z
        .string()
        .url('URL hình ảnh không hợp lệ')
        .optional()
        .or(z.literal(''))
        .transform((v) => (v === '' ? undefined : v)),

    description: z
        .string()
        .max(1000, 'Mô tả quá dài (tối đa 1000 ký tự)')
        .optional()
        .transform((v) => v?.trim() || undefined),
});

/**
 * Schema for updating a product (with optimistic locking)
 */
export const updateProductSchema = createProductSchema.partial().extend({
    version: z.number().int().min(1, 'Version không hợp lệ'),
});

/**
 * Schema for query params (URL search params)
 */
export const productQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    search: z.string().max(100).optional(),
    category: ProductCategoryEnum.optional(),
    is_active: z
        .string()
        .transform((v) => v === 'true')
        .optional(),
    sort_by: z
        .enum(['name', 'code', 'selling_price', 'created_at', 'stock_qty'])
        .optional()
        .default('created_at'),
    sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
