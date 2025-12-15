// src/lib/validations/user.ts
// Validation schemas cho User management

import { z } from 'zod';
import { PHONE_REGEX } from '@/lib/constants/regex';


/**
 * Schema cập nhật thông tin User cá nhân
 */
export const updateUserSchema = z.object({
    full_name: z
        .string()
        .min(2, 'Họ tên phải có ít nhất 2 ký tự')
        .max(100, 'Họ tên quá dài')
        .transform((v) => v.trim()),

    phone: z
        .string()
        .optional()
        .or(z.literal(''))
        .refine(
            (val) => !val || PHONE_REGEX.test(val.replace(/\s/g, '')),
            'Số điện thoại không hợp lệ'
        )
        .transform((v) => (v ? v.replace(/\s/g, '') : undefined)),

    avatar_url: z.string().optional().or(z.literal('')).nullable(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/**
 * Schema đổi email
 * Cần verify lại email mới
 */
export const changeEmailSchema = z.object({
    new_email: z
        .string()
        .email('Email không hợp lệ')
        .transform((v) => v.toLowerCase().trim()),

    password: z.string().min(1, 'Vui lòng nhập mật khẩu để xác nhận'),
});

export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;
