// src/app/api/workers/active/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { getActiveWorkers } from '@/services/worker.service';

import { serializeDecimals } from '@/lib/api-utils';
export const GET = withAuth(async (
    _request: NextRequest,
    _context: { params: Promise<Record<string, string>> },
    _user: AuthUser
) => {
    try {
        const workers = await getActiveWorkers();
        return NextResponse.json({ success: true, data: serializeDecimals(workers) });
    } catch (error: any) {
        console.error('[GET /api/workers/active]', error);
        return NextResponse.json(
            { success: false, error: { message: error.message } },
            { status: 500 }
        );
    }
});
