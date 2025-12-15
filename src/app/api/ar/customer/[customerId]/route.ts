// src/app/api/ar/customer/[customerId]/route.ts
// API: GET /api/ar/customer/:customerId - Chi tiết công nợ của khách hàng

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { getCustomerARSummary } from '@/services/ar.service';

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

            if (!customerId) {
                return NextResponse.json(
                    { success: false, error: { message: 'Customer ID is required' } },
                    { status: 400 }
                );
            }

            const summary = await getCustomerARSummary(user.farm_id, customerId);

            return NextResponse.json({
                success: true,
                data: serializeDecimals(summary),
            });
        } catch (error) {
            console.error('GET /api/ar/customer/:id error:', error);
            return NextResponse.json(
                { success: false, error: { message: (error as Error).message } },
                { status: 400 }
            );
        }
    }
);
