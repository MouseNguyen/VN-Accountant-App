// src/app/api/attendances/bulk/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { bulkAttendanceSchema } from '@/lib/validations/attendance';
import { bulkCreateAttendance } from '@/services/attendance.service';

export const POST = withAuth(async (
    request: NextRequest,
    _context: { params: Promise<Record<string, string>> },
    _user: AuthUser
) => {
    try {
        const body = await request.json();
        const validation = bulkAttendanceSchema.safeParse(body);

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

        const result = await bulkCreateAttendance(validation.data);

        return NextResponse.json({
            success: true,
            message: `Đã chấm công ${result.success_count}/${result.total} nhân viên`,
            data: result,
        });
    } catch (error: any) {
        console.error('[POST /api/attendances/bulk]', error);
        return NextResponse.json(
            { success: false, error: { message: error.message } },
            { status: 500 }
        );
    }
});
