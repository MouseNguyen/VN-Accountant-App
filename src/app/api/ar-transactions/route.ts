// src/app/api/ar-transactions/route.ts
// API: GET /api/ar-transactions - Danh sách công nợ phải thu
// API: POST /api/ar-transactions - Tạo công nợ mới

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { arListSchema, createARSchema } from '@/lib/validations/ar';
import { getARTransactions, createARFromSale } from '@/services/ar.service';

import { serializeDecimals } from '@/lib/api-utils';
export const GET = withAuth(
    async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: AuthUser) => {
        try {
            const { searchParams } = new URL(req.url);

            // Parse query params
            const rawParams: Record<string, string> = {};
            for (const [key, value] of searchParams.entries()) {
                rawParams[key] = value;
            }
            const params = arListSchema.parse(rawParams);

            const result = await getARTransactions(user.farm_id, params);

            return NextResponse.json({
                success: true,
                data: serializeDecimals(result),
            });
        } catch (error) {
            console.error('GET /api/ar-transactions error:', error);
            return NextResponse.json(
                { success: false, error: { message: (error as Error).message } },
                { status: 400 }
            );
        }
    }
);

export const POST = withAuth(
    async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: AuthUser) => {
        try {
            const body = await req.json();
            const validated = createARSchema.parse(body);

            const result = await createARFromSale(user.farm_id, validated, user.id);

            return NextResponse.json({
                success: true,
                message: 'Tạo công nợ thành công',
                data: serializeDecimals(result),
            });
        } catch (error) {
            console.error('POST /api/ar-transactions error:', error);
            return NextResponse.json(
                { success: false, error: { message: (error as Error).message } },
                { status: 400 }
            );
        }
    }
);
