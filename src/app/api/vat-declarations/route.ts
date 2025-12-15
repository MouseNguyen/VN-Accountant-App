// src/app/api/vat-declarations/route.ts
// GET /api/vat-declarations - List VAT declarations
// POST /api/vat-declarations - Create new VAT declaration

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { getVATDeclarations, createVATDeclaration } from '@/services/vat.service';
import { vatListSchema, createVATDeclarationSchema } from '@/lib/validations/vat';
import { serializeDecimals } from '@/lib/api-utils';

export const GET = withAuth(async (
    req: NextRequest,
    _context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const url = new URL(req.url);
        const query = Object.fromEntries(url.searchParams);
        const validated = vatListSchema.parse(query);
        const result = await getVATDeclarations(user.farm_id, validated);
        return NextResponse.json({ success: true, data: serializeDecimals(result) });
    } catch (error) {
        console.error('GET /api/vat-declarations error:', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message || 'Lỗi' } },
            { status: 500 }
        );
    }
});

export const POST = withAuth(async (
    req: NextRequest,
    _context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const body = await req.json();
        const validated = createVATDeclarationSchema.parse(body);
        const result = await createVATDeclaration(user.farm_id, user.id, validated);
        return NextResponse.json({ success: true, data: serializeDecimals(result) });
    } catch (error) {
        console.error('POST /api/vat-declarations error:', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message || 'Lỗi tạo tờ khai' } },
            { status: 400 }
        );
    }
});
