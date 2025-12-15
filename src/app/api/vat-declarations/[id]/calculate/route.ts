// src/app/api/vat-declarations/[id]/calculate/route.ts
// POST /api/vat-declarations/:id/calculate - Calculate VAT for declaration

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { calculateVATDeclaration } from '@/services/vat.service';
import { serializeDecimals } from '@/lib/api-utils';

export const POST = withAuth(async (
    _req: NextRequest,
    context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const { id } = await context.params;
        const result = await calculateVATDeclaration(user.farm_id, id);
        return NextResponse.json({ success: true, data: serializeDecimals(result) });
    } catch (error) {
        console.error('POST /api/vat-declarations/[id]/calculate error:', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message || 'Lỗi tính thuế' } },
            { status: 400 }
        );
    }
});
