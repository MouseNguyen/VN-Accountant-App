// src/app/api/ar/collect/route.ts
// API: POST /api/ar/collect - Thu tiền từ khách hàng

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { collectPaymentSchema } from '@/lib/validations/ar';
import { collectPayment } from '@/services/ar.service';

export const POST = withAuth(
    async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: AuthUser) => {
        try {
            const body = await req.json();
            const validated = collectPaymentSchema.parse(body);

            const result = await collectPayment(user.farm_id, validated, user.id);

            return NextResponse.json({
                success: true,
                message: `Thu tiền thành công. Đã phân bổ vào ${result.allocations.length} hóa đơn`,
                data: result,
            });
        } catch (error) {
            console.error('POST /api/ar/collect error:', error);
            return NextResponse.json(
                { success: false, error: { message: (error as Error).message } },
                { status: 400 }
            );
        }
    }
);
