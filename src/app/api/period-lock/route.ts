// src/app/api/period-lock/route.ts
// GET - List period locks
// POST - Create new period lock

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { lockPeriod, getPeriodLocks } from '@/services/period-lock.service';
import { z } from 'zod';

const lockSchema = z.object({
    period_type: z.enum(['DAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR']),
    period_code: z.string().min(1),
    from_date: z.string(),
    to_date: z.string(),
    reason: z.string().optional(),
});

export const GET = withAuth(async (
    req: NextRequest,
    _context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const url = new URL(req.url);
        const status = url.searchParams.get('status') as any;

        const locks = await getPeriodLocks(user.farm_id, { status });

        return NextResponse.json({
            success: true,
            data: locks,
        });
    } catch (error) {
        console.error('GET /api/period-lock error:', error);
        return NextResponse.json(
            { success: false, error: { message: 'Lỗi lấy danh sách khóa sổ' } },
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
        const validated = lockSchema.parse(body);

        const lock = await lockPeriod(user.farm_id, user.id, validated);

        return NextResponse.json({
            success: true,
            data: lock,
            message: `Đã khóa sổ kỳ ${validated.period_code}`,
        });
    } catch (error) {
        console.error('POST /api/period-lock error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: { message: 'Dữ liệu không hợp lệ', details: error.issues } },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: { message: (error as Error).message || 'Lỗi khóa sổ' } },
            { status: 400 }
        );
    }
});
