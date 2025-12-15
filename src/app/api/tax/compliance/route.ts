// src/app/api/tax/compliance/route.ts
// GET /api/tax/compliance - Get tax compliance dashboard data

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getTaxComplianceDashboard } from '@/lib/services/tax-compliance.service';
import { generateTaxScheduleForYear } from '@/lib/services/tax-schedule.service';

async function handler(
    req: NextRequest,
    context: { params: Promise<Record<string, string>> },
    user: { farm_id: string | null }
) {
    console.log('=== TAX COMPLIANCE API ===');
    console.log('User:', user);

    try {
        const farmId = user.farm_id;
        console.log('Farm ID:', farmId);

        if (!farmId) {
            console.log('ERROR: No farm_id');
            return NextResponse.json(
                { success: false, error: 'Farm not found' },
                { status: 400 }
            );
        }

        // Ensure tax schedules exist for current year
        const currentYear = new Date().getFullYear();
        console.log('Generating schedules for year:', currentYear);
        await generateTaxScheduleForYear(farmId, currentYear);

        // Get compliance dashboard
        console.log('Getting compliance dashboard...');
        const dashboard = await getTaxComplianceDashboard(farmId);
        console.log('Dashboard result:', JSON.stringify(dashboard, null, 2));

        return NextResponse.json({
            success: true,
            data: dashboard,
        });
    } catch (error) {
        console.error('Tax compliance error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Lỗi lấy dữ liệu tuân thủ thuế' },
            { status: 500 }
        );
    }
}

export const GET = withAuth(handler);
