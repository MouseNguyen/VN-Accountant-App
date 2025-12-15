// src/app/api/workers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { updateWorkerSchema } from '@/lib/validations/worker';
import { getWorker, updateWorker, deleteWorker } from '@/services/worker.service';

import { serializeDecimals } from '@/lib/api-utils';
export const GET = withAuth(async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> },
    _user: AuthUser
) => {
    try {
        const params = await context.params;
        const worker = await getWorker(params.id);

        if (!worker) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy nhân viên' } },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: serializeDecimals(worker) });
    } catch (error: any) {
        console.error('[GET /api/workers/[id]]', error);
        return NextResponse.json(
            { success: false, error: { message: error.message } },
            { status: 500 }
        );
    }
});

export const PUT = withAuth(async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> },
    _user: AuthUser
) => {
    try {
        const params = await context.params;
        const body = await request.json();
        const validation = updateWorkerSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: { code: 'VALIDATION_ERROR' } },
                { status: 400 }
            );
        }

        const worker = await updateWorker(params.id, validation.data);
        return NextResponse.json({ success: true, message: 'Cập nhật thành công!', data: serializeDecimals(worker) });
    } catch (error: any) {
        console.error('[PUT /api/workers/[id]]', error);
        return NextResponse.json(
            { success: false, error: { message: error.message } },
            { status: 500 }
        );
    }
});

export const DELETE = withAuth(async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> },
    _user: AuthUser
) => {
    try {
        const params = await context.params;
        await deleteWorker(params.id);
        return new NextResponse(null, { status: 204 });
    } catch (error: any) {
        console.error('[DELETE /api/workers/[id]]', error);
        return NextResponse.json(
            { success: false, error: { message: error.message } },
            { status: 500 }
        );
    }
});
