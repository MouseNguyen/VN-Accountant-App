// src/app/api/tax-package/history/route.ts
// GET /api/tax-package/history - Get export history

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { getTaxPackageHistory } from '@/services/tax-package.service';
import { historyQuerySchema } from '@/lib/validations/tax-package';

export const GET = withAuth(async (
    req: NextRequest,
    _context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const url = new URL(req.url);
        const query = Object.fromEntries(url.searchParams);
        const validated = historyQuerySchema.parse(query);

        const result = await getTaxPackageHistory(
            user.farm_id,
            validated.page,
            validated.limit
        );

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error('GET /api/tax-package/history error:', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message || 'Lỗi' } },
            { status: 500 }
        );
    }
});
