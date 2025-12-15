// src/app/api/tax/cit/[period]/xml/route.ts
// GET /api/tax/cit/:period/xml - Export CIT Declaration as XML

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { exportCITDeclarationXML, validateCITXML } from '@/lib/tax/cit-xml-generator';

async function handler(
    req: NextRequest,
    context: { params: Promise<Record<string, string>> },
    user: { farm_id: string | null }
) {
    try {
        const farmId = user.farm_id;
        if (!farmId) {
            return NextResponse.json(
                { success: false, error: 'Farm not found' },
                { status: 400 }
            );
        }

        const { period } = await context.params;
        const decodedPeriod = decodeURIComponent(period);

        // Generate XML
        const xml = await exportCITDeclarationXML(farmId, decodedPeriod);

        // Validate XML
        const validation = validateCITXML(xml);
        if (!validation.valid) {
            console.warn('CIT XML validation warnings:', validation.errors);
        }

        // Return as downloadable XML file
        return new NextResponse(xml, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Content-Disposition': `attachment; filename="03-TNDN-${decodedPeriod}.xml"`,
                'Cache-Control': 'no-cache',
            },
        });
    } catch (error) {
        console.error('Export CIT XML error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Lỗi xuất XML' },
            { status: 400 }
        );
    }
}

export const GET = withAuth(handler);
