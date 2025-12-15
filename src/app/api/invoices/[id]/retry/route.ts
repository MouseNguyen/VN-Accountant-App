// src/app/api/invoices/[id]/retry/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { retryOCR } from '@/services/invoice.service';

// POST - Retry OCR
export const POST = withAuth(async (request: NextRequest, context, _user: AuthUser) => {
    try {
        const params = await context.params;
        const id = params.id as string;

        const result = await retryOCR(id);

        return NextResponse.json({
            success: true,
            ...result,
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Lỗi retry' },
            { status: 400 }
        );
    }
});
