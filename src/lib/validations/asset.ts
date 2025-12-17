// src/lib/validations/asset.ts
// Zod validation schemas for Fixed Assets

import { z } from 'zod';

// ==========================================
// ENUMS
// ==========================================

export const AssetCategoryEnum = z.enum([
    'MACHINERY',
    'VEHICLE',
    'BUILDING',
    'EQUIPMENT',
    'LIVESTOCK',
    'OTHER',
]);

export const AssetStatusEnum = z.enum([
    'ACTIVE',
    'DISPOSED',
    'SOLD',
    'UNDER_REPAIR',
]);

export const DepreciationMethodEnum = z.enum([
    'STRAIGHT_LINE',
    'DECLINING_BALANCE',
]);

// ==========================================
// CREATE ASSET
// ==========================================

export const createAssetSchema = z.object({
    code: z.string().max(50).optional(),
    name: z.string().min(1, 'Tên tài sản là bắt buộc').max(200),
    category: AssetCategoryEnum,
    purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày mua không hợp lệ')
        .refine((date) => {
            const d = new Date(date);
            return d <= new Date();
        }, 'Ngày mua không thể ở tương lai'),
    purchase_price: z.number()
        .positive('Giá mua phải lớn hơn 0')
        .max(100_000_000_000_000, 'Giá mua quá lớn'), // 100 tỷ max
    useful_life_months: z.number()
        .int('Thời gian khấu hao phải là số nguyên')
        .min(12, 'Thời gian khấu hao tối thiểu 12 tháng')
        .max(600, 'Thời gian khấu hao tối đa 50 năm')
        .optional(),
    depreciation_method: DepreciationMethodEnum.optional(),
    residual_value: z.number()
        .min(0, 'Giá trị còn lại không thể âm')
        .optional(),
    supplier: z.string().max(200).optional(),
    invoice_number: z.string().max(50).optional(),
    location: z.string().max(200).optional(),
    serial_number: z.string().max(100).optional(),
    image_url: z.string().url('URL ảnh không hợp lệ').optional().nullable(),
    is_transport_biz: z.boolean().optional(),
});

export type CreateAssetSchema = z.infer<typeof createAssetSchema>;

// ==========================================
// UPDATE ASSET
// ==========================================

export const updateAssetSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    category: AssetCategoryEnum.optional(),
    useful_life_months: z.number()
        .int()
        .min(12)
        .max(600)
        .optional(),
    residual_value: z.number().min(0).optional(),
    location: z.string().max(200).optional(),
    serial_number: z.string().max(100).optional(),
    image_url: z.string().url().optional().nullable(),
    status: AssetStatusEnum.optional(),
});

export type UpdateAssetSchema = z.infer<typeof updateAssetSchema>;

// ==========================================
// DISPOSE ASSET
// ==========================================

export const disposeAssetSchema = z.object({
    disposed_value: z.number()
        .min(0, 'Giá thanh lý không thể âm')
        .optional(),
    disposal_reason: z.string().max(500).optional(),
    disposed_at: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày thanh lý không hợp lệ')
        .optional(),
});

export type DisposeAssetSchema = z.infer<typeof disposeAssetSchema>;

// ==========================================
// FILTERS
// ==========================================

export const assetFiltersSchema = z.object({
    status: AssetStatusEnum.optional(),
    category: AssetCategoryEnum.optional(),
    search: z.string().max(100).optional(),
    from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export type AssetFiltersSchema = z.infer<typeof assetFiltersSchema>;

// ==========================================
// DEPRECIATION
// ==========================================

export const runDepreciationSchema = z.object({
    period: z.string()
        .regex(/^\d{4}-\d{2}$/, 'Kỳ khấu hao phải có định dạng YYYY-MM')
        .optional(),
});

export type RunDepreciationSchema = z.infer<typeof runDepreciationSchema>;

export const depreciationScheduleFiltersSchema = z.object({
    asset_id: z.string().uuid().optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export type DepreciationScheduleFiltersSchema = z.infer<typeof depreciationScheduleFiltersSchema>;
