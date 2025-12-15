// src/lib/validations/farm.ts
// Validation schemas cho Farm management

import { z } from 'zod';
import { PHONE_REGEX, TAX_CODE_REGEX } from '@/lib/constants/regex';

/**
 * Schema cập nhật thông tin Farm
 * Chỉ OWNER được phép gọi API này
 */
export const updateFarmSchema = z.object({
    name: z
        .string()
        .min(2, 'Tên phải có ít nhất 2 ký tự')
        .max(200, 'Tên quá dài')
        .transform((v) => v.trim()),

    owner_name: z
        .string()
        .min(2, 'Tên chủ sở hữu phải có ít nhất 2 ký tự')
        .max(100, 'Tên quá dài')
        .transform((v) => v.trim()),

    phone: z
        .string()
        .optional()
        .refine(
            (val) => !val || PHONE_REGEX.test(val.replace(/\s/g, '')),
            'Số điện thoại không hợp lệ (VD: 0901234567)'
        )
        .transform((v) => v?.replace(/\s/g, '')),

    email: z
        .string()
        .email('Email không hợp lệ')
        .optional()
        .or(z.literal(''))
        .transform((v) => (v ? v.toLowerCase().trim() : undefined)),

    address: z
        .string()
        .max(500, 'Địa chỉ quá dài')
        .optional()
        .transform((v) => v?.trim()),

    tax_code: z
        .string()
        .optional()
        .or(z.literal(''))
        .refine(
            (val) => !val || TAX_CODE_REGEX.test(val),
            'Mã số thuế không hợp lệ (10 hoặc 13 số)'
        ),

    fiscal_year_start: z.number().min(1).max(12).optional(),
});

export type UpdateFarmInput = z.infer<typeof updateFarmSchema>;

/**
 * Schema đổi Business Type
 * Cần confirm vì thao tác này ảnh hưởng đến toàn bộ giao diện
 */
export const changeBusinessTypeSchema = z.object({
    business_type: z.enum(['FARM', 'RETAIL_FNB'] as const),
    confirm: z.literal(true),
});

export type ChangeBusinessTypeInput = z.infer<typeof changeBusinessTypeSchema>;
