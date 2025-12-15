// src/app/api/tax-package/checklist/route.ts
// GET /api/tax-package/checklist - Get pre-export checklist

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { getExportChecklist } from '@/services/tax-package.service';
import { checklistQuerySchema } from '@/lib/validations/tax-package';

export const GET = withAuth(async (
    req: NextRequest,
    _context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const url = new URL(req.url);
        const query = {
            period_type: url.searchParams.get('period_type') || 'MONTHLY',
            period_code: url.searchParams.get('period_code') || '',
        };

        const validated = checklistQuerySchema.parse(query);

        const checklist = await getExportChecklist(
            user.farm_id,
            validated.period_type,
            validated.period_code
        );

        return NextResponse.json({ success: true, data: checklist });
    } catch (error) {
        console.error('GET /api/tax-package/checklist error:', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message || 'Lỗi' } },
            { status: 500 }
        );
    }
});
