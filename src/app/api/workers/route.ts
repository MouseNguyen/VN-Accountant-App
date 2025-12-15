// src/app/api/workers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { workerQuerySchema, createWorkerSchema } from '@/lib/validations/worker';
import { getWorkers, createWorker } from '@/services/worker.service';

import { serializeDecimals } from '@/lib/api-utils';
export const GET = withAuth(async (
    request: NextRequest,
    _context: { params: Promise<Record<string, string>> },
    _user: AuthUser
) => {
    try {
        const { searchParams } = new URL(request.url);
        const query = workerQuerySchema.parse(Object.fromEntries(searchParams));
        const result = await getWorkers(query);
        return NextResponse.json({ success: true, data: serializeDecimals(result) });
    } catch (error: any) {
        console.error('[GET /api/workers]', error);
        return NextResponse.json(
            { success: false, error: { message: error.message } },
            { status: 500 }
        );
    }
});

export const POST = withAuth(async (
    request: NextRequest,
    _context: { params: Promise<Record<string, string>> },
    _user: AuthUser
) => {
    try {
        const body = await request.json();
        const validation = createWorkerSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        details: validation.error.flatten().fieldErrors
                    }
                },
                { status: 400 }
            );
        }

        const worker = await createWorker(validation.data);
        return NextResponse.json(
            { success: true, message: 'Tạo nhân viên thành công!', data: serializeDecimals(worker) },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('[POST /api/workers]', error);
        return NextResponse.json(
            { success: false, error: { message: error.message } },
            { status: 500 }
        );
    }
});
