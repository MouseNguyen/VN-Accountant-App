// src/app/api/tax/cit/calculate/route.ts
// POST /api/tax/cit/calculate - Calculate CIT for a period

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { calculateCIT } from '@/lib/tax/cit-calculator';
import { z } from 'zod';

const calculateSchema = z.object({
    period: z.string().min(4, 'Period is required'),
    period_type: z.enum(['QUARTERLY', 'ANNUAL']),
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
        const validated = calculateSchema.parse(body);

        const result = await calculateCIT(farmId, validated);

        return NextResponse.json({
            success: true,
            data: result,
            message: `CIT calculated for period ${validated.period}`,
        });
    } catch (error) {
        console.error('CIT calculation error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: 'Validation error', details: error.issues },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Lỗi tính thuế TNDN' },
            { status: 500 }
        );
    }
}

export const POST = withAuth(handler);
