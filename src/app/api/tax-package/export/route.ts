// src/app/api/tax-package/export/route.ts
// POST /api/tax-package/export - Export tax package

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { exportTaxPackage } from '@/services/tax-package.service';
import { taxPackageConfigSchema } from '@/lib/validations/tax-package';

export const POST = withAuth(async (
    req: NextRequest,
    _context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const body = await req.json();
        const validated = taxPackageConfigSchema.parse(body);

        const result = await exportTaxPackage(user.farm_id, user.id, validated);

        return NextResponse.json({
            success: true,
            message: 'Xuất hồ sơ thuế thành công',
            data: result,
        });
    } catch (error) {
        console.error('POST /api/tax-package/export error:', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message || 'Lỗi xuất hồ sơ' } },
            { status: 400 }
        );
    }
});
