// src/app/api/vat-declarations/[id]/xml/route.ts
// GET /api/vat-declarations/:id/xml - Generate and download XML

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { generateVATDeclarationXML, getVATDeclaration } from '@/services/vat.service';

export const GET = withAuth(async (
    _req: NextRequest,
    context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const { id } = await context.params;

        // Get declaration to get period_code for filename
        const declaration = await getVATDeclaration(user.farm_id, id);
        if (!declaration) {
            return NextResponse.json(
                { success: false, error: { message: 'Tờ khai không tồn tại' } },
                { status: 404 }
            );
        }

        const xml = await generateVATDeclarationXML(user.farm_id, id);

        const filename = `tokhai-gtgt-${declaration.period_code}.xml`;

        return new NextResponse(xml, {
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('GET /api/vat-declarations/[id]/xml error:', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message || 'Lỗi xuất XML' } },
            { status: 400 }
        );
    }
});
