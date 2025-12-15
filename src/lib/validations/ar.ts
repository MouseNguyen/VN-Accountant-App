// src/lib/validations/ar.ts
// Validation schemas for AR (Accounts Receivable)

import { z } from 'zod';

const MAX_MONEY = 999_999_999_999;

// ==========================================
// AR LIST
// ==========================================

export const arListSchema = z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    customer_id: z.string().uuid().optional(),
    type: z.enum(['INVOICE', 'PAYMENT', 'CREDIT_NOTE', 'WRITE_OFF']).optional(),
    status: z.enum(['UNPAID', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
    date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    overdue_only: z.coerce.boolean().optional(),
    search: z.string().optional(),
    sort_by: z.enum(['trans_date', 'due_date', 'amount', 'balance']).optional().default('trans_date'),
    sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ==========================================
// CREATE AR
// ==========================================

export const createARSchema = z.object({
    customer_id: z.string().uuid('ID khách hàng không hợp lệ'),
    amount: z
        .number()
        .positive('Số tiền phải lớn hơn 0')
        .max(MAX_MONEY, 'Số tiền quá lớn'),
    trans_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ'),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    description: z.string().max(500).optional(),
    transaction_id: z.string().uuid().optional(),
});

// ==========================================
// COLLECT PAYMENT
// ==========================================

export const collectPaymentSchema = z.object({
    customer_id: z.string().uuid('ID khách hàng không hợp lệ'),
    amount: z
        .number()
        .positive('Số tiền phải lớn hơn 0')
        .max(MAX_MONEY, 'Số tiền quá lớn'),
    payment_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ')
        .optional()
        .default(() => new Date().toISOString().split('T')[0]),
    payment_method: z.enum(['CASH', 'BANK_TRANSFER', 'MOMO', 'ZALO_PAY', 'CREDIT']).default('CASH'),
    invoice_ids: z.array(z.string().uuid()).optional(),
    auto_allocate: z.boolean().optional().default(true),
    notes: z.string().max(500).optional(),
});

// ==========================================
// ALLOCATE PAYMENT
// ==========================================

export const allocatePaymentSchema = z.object({
    payment_id: z.string().uuid(),
    allocations: z
        .array(
            z.object({
                invoice_id: z.string().uuid(),
                amount: z.number().positive(),
            })
        )
        .min(1, 'Phải có ít nhất 1 phân bổ'),
});

// ==========================================
// CUSTOMER AR PARAMS
// ==========================================

export const customerARParamsSchema = z.object({
    customerId: z.string().uuid('ID khách hàng không hợp lệ'),
});

// Export types
export type ARListInput = z.infer<typeof arListSchema>;
export type CreateARInput = z.infer<typeof createARSchema>;
export type CollectPaymentInput = z.infer<typeof collectPaymentSchema>;
export type AllocatePaymentInput = z.infer<typeof allocatePaymentSchema>;
