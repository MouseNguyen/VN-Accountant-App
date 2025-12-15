// src/app/api/vat/validate-tax-code/route.ts
// POST /api/vat/validate-tax-code - Validate Vietnamese tax code

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { validateTaxCode } from '@/services/vat.service';
import { validateTaxCodeSchema } from '@/lib/validations/vat';

export const POST = withAuth(async (
    req: NextRequest,
    _context: { params: Promise<Record<string, string>> },
    _user: AuthUser
) => {
    try {
        const body = await req.json();
        const validated = validateTaxCodeSchema.parse(body);
        const result = await validateTaxCode(validated.tax_code);
        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error('POST /api/vat/validate-tax-code error:', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message || 'Lỗi kiểm tra MST' } },
            { status: 400 }
        );
    }
});
