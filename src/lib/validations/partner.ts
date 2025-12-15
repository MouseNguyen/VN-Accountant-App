// src/lib/validations/partner.ts
// Validation schemas for Partner

import { z } from 'zod';
import { PHONE_REGEX, TAX_CODE_REGEX, EMAIL_REGEX } from '@/lib/constants/regex';

// Enum values for PartnerType
const PartnerTypeEnum = z.enum(['CUSTOMER', 'VENDOR', 'BOTH']);

// Max values
const MAX_MONEY = 99_999_999_999; // 99 tỷ

/**
 * Schema for creating a new partner
 */
export const createPartnerSchema = z.object({
    name: z
        .string()
        .min(1, 'Tên đối tác không được để trống')
        .max(200, 'Tên quá dài (tối đa 200 ký tự)')
        .transform((v) => v.trim()),

    partner_type: PartnerTypeEnum.default('CUSTOMER'),

    phone: z
        .string()
        .optional()
        .transform((v) => v?.replace(/\s/g, '') || undefined) // Remove whitespace
        .refine((val) => !val || PHONE_REGEX.test(val), 'Số điện thoại không hợp lệ'),

    email: z
        .string()
        .optional()
        .transform((v) => v?.toLowerCase().trim() || undefined)
        .refine((val) => !val || EMAIL_REGEX.test(val), 'Email không hợp lệ'),

    address: z
        .string()
        .max(500, 'Địa chỉ quá dài (tối đa 500 ký tự)')
        .optional()
        .transform((v) => v?.trim() || undefined),

    contact_name: z
        .string()
        .max(100, 'Tên người liên hệ quá dài (tối đa 100 ký tự)')
        .optional()
        .transform((v) => v?.trim() || undefined),

    company_name: z
        .string()
        .max(200, 'Tên công ty quá dài (tối đa 200 ký tự)')
        .optional()
        .transform((v) => v?.trim() || undefined),

    tax_code: z
        .string()
        .optional()
        .refine(
            (val) => !val || TAX_CODE_REGEX.test(val),
            'Mã số thuế không hợp lệ (10 hoặc 13 số)'
        ),

    notes: z
        .string()
        .max(1000, 'Ghi chú quá dài (tối đa 1000 ký tự)')
        .optional()
        .transform((v) => v?.trim() || undefined),

    credit_limit: z
        .number()
        .min(0, 'Hạn mức công nợ không được âm')
        .max(MAX_MONEY, 'Hạn mức quá lớn')
        .optional()
        .default(0),
});

/**
 * Schema for updating a partner (with optimistic locking)
 */
export const updatePartnerSchema = createPartnerSchema.partial().extend({
    version: z.number().int().min(1, 'Version không hợp lệ'),
});

/**
 * Schema for query params (URL search params)
 */
export const partnerQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    search: z.string().max(100).optional(),
    partner_type: PartnerTypeEnum.optional(),
    is_active: z
        .string()
        .transform((v) => v === 'true')
        .optional(),
    sort_by: z
        .enum(['name', 'code', 'balance', 'created_at'])
        .optional()
        .default('created_at'),
    sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreatePartnerInput = z.infer<typeof createPartnerSchema>;
export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>;
export type PartnerQueryInput = z.infer<typeof partnerQuerySchema>;
