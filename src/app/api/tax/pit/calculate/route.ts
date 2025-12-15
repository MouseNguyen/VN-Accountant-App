// src/app/api/tax/pit/calculate/route.ts
// POST /api/tax/pit/calculate - Calculate PIT for employee(s)

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { calculatePIT, calculatePITBatch } from '@/lib/tax/pit-calculator';
import { z } from 'zod';

const singleSchema = z.object({
    employee_id: z.string().uuid(),
    period: z.string().regex(/^\d{4}-\d{2}$/, 'Period format: YYYY-MM'),
    gross_income: z.number().positive(),
    dependents_count: z.number().int().min(0).optional(),
    other_deduction: z.number().min(0).optional(),
});

const batchSchema = z.object({
    period: z.string().regex(/^\d{4}-\d{2}$/, 'Period format: YYYY-MM'),
});

async function handler(
    req: NextRequest,
    context: { params: Promise<Record<string, string>> },
    user: { farm_id: string | null }
) {
    try {
        const farmId = user.farm_id;
        if (!farmId) {
            return NextResponse.json(
                { success: false, error: 'Farm not found' },
                { status: 400 }
            );
        }

        const body = await req.json();

        // Single employee calculation
        if (body.employee_id) {
            const validated = singleSchema.parse(body);
            const result = await calculatePIT(farmId, validated);

            return NextResponse.json({
                success: true,
                data: result,
                message: `PIT calculated for ${result.employee_name}`,
            });
        }

        // Batch calculation (all employees for period)
        if (body.period && !body.employee_id) {
            const validated = batchSchema.parse(body);
            const result = await calculatePITBatch(farmId, validated.period);

            return NextResponse.json({
                success: true,
                data: result,
                message: `PIT calculated for ${result.total_employees} employees`,
            });
        }

        return NextResponse.json(
            { success: false, error: 'Thiếu thông tin: employee_id hoặc period' },
            { status: 400 }
        );
    } catch (error) {
        console.error('PIT calculation error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: 'Validation error', details: error.issues },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Lỗi tính thuế TNCN' },
            { status: 500 }
        );
    }
}

export const POST = withAuth(handler);
