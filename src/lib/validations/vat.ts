// src/lib/validations/vat.ts
// Validation schemas for VAT Declaration (Task 8)

import { z } from 'zod';
import { VATDeclarationStatus } from '@prisma/client';

// ==========================================
// CREATE VAT DECLARATION
// ==========================================

export const createVATDeclarationSchema = z.object({
    period_type: z.enum(['MONTHLY', 'QUARTERLY']),
    period_code: z.string()
        .refine((val) => {
            // Format: "2024-12" (monthly) hoặc "2024-Q4" (quarterly)
            return /^\d{4}-(0[1-9]|1[0-2])$/.test(val) || /^\d{4}-Q[1-4]$/.test(val);
        }, 'Kỳ khai không hợp lệ (VD: 2024-12 hoặc 2024-Q4)'),
    notes: z.string().max(500).optional(),
});

// ==========================================
// ADJUSTMENT
// ==========================================

export const adjustVATSchema = z.object({
    adjustment_amount: z.number(),
    adjustment_reason: z.string().min(1, 'Vui lòng nhập lý do điều chỉnh').max(500),
});

// ==========================================
// VALIDATE TAX CODE
// ==========================================

export const validateTaxCodeSchema = z.object({
    tax_code: z.string()
        .min(10, 'MST phải có ít nhất 10 ký tự')
        .max(14, 'MST không quá 14 ký tự')
        .regex(/^\d{10}(-\d{3})?$/, 'MST không hợp lệ (10 hoặc 13 số)'),
});

// ==========================================
// LIST
// ==========================================

export const vatListSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    year: z.coerce.number().int().min(2020).max(2100).optional(),
    status: z.nativeEnum(VATDeclarationStatus).optional(),
});

// Export types
export type CreateVATDeclarationInput = z.infer<typeof createVATDeclarationSchema>;
export type AdjustVATInput = z.infer<typeof adjustVATSchema>;
export type ValidateTaxCodeInput = z.infer<typeof validateTaxCodeSchema>;
export type VATListInput = z.infer<typeof vatListSchema>;
