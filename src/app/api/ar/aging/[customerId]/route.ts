// src/app/api/ar/aging/[customerId]/route.ts
// AR Aging Customer Detail API - Phase 4 Task 5

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { getCustomerAgingDetail } from '@/services/ar-aging.service';
import { serializeDecimals } from '@/lib/api-utils';

export const GET = withAuth(
    async (
        req: NextRequest,
        context: { params: Promise<Record<string, string>> },
        user: AuthUser
    ) => {
        try {
            const params = await context.params;
            const customerId = params.customerId;
            const searchParams = req.nextUrl.searchParams;
            const asOfDate = searchParams.get('as_of_date') || undefined;

            const detail = await getCustomerAgingDetail(user.farm_id, customerId, asOfDate);

            if (!detail) {
                return NextResponse.json(
                    { success: false, error: { message: 'Customer has no open invoices' } },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                success: true,
                data: serializeDecimals(detail),
            });
        } catch (error) {
            console.error('GET /api/ar/aging/:customerId error:', error);
            return NextResponse.json(
                { success: false, error: { message: (error as Error).message } },
                { status: 500 }
            );
        }
    }
);
