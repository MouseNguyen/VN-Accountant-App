// src/app/api/attendances/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { createAttendanceSchema } from '@/lib/validations/attendance';
import { updateAttendance, deleteAttendance } from '@/services/attendance.service';

export const PUT = withAuth(async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> },
    _user: AuthUser
) => {
    try {
        const params = await context.params;
        const body = await request.json();
        const validation = createAttendanceSchema.partial().safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: { code: 'VALIDATION_ERROR' } },
                { status: 400 }
            );
        }

        const attendance = await updateAttendance(params.id, validation.data);
        return NextResponse.json({ success: true, message: 'Cập nhật thành công!', data: attendance });
    } catch (error: any) {
        console.error('[PUT /api/attendances/[id]]', error);

        // Locked error
        if (error.message.includes('Không thể sửa/xóa')) {
            return NextResponse.json(
                { success: false, error: { code: 'LOCKED', message: error.message } },
                { status: 403 }
            );
        }

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
        await deleteAttendance(params.id);
        return new NextResponse(null, { status: 204 });
    } catch (error: any) {
        console.error('[DELETE /api/attendances/[id]]', error);

        // Locked error
        if (error.message.includes('Không thể sửa/xóa')) {
            return NextResponse.json(
                { success: false, error: { code: 'LOCKED', message: error.message } },
                { status: 403 }
            );
        }

        return NextResponse.json(
            { success: false, error: { message: error.message } },
            { status: 500 }
        );
    }
});
