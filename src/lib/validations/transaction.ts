// src/lib/validations/transaction.ts
// Zod schemas cho Transaction validation

import { z } from 'zod';
import { TransactionType, PaymentMethod, PaymentStatus } from '@prisma/client';

// ==========================================
// CONSTANTS
// ==========================================

export const TRANSACTION_CONSTANTS = {
    MAX_MONEY: 999_999_999_999,    // ~1000 tỷ VND
    MAX_QUANTITY: 999_999_999,
    MAX_ITEMS: 100,
    DATE_RANGE_PAST: 30,           // Cho phép ngày trong quá khứ 30 ngày
    DATE_RANGE_FUTURE: 7,          // Cho phép ngày trong tương lai 7 ngày
    TRANSACTION_TIMEOUT: 15000,    // 15 giây timeout cho DB transaction
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Kiểm tra trans_date có nằm trong khoảng hợp lệ không
 */
function isValidTransDate(dateStr: string): boolean {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;

    const now = new Date();

    const minDate = new Date(now);
    minDate.setDate(minDate.getDate() - TRANSACTION_CONSTANTS.DATE_RANGE_PAST);
    minDate.setHours(0, 0, 0, 0);

    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() + TRANSACTION_CONSTANTS.DATE_RANGE_FUTURE);
    maxDate.setHours(23, 59, 59, 999);

    return date >= minDate && date <= maxDate;
}

// ==========================================
// TRANSACTION ITEM SCHEMA
// ==========================================

export const transactionItemSchema = z.object({
    product_id: z.string().uuid().optional().nullable(),
    description: z.string().max(500).optional().nullable().transform((v) => v?.trim() || null),
    quantity: z
        .number()
        .positive('Số lượng phải lớn hơn 0')
        .max(TRANSACTION_CONSTANTS.MAX_QUANTITY, 'Số lượng quá lớn'),
    unit: z.string().max(20).default('kg').transform((v) => v.trim()),
    unit_price: z
        .number()
        .min(0, 'Đơn giá không được âm')
        .max(TRANSACTION_CONSTANTS.MAX_MONEY, 'Đơn giá quá lớn'),
    tax_rate: z.number().min(0).max(100).default(0),
    discount_percent: z.number().min(0).max(100).default(0),
}).refine(
    (data) => data.product_id || data.description,
    { message: 'Phải chọn sản phẩm hoặc nhập mô tả', path: ['product_id'] }
);

export type TransactionItemInput = z.infer<typeof transactionItemSchema>;

// ==========================================
// CREATE TRANSACTION SCHEMA
// ==========================================

export const createTransactionSchema = z.object({
    trans_type: z.nativeEnum(TransactionType, {
        message: 'Loại giao dịch không hợp lệ',
    }),

    trans_date: z.string()
        .refine((v) => !isNaN(new Date(v).getTime()), 'Ngày không hợp lệ')
        .refine(
            isValidTransDate,
            `Ngày phải trong khoảng ${TRANSACTION_CONSTANTS.DATE_RANGE_PAST} ngày trước đến ${TRANSACTION_CONSTANTS.DATE_RANGE_FUTURE} ngày sau`
        )
        .optional()
        .default(() => new Date().toISOString()),

    partner_id: z.string().uuid().optional().nullable(),

    description: z.string().max(1000).optional().nullable().transform((v) => v?.trim() || null),

    items: z
        .array(transactionItemSchema)
        .min(1, 'Cần ít nhất 1 sản phẩm')
        .max(TRANSACTION_CONSTANTS.MAX_ITEMS, `Tối đa ${TRANSACTION_CONSTANTS.MAX_ITEMS} sản phẩm`),

    payment_method: z.nativeEnum(PaymentMethod).default('CASH'),

    paid_amount: z
        .number()
        .min(0, 'Số tiền thanh toán không được âm')
        .max(TRANSACTION_CONSTANTS.MAX_MONEY)
        .default(0),

    payment_note: z.string().max(500).optional().nullable(),

    discount_amount: z
        .number()
        .min(0, 'Giảm giá không được âm')
        .max(TRANSACTION_CONSTANTS.MAX_MONEY)
        .default(0),
}).refine(
    (data) => {
        // Kiểm tra tổng tiền không vượt quá giới hạn
        const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
        return subtotal <= TRANSACTION_CONSTANTS.MAX_MONEY;
    },
    { message: 'Tổng tiền vượt quá giới hạn cho phép', path: ['items'] }
);

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

// ==========================================
// UPDATE TRANSACTION SCHEMA
// ==========================================

export const updateTransactionSchema = z.object({
    version: z.number().int().positive('Version không hợp lệ'),

    trans_date: z.string()
        .refine((v) => !isNaN(new Date(v).getTime()), 'Ngày không hợp lệ')
        .refine(isValidTransDate, 'Ngày nằm ngoài khoảng cho phép')
        .optional(),

    partner_id: z.string().uuid().optional().nullable(),

    description: z.string().max(1000).optional().nullable(),

    items: z
        .array(transactionItemSchema)
        .min(1, 'Cần ít nhất 1 sản phẩm')
        .max(TRANSACTION_CONSTANTS.MAX_ITEMS)
        .optional(),

    payment_method: z.nativeEnum(PaymentMethod).optional(),

    paid_amount: z
        .number()
        .min(0)
        .max(TRANSACTION_CONSTANTS.MAX_MONEY)
        .optional(),

    payment_note: z.string().max(500).optional().nullable(),

    discount_amount: z
        .number()
        .min(0)
        .max(TRANSACTION_CONSTANTS.MAX_MONEY)
        .optional(),
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

// ==========================================
// QUERY SCHEMA (for GET list)
// ==========================================

export const transactionQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().max(100).optional(),
    trans_type: z.nativeEnum(TransactionType).optional(),
    payment_status: z.nativeEnum(PaymentStatus).optional(),
    partner_id: z.string().uuid().optional(),
    date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD').optional(),
    date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD').optional(),
    sort_by: z.enum(['trans_date', 'code', 'total_amount', 'created_at']).default('trans_date'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export type TransactionQueryInput = z.infer<typeof transactionQuerySchema>;

// ==========================================
// ADD PAYMENT SCHEMA
// ==========================================

export const addPaymentSchema = z.object({
    amount: z
        .number()
        .positive('Số tiền phải lớn hơn 0')
        .max(TRANSACTION_CONSTANTS.MAX_MONEY, 'Số tiền quá lớn'),
    payment_method: z.nativeEnum(PaymentMethod).default('CASH'),
    note: z.string().max(500).optional(),
});

export type AddPaymentInput = z.infer<typeof addPaymentSchema>;

// ==========================================
// BULK DELETE SCHEMA
// ==========================================

export const bulkDeleteTransactionsSchema = z.object({
    ids: z
        .array(z.string().uuid())
        .min(1, 'Chọn ít nhất 1 giao dịch')
        .max(50, 'Tối đa 50 giao dịch mỗi lần xóa'),
});

export type BulkDeleteTransactionsInput = z.infer<typeof bulkDeleteTransactionsSchema>;

// ==========================================
// SUMMARY QUERY SCHEMA
// ==========================================

export const summaryQuerySchema = z.object({
    period: z.enum(['today', 'week', 'month', 'year']).default('month'),
});

export const dailySummaryQuerySchema = z.object({
    days: z.coerce.number().int().min(1).max(365).default(30),
});

// ==========================================
// TRANSACTION SUMMARY QUERY SCHEMA
// ==========================================

export const transactionSummaryQuerySchema = z.object({
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD').optional(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD').optional(),
}).refine(
    (data) => {
        if (data.start_date && data.end_date) {
            return new Date(data.start_date) <= new Date(data.end_date);
        }
        return true;
    },
    { message: 'start_date phải trước hoặc bằng end_date', path: ['start_date'] }
);

export type TransactionSummaryQueryInput = z.infer<typeof transactionSummaryQuerySchema>;

// ==========================================
// TRANSACTION EXPORT QUERY SCHEMA
// ==========================================

export const transactionExportQuerySchema = z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD').optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD').optional(),
    trans_type: z.enum(['INCOME', 'EXPENSE', 'CASH_IN', 'CASH_OUT', 'all']).default('all'),
}).refine(
    (data) => {
        if (data.from && data.to) {
            return new Date(data.from) <= new Date(data.to);
        }
        return true;
    },
    { message: 'from phải trước hoặc bằng to', path: ['from'] }
);

export type TransactionExportQueryInput = z.infer<typeof transactionExportQuerySchema>;
