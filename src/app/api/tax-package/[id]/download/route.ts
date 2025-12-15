// src/app/api/tax-package/[id]/download/route.ts
// GET /api/tax-package/:id/download - Download tax package ZIP

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { downloadTaxPackage } from '@/services/tax-package.service';

export const GET = withAuth(async (
    _req: NextRequest,
    context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const { id } = await context.params;

        const { buffer, fileName, contentType } = await downloadTaxPackage(
            user.farm_id,
            id
        );

        // Convert Buffer to Uint8Array for NextResponse compatibility
        const uint8Array = new Uint8Array(buffer);

        return new NextResponse(uint8Array, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Content-Length': String(buffer.length),
            },
        });
    } catch (error) {
        console.error('GET /api/tax-package/[id]/download error:', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message || 'Lỗi tải xuống' } },
            { status: 400 }
        );
    }
});
