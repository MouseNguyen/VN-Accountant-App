// src/app/api/tax/mst-lookup/route.ts
// API Route để tra cứu Mã số thuế

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { lookupTaxCode, validatePartner } from '@/lib/tax/mst-lookup';

export const GET = withAuth(async (
    req: NextRequest,
    _context,
    user: AuthUser
) => {
    const url = new URL(req.url);
    const taxCode = url.searchParams.get('tax_code');
    const companyName = url.searchParams.get('name');

    if (!taxCode) {
        return NextResponse.json(
            { success: false, error: 'Thiếu tham số tax_code' },
            { status: 400 }
        );
    }

    try {
        // Nếu có company name, validate cả tên
        if (companyName) {
            const validation = await validatePartner(taxCode, companyName);
            return NextResponse.json({
                success: true,
                data: validation
            });
        }

        // Chỉ lookup MST
        const result = await lookupTaxCode(taxCode);
        return NextResponse.json({
            success: result.success,
            data: result.data,
            error: result.error,
            source: result.source
        });

    } catch (error) {
        console.error('MST lookup error:', error);
        return NextResponse.json(
            { success: false, error: 'Lỗi hệ thống' },
            { status: 500 }
        );
    }
});
