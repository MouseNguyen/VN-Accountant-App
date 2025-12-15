// src/app/api/payrolls/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { payrollQuerySchema, createPayrollSchema } from '@/lib/validations/payroll';
import { getPayrolls, createPayroll } from '@/services/payroll.service';

import { serializeDecimals } from '@/lib/api-utils';
export const GET = withAuth(async (
    request: NextRequest,
    _context: { params: Promise<Record<string, string>> },
    _user: AuthUser
) => {
    try {
        const { searchParams } = new URL(request.url);
        const query = payrollQuerySchema.parse(Object.fromEntries(searchParams));
        const result = await getPayrolls(query);
        return NextResponse.json({ success: true, data: serializeDecimals(result) });
    } catch (error: any) {
        console.error('[GET /api/payrolls]', error);
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
        const validation = createPayrollSchema.safeParse(body);

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

        const payroll = await createPayroll(validation.data);
        return NextResponse.json(
            { success: true, message: 'Tạo bảng lương thành công!', data: serializeDecimals(payroll) },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('[POST /api/payrolls]', error);

        // Overlap error
        if (error.message.includes('Đã có bảng lương')) {
            return NextResponse.json(
                { success: false, error: { code: 'OVERLAP', message: error.message } },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { success: false, error: { message: error.message } },
            { status: 500 }
        );
    }
});
