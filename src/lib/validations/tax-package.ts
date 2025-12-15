// src/lib/validations/tax-package.ts
// Zod validation schemas for Tax Package Export

import { z } from 'zod';

export const taxPackageConfigSchema = z.object({
    period_type: z.enum(['MONTHLY', 'QUARTERLY']),
    period_code: z.string()
        .refine((val) => {
            return /^\d{4}-(0[1-9]|1[0-2])$/.test(val) || /^\d{4}-Q[1-4]$/.test(val);
        }, 'Kỳ không hợp lệ (VD: 2024-12 hoặc 2024-Q4)'),

    include_xml: z.boolean().default(true),
    include_reports: z.boolean().default(true),
    include_images: z.boolean().default(true),

    reports: z.array(z.enum([
        'cash-book',
        'bank-book',
        'purchase-invoices',
        'sales-invoices',
        'ar-131',
        'ap-331',
        'trial-balance',
        'profit-loss',
    ])).default([
        'cash-book',
        'bank-book',
        'purchase-invoices',
        'sales-invoices',
        'ar-131',
        'ap-331',
        'trial-balance',
        'profit-loss',
    ]),

    image_quality: z.enum(['original', 'compressed']).default('compressed'),

    notes: z.string().max(500).optional(),
});

export type TaxPackageConfigInput = z.infer<typeof taxPackageConfigSchema>;

// Checklist query params
export const checklistQuerySchema = z.object({
    period_type: z.enum(['MONTHLY', 'QUARTERLY']).default('MONTHLY'),
    period_code: z.string().min(1, 'Thiếu mã kỳ'),
});

// History query params
export const historyQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
});
