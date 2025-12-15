// src/app/api/ar/aging/route.ts
// API: GET /api/ar/aging - Báo cáo tuổi nợ phải thu

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { getARAgingReport } from '@/services/ar.service';

import { serializeDecimals } from '@/lib/api-utils';
export const GET = withAuth(
    async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: AuthUser) => {
        try {
            const report = await getARAgingReport(user.farm_id);

            return NextResponse.json({
                success: true,
                data: serializeDecimals(report),
            });
        } catch (error) {
            console.error('GET /api/ar/aging error:', error);
            return NextResponse.json(
                { success: false, error: { message: (error as Error).message } },
                { status: 500 }
            );
        }
    }
);
