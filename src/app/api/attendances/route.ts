// src/app/api/attendances/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { attendanceQuerySchema, createAttendanceSchema } from '@/lib/validations/attendance';
import { getAttendances, createAttendance } from '@/services/attendance.service';

import { serializeDecimals } from '@/lib/api-utils';
export const GET = withAuth(async (
    request: NextRequest,
    _context: { params: Promise<Record<string, string>> },
    _user: AuthUser
) => {
    try {
        const { searchParams } = new URL(request.url);
        const query = attendanceQuerySchema.parse(Object.fromEntries(searchParams));
        const result = await getAttendances(query);
        return NextResponse.json({ success: true, data: serializeDecimals(result) });
    } catch (error: any) {
        console.error('[GET /api/attendances]', error);
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
        const validation = createAttendanceSchema.safeParse(body);

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

        const attendance = await createAttendance(validation.data);
        return NextResponse.json(
            { success: true, message: 'Chấm công thành công!', data: serializeDecimals(attendance) },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('[POST /api/attendances]', error);

        // Duplicate error
        if (error.message.includes('đã được chấm công')) {
            return NextResponse.json(
                { success: false, error: { code: 'DUPLICATE', message: error.message } },
                { status: 409 }
            );
        }

        // Leave exhausted
        if (error.message.includes('hết phép')) {
            return NextResponse.json(
                { success: false, error: { code: 'LEAVE_EXHAUSTED', message: error.message } },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: { message: error.message } },
            { status: 500 }
        );
    }
});
