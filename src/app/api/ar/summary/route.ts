// src/app/api/ar/summary/route.ts
// API: GET /api/ar/summary - Tổng hợp công nợ phải thu

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { getARSummary } from '@/services/ar.service';

import { serializeDecimals } from '@/lib/api-utils';
export const GET = withAuth(
    async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: AuthUser) => {
        try {
            const summary = await getARSummary(user.farm_id);

            return NextResponse.json({
                success: true,
                data: serializeDecimals(summary),
            });
        } catch (error) {
            console.error('GET /api/ar/summary error:', error);
            return NextResponse.json(
                { success: false, error: { message: (error as Error).message } },
                { status: 500 }
            );
        }
    }
);
