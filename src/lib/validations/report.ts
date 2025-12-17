// src/lib/validations/report.ts
// Zod schemas cho Report validation

import { z } from 'zod';

// ==========================================
// INCOME/EXPENSE REPORT
// ==========================================

export const incomeExpenseReportSchema = z
    .object({
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày bắt đầu không hợp lệ'),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày kết thúc không hợp lệ'),
        group_by: z.enum(['day', 'week', 'month']).default('day'),
        include_drill_down: z
            .string()
            .optional()
            .transform((v) => v === 'true')
            .default(false),
    })
    .refine((data) => new Date(data.from) <= new Date(data.to), {
        message: 'Ngày bắt đầu phải trước ngày kết thúc',
        path: ['from'],
    })
    .refine(
        (data) => {
            const diffDays = Math.ceil(
                (new Date(data.to).getTime() - new Date(data.from).getTime()) /
                (1000 * 60 * 60 * 24)
            );
            return diffDays <= 3650; // 10 years max for "Tất cả" option
        },
        { message: 'Khoảng thời gian tối đa là 10 năm', path: ['to'] }
    );

// ==========================================
// PROFIT/LOSS REPORT
// ==========================================

export const profitLossReportSchema = z
    .object({
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        include_drill_down: z
            .string()
            .optional()
            .transform((v) => v === 'true')
            .default(false),
    })
    .refine((data) => new Date(data.from) <= new Date(data.to), {
        message: 'Ngày không hợp lệ',
    });

// ==========================================
// INVENTORY REPORT
// ==========================================

export const inventoryReportSchema = z.object({
    category: z.string().optional(),
    low_stock_only: z
        .string()
        .optional()
        .transform((v) => v === 'true')
        .default(false),
    include_zero_stock: z
        .string()
        .optional()
        .transform((v) => v === 'true')
        .default(false),
});

// ==========================================
// EXPORT REPORT
// ==========================================

export const exportReportSchema = z.object({
    report_type: z.enum(['income_expense', 'profit_loss', 'inventory', 'payable']),
    format: z.enum(['excel', 'json']).default('excel'),
    from: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    to: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
});

// ==========================================
// TYPE EXPORTS
// ==========================================

export type IncomeExpenseReportInput = z.infer<typeof incomeExpenseReportSchema>;
export type ProfitLossReportInput = z.infer<typeof profitLossReportSchema>;
export type InventoryReportInput = z.infer<typeof inventoryReportSchema>;
export type ExportReportInput = z.infer<typeof exportReportSchema>;
