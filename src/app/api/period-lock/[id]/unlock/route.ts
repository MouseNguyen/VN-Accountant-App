// src/app/api/period-lock/[id]/unlock/route.ts
// POST /api/period-lock/:id/unlock - Unlock a period

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { unlockPeriod } from '@/services/period-lock.service';
import { z } from 'zod';

const unlockSchema = z.object({
    reason: z.string().min(1, 'Vui lòng nhập lý do mở khóa'),
});

export const POST = withAuth(async (
    req: NextRequest,
    context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const { id } = await context.params;
        const body = await req.json();
        const validated = unlockSchema.parse(body);

        const lock = await unlockPeriod(user.farm_id, user.id, id, validated.reason);

        return NextResponse.json({
            success: true,
            data: lock,
            message: `Đã mở khóa sổ kỳ ${lock.period_code}`,
        });
    } catch (error) {
        console.error('POST /api/period-lock/[id]/unlock error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: { message: 'Dữ liệu không hợp lệ', details: error.issues } },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: { message: (error as Error).message || 'Lỗi mở khóa sổ' } },
            { status: 400 }
        );
    }
});
