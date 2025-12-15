// src/lib/validations/payroll.ts
import { z } from 'zod';

// Inline enums to avoid Prisma client export issues
const PayrollStatuses = ['DRAFT', 'PENDING', 'APPROVED', 'PAID', 'CANCELLED'] as const;
const PaymentMethods = ['CASH', 'BANK_TRANSFER', 'MOMO', 'ZALO_PAY', 'CREDIT', 'OTHER'] as const;

const MAX_MONEY = 999_999_999_999;

export const payrollQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(PayrollStatuses).optional(),
    period_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    period_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    sort_by: z.enum(['period_start', 'created_at', 'total_net']).default('period_start'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export const createPayrollSchema = z.object({
    period_start: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày bắt đầu không hợp lệ'),

    period_end: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày kết thúc không hợp lệ'),

    period_type: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']).default('MONTHLY'),

    worker_ids: z
        .array(z.string().uuid())
        .optional(),

    note: z.string().max(1000).optional(),
}).refine(
    (data) => new Date(data.period_start) <= new Date(data.period_end),
    { message: 'Ngày bắt đầu phải trước ngày kết thúc', path: ['period_start'] }
);

const allowanceSchema = z.object({
    name: z.string().min(1).max(100),
    amount: z.number().min(0).max(MAX_MONEY),
});

const deductionSchema = z.object({
    name: z.string().min(1).max(100),
    amount: z.number().min(0).max(MAX_MONEY),
});

export const updatePayrollItemSchema = z.object({
    allowances: z.array(allowanceSchema).max(10).optional(),
    deductions: z.array(deductionSchema).max(10).optional(),
    note: z.string().max(500).optional(),
});

export const payrollPaymentSchema = z.object({
    amount: z
        .number()
        .positive('Số tiền phải lớn hơn 0')
        .max(MAX_MONEY, 'Số tiền quá lớn'),

    payment_method: z.enum(PaymentMethods).default('CASH'),

    payment_date: z.string().datetime().optional(),

    note: z.string().max(500).optional(),
});

export type PayrollQueryInput = z.infer<typeof payrollQuerySchema>;
export type CreatePayrollInput = z.infer<typeof createPayrollSchema>;
export type UpdatePayrollItemInput = z.infer<typeof updatePayrollItemSchema>;
export type PayrollPaymentInput = z.infer<typeof payrollPaymentSchema>;

