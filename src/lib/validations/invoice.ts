// src/lib/validations/invoice.ts
import { z } from 'zod';

// Inline enums to avoid Prisma client export issues
const InvoiceStatuses = ['DRAFT', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'] as const;
const PaymentMethods = ['CASH', 'BANK_TRANSFER', 'MOMO', 'ZALO_PAY', 'CREDIT', 'OTHER'] as const;

// ==========================================
// UPLOAD INVOICE
// ==========================================
export const uploadInvoiceSchema = z.object({
    // Base64 image
    image: z
        .string()
        .min(1, 'Vui lòng chọn ảnh hóa đơn'),

    auto_create_transaction: z.boolean().default(false),
});

// ==========================================
// CONFIRM INVOICE
// ==========================================
export const confirmInvoiceSchema = z.object({
    invoice_id: z.string().uuid('ID hóa đơn không hợp lệ'),

    // Thông tin hóa đơn (có thể sửa)
    invoice_number: z
        .string()
        .max(100, 'Số hóa đơn quá dài')
        .optional(),

    invoice_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ')
        .optional(),

    supplier_name: z
        .string()
        .max(255, 'Tên nhà cung cấp quá dài')
        .optional(),

    supplier_tax_code: z
        .string()
        .regex(/^\d{10}(\d{3})?$/, 'MST không hợp lệ (10 hoặc 13 số)')
        .optional()
        .or(z.literal('')),

    total_amount: z
        .number()
        .positive('Tổng tiền phải lớn hơn 0')
        .max(999_999_999_999, 'Số tiền quá lớn')
        .optional(),

    tax_amount: z
        .number()
        .min(0, 'Tiền thuế không được âm')
        .max(999_999_999_999, 'Số tiền quá lớn')
        .optional(),

    // Thông tin tạo Transaction
    partner_id: z
        .string()
        .uuid('ID đối tác không hợp lệ')
        .optional(),

    create_partner: z.boolean().default(false),

    payment_method: z
        .enum(PaymentMethods)
        .default('CASH'),

    paid_amount: z
        .number()
        .min(0)
        .optional(),

    note: z
        .string()
        .max(500, 'Ghi chú quá dài')
        .optional(),
});

// ==========================================
// LIST INVOICES
// ==========================================
export const invoiceListSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(InvoiceStatuses).optional(),
    date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    search: z.string().optional(),
    sort_by: z.enum(['created_at', 'invoice_date', 'total_amount']).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export type UploadInvoiceInput = z.infer<typeof uploadInvoiceSchema>;
export type ConfirmInvoiceInput = z.infer<typeof confirmInvoiceSchema>;
export type InvoiceListInput = z.infer<typeof invoiceListSchema>;

