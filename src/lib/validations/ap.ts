// src/lib/validations/ap.ts
// Validation schemas for AP (Accounts Payable)

import { z } from 'zod';

const MAX_MONEY = 999_999_999_999;

// ==========================================
// AP LIST
// ==========================================

export const apListSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    vendor_id: z.string().uuid().optional(),
    type: z.enum(['INVOICE', 'PAYMENT', 'DEBIT_NOTE', 'WRITE_OFF']).optional(),
    status: z.enum(['UNPAID', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
    date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    overdue_only: z.coerce.boolean().optional(),
    search: z.string().optional(),
    sort_by: z.enum(['trans_date', 'due_date', 'amount', 'balance']).default('trans_date'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
});

// ==========================================
// CREATE AP
// ==========================================

export const createAPSchema = z
    .object({
        vendor_id: z.string().uuid('ID NCC không hợp lệ'),
        amount: z.number().positive('Số tiền phải lớn hơn 0').max(MAX_MONEY, 'Số tiền quá lớn'),
        trans_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ'),
        due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        description: z.string().max(500).optional(),
        transaction_id: z.string().uuid().optional(),
    })
    .refine(
        (data) => {
            // Validate due_date >= trans_date
            if (data.due_date && data.trans_date) {
                return new Date(data.due_date) >= new Date(data.trans_date);
            }
            return true;
        },
        {
            message: 'Hạn thanh toán phải từ ngày giao dịch trở đi',
            path: ['due_date'],
        }
    );

// ==========================================
// MAKE PAYMENT
// ==========================================

export const makePaymentSchema = z.object({
    vendor_id: z.string().uuid('ID NCC không hợp lệ'),
    amount: z.number().positive('Số tiền phải lớn hơn 0').max(MAX_MONEY, 'Số tiền quá lớn'),
    payment_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ')
        .default(() => new Date().toISOString().split('T')[0]),
    payment_method: z.enum(['CASH', 'BANK']),
    account_id: z.string().uuid('ID tài khoản không hợp lệ'),
    invoice_ids: z.array(z.string().uuid()).optional(),
    auto_allocate: z.boolean().default(true),
    notes: z.string().max(500).optional(),
});

// ==========================================
// CASH FLOW PARAMS
// ==========================================

export const cashFlowQuerySchema = z.object({
    days: z.coerce.number().int().min(7).max(90).default(30),
});

// Export types
export type APListInput = z.infer<typeof apListSchema>;
export type CreateAPInput = z.infer<typeof createAPSchema>;
export type MakePaymentInput = z.infer<typeof makePaymentSchema>;
