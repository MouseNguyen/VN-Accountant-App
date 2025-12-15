// src/app/api/invoices/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { prismaBase } from '@/lib/prisma';
import { deleteInvoice } from '@/services/invoice.service';

import { serializeDecimals } from '@/lib/api-utils';
// GET - Chi tiết invoice
export const GET = withAuth(async (request: NextRequest, context, user: AuthUser) => {
    try {
        const params = await context.params;
        const id = params.id as string;

        const invoice = await prismaBase.invoice.findFirst({
            where: { id, farm_id: user.farm_id },
        });

        if (!invoice) {
            return NextResponse.json(
                { success: false, error: 'Không tìm thấy hóa đơn' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: serializeDecimals(invoice) });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Lỗi tải dữ liệu' },
            { status: 500 }
        );
    }
});

// DELETE - Xóa invoice
export const DELETE = withAuth(async (request: NextRequest, context, _user: AuthUser) => {
    try {
        const params = await context.params;
        const id = params.id as string;

        await deleteInvoice(id);
        return NextResponse.json({ success: true, message: 'Đã xóa hóa đơn' });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Lỗi xóa' },
            { status: 400 }
        );
    }
});
