// src/lib/validations/tax-report.ts
import { z } from 'zod';

export const taxReportQuerySchema = z.object({
    quarter: z.coerce.number().int().min(1).max(4),
    year: z.coerce.number().int().min(2020).max(2100),
});

export const confirmTaxPaymentSchema = z.object({
    tax_type: z.enum(['VAT', 'BHXH']),
    quarter: z.number().int().min(1).max(4),
    year: z.number().int().min(2020).max(2100),
    amount: z.number().positive('Số tiền phải lớn hơn 0'),
    payment_method: z.string().optional().default('BANK_TRANSFER'),
});

export type TaxReportQueryInput = z.infer<typeof taxReportQuerySchema>;
export type ConfirmTaxPaymentInput = z.infer<typeof confirmTaxPaymentSchema>;
