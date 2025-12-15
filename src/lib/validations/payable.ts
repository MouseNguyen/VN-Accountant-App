// src/lib/validations/payable.ts
// Zod schemas cho Payable validation

import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

const MAX_MONEY = 999_999_999_999;

// ==========================================
// QUERY SCHEMAS
// ==========================================

export const payableQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    partner_type: z.enum(['CUSTOMER', 'VENDOR']).optional(),
    search: z.string().optional(),
    is_overdue: z
        .string()
        .optional()
        .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
    min_balance: z.coerce.number().min(0).optional(),
    include_invoices: z
        .string()
        .optional()
        .transform((v) => v === 'true')
        .default(false),
    sort_by: z.enum(['balance', 'name', 'overdue_days']).default('balance'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export const paymentHistoryQuerySchema = z.object({
    partner_id: z.string().uuid().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    date_from: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    date_to: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
});

// ==========================================
// PAYMENT SCHEMAS
// ==========================================

export const payDebtSchema = z.object({
    partner_id: z.string().uuid('ID đối tác không hợp lệ'),

    amount: z.number().positive('Số tiền phải lớn hơn 0').max(MAX_MONEY, 'Số tiền quá lớn'),

    payment_method: z.nativeEnum(PaymentMethod).default('CASH'),

    payment_date: z.string().datetime().optional(),

    note: z
        .string()
        .max(500, 'Ghi chú quá dài')
        .optional()
        .transform((v) => v?.trim() || null),
});

export const bulkPayDebtSchema = z.object({
    payments: z
        .array(
            z.object({
                partner_id: z.string().uuid(),
                amount: z.number().positive().max(MAX_MONEY),
            })
        )
        .min(1, 'Phải có ít nhất 1 khoản thanh toán')
        .max(50, 'Tối đa 50 khoản thanh toán'),

    payment_method: z.nativeEnum(PaymentMethod).default('CASH'),
    payment_date: z.string().datetime().optional(),
    note: z.string().max(500).optional(),
});

export const updateCreditLimitSchema = z.object({
    credit_limit: z.number().min(0, 'Hạn mức không được âm').max(MAX_MONEY, 'Hạn mức quá lớn'),

    payment_term_days: z
        .number()
        .int()
        .min(0, 'Số ngày không được âm')
        .max(365, 'Tối đa 365 ngày')
        .default(30),
});

// ==========================================
// TYPE EXPORTS
// ==========================================

export type PayableQueryInput = z.infer<typeof payableQuerySchema>;
export type PaymentHistoryQueryInput = z.infer<typeof paymentHistoryQuerySchema>;
export type PayDebtInput = z.infer<typeof payDebtSchema>;
export type BulkPayDebtInput = z.infer<typeof bulkPayDebtSchema>;
export type UpdateCreditLimitInput = z.infer<typeof updateCreditLimitSchema>;
