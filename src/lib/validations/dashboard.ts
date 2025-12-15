// src/lib/validations/dashboard.ts
import { z } from 'zod';

export const dashboardQuerySchema = z.object({
    // Cho phép chọn widgets cần lấy (tối ưu performance)
    widgets: z
        .string()
        .optional()
        .transform((v) => v?.split(',') || [
            'cash_balance',
            'income_expense',
            'payables',
            'top_products',
            'workers',
            'alerts',
            'chart'
        ]),

    chart_period: z.enum(['week', 'month']).default('week'),

    // Force refresh cache
    refresh: z.coerce.boolean().default(false),
});

export const quickStatsQuerySchema = z.object({
    period: z.enum(['today', 'week', 'month', 'year']).default('today'),
});

export type DashboardQueryInput = z.infer<typeof dashboardQuerySchema>;
export type QuickStatsQueryInput = z.infer<typeof quickStatsQuerySchema>;
