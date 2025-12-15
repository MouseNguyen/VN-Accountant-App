// src/lib/validations/auth.ts
// Validation schemas cho authentication

import { z } from 'zod';

// ==========================================
// PASSWORD SCHEMA
// ==========================================

/**
 * Schema cho password có độ phức tạp cao
 * - Min 8 ký tự
 * - Có ít nhất 1 chữ hoa
 * - Có ít nhất 1 chữ thường
 * - Có ít nhất 1 số
 */
const passwordSchema = z
    .string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ hoa')
    .regex(/[a-z]/, 'Mật khẩu phải có ít nhất 1 chữ thường')
    .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 số');

// ==========================================
// REGISTER SCHEMA
// ==========================================

export const registerSchema = z
    .object({
        email: z
            .string()
            .email('Email không hợp lệ')
            .transform((v) => v.toLowerCase().trim()),
        password: passwordSchema,
        confirm_password: z.string(),
        full_name: z
            .string()
            .min(2, 'Họ tên phải có ít nhất 2 ký tự')
            .max(100, 'Họ tên tối đa 100 ký tự'),
        farm_name: z
            .string()
            .min(2, 'Tên nông trại/doanh nghiệp phải có ít nhất 2 ký tự')
            .max(200, 'Tên tối đa 200 ký tự'),
        business_type: z.enum(['FARM', 'RETAIL_FNB'] as const),
        phone: z.string().optional(),
    })
    .refine((data) => data.password === data.confirm_password, {
        message: 'Mật khẩu nhập lại không khớp',
        path: ['confirm_password'],
    });

export type RegisterInput = z.infer<typeof registerSchema>;

// ==========================================
// LOGIN SCHEMA
// ==========================================

export const loginSchema = z.object({
    email: z
        .string()
        .email('Email không hợp lệ')
        .transform((v) => v.toLowerCase().trim()),
    password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
    remember_me: z.boolean().default(false),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ==========================================
// VERIFY EMAIL SCHEMA
// ==========================================

export const verifyEmailSchema = z.object({
    token: z
        .string()
        .length(6, 'Mã xác thực phải có 6 số')
        .regex(/^[0-9]+$/, 'Mã xác thực chỉ chứa số'),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

// ==========================================
// RESEND VERIFICATION SCHEMA
// ==========================================

export const resendVerificationSchema = z.object({
    email: z
        .string()
        .email('Email không hợp lệ')
        .transform((v) => v.toLowerCase().trim())
        .optional(),
});

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

// ==========================================
// FORGOT PASSWORD SCHEMA
// ==========================================

export const forgotPasswordSchema = z.object({
    email: z
        .string()
        .email('Email không hợp lệ')
        .transform((v) => v.toLowerCase().trim()),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// ==========================================
// RESET PASSWORD SCHEMA
// ==========================================

export const resetPasswordSchema = z
    .object({
        token: z.string().min(1, 'Token không hợp lệ'),
        password: passwordSchema,
        confirm_password: z.string(),
    })
    .refine((data) => data.password === data.confirm_password, {
        message: 'Mật khẩu nhập lại không khớp',
        path: ['confirm_password'],
    });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ==========================================
// CHANGE PASSWORD SCHEMA
// ==========================================

export const changePasswordSchema = z
    .object({
        current_password: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
        new_password: passwordSchema,
        confirm_password: z.string(),
    })
    .refine((data) => data.new_password === data.confirm_password, {
        message: 'Mật khẩu nhập lại không khớp',
        path: ['confirm_password'],
    })
    .refine((data) => data.current_password !== data.new_password, {
        message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
        path: ['new_password'],
    });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ==========================================
// EXPORTS
// ==========================================

export { passwordSchema };
