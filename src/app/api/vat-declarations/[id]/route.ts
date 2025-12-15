// src/app/api/vat-declarations/[id]/route.ts
// GET /api/vat-declarations/:id - Get single VAT declaration
// DELETE /api/vat-declarations/:id - Delete VAT declaration

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { getVATDeclaration, deleteVATDeclaration } from '@/services/vat.service';
import { serializeDecimals } from '@/lib/api-utils';

export const GET = withAuth(async (
    _req: NextRequest,
    context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const { id } = await context.params;
        const result = await getVATDeclaration(user.farm_id, id);

        if (!result) {
            return NextResponse.json(
                { success: false, error: { message: 'Tờ khai không tồn tại' } },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: serializeDecimals(result) });
    } catch (error) {
        console.error('GET /api/vat-declarations/[id] error:', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message || 'Lỗi' } },
            { status: 500 }
        );
    }
});

export const DELETE = withAuth(async (
    _req: NextRequest,
    context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const { id } = await context.params;
        await deleteVATDeclaration(user.farm_id, id);
        return NextResponse.json({ success: true, message: 'Đã xóa tờ khai' });
    } catch (error) {
        console.error('DELETE /api/vat-declarations/[id] error:', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message || 'Lỗi xóa tờ khai' } },
            { status: 400 }
        );
    }
});
