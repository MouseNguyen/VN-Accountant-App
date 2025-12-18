// src/app/api/health/data-integrity/route.ts
// Health Check Endpoint for Data Sync Integrity
// Returns status of all 9 sync checks

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface SyncCheckResult {
    name: string;
    status: 'OK' | 'WARN' | 'ERROR';
    issues: number;
    message?: string;
}

export async function GET() {
    const results: SyncCheckResult[] = [];
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // ========================================================
    // CHECK 1: VAT Declaration → TaxSchedule
    // ========================================================
    try {
        const vatMismatch = await prisma.$queryRaw<any[]>`
            SELECT COUNT(*) as count
            FROM vat_declarations vd
            LEFT JOIN tax_schedules ts ON 
                ts.tax_type = 'VAT' AND 
                ts.period = vd.period_code AND 
                ts.farm_id = vd.farm_id
            WHERE vd.status = 'SUBMITTED' 
                AND (ts.status IS NULL OR ts.status NOT IN ('SUBMITTED', 'PAID'))
        `;
        const count = Number(vatMismatch[0]?.count || 0);
        results.push({
            name: 'VAT → TaxSchedule',
            status: count === 0 ? 'OK' : 'ERROR',
            issues: count,
        });
        if (count > 0) overallStatus = 'unhealthy';
    } catch {
        results.push({ name: 'VAT → TaxSchedule', status: 'WARN', issues: 0, message: 'Check skipped' });
    }

    // ========================================================
    // CHECK 2: CIT Calculation → TaxSchedule
    // ========================================================
    try {
        const citMismatch = await prisma.$queryRaw<any[]>`
            SELECT COUNT(*) as count
            FROM cit_calculations cc
            LEFT JOIN tax_schedules ts ON 
                ts.tax_type = 'CIT' AND 
                ts.period = cc.period AND 
                ts.farm_id = cc.farm_id
            WHERE cc.status = 'SUBMITTED' 
                AND (ts.status IS NULL OR ts.status NOT IN ('SUBMITTED', 'PAID'))
        `;
        const count = Number(citMismatch[0]?.count || 0);
        results.push({
            name: 'CIT → TaxSchedule',
            status: count === 0 ? 'OK' : 'ERROR',
            issues: count,
        });
        if (count > 0) overallStatus = 'unhealthy';
    } catch {
        results.push({ name: 'CIT → TaxSchedule', status: 'WARN', issues: 0, message: 'Check skipped' });
    }

    // ========================================================
    // CHECK 3: Customer Balance
    // ========================================================
    try {
        const customerMismatch = await prisma.$queryRaw<any[]>`
            SELECT COUNT(*) as count
            FROM partners p
            LEFT JOIN ar_invoices ar ON 
                ar.customer_id = p.id AND ar.status IN ('POSTED', 'PARTIALLY_PAID')
            WHERE p.partner_type = 'CUSTOMER'
            GROUP BY p.id, p.balance
            HAVING ABS(COALESCE(p.balance, 0) - COALESCE(SUM(ar.total_amount - ar.paid_amount), 0)) > 0.01
        `;
        const count = customerMismatch.length;
        results.push({
            name: 'Customer Balance',
            status: count === 0 ? 'OK' : 'ERROR',
            issues: count,
        });
        if (count > 0) overallStatus = 'unhealthy';
    } catch {
        results.push({ name: 'Customer Balance', status: 'WARN', issues: 0, message: 'Check skipped' });
    }

    // ========================================================
    // CHECK 4: Vendor Balance
    // ========================================================
    try {
        const vendorMismatch = await prisma.$queryRaw<any[]>`
            SELECT COUNT(*) as count
            FROM partners p
            LEFT JOIN ap_invoices ap ON 
                ap.vendor_id = p.id AND ap.status IN ('POSTED', 'PARTIALLY_PAID')
            WHERE p.partner_type = 'VENDOR'
            GROUP BY p.id, p.balance
            HAVING ABS(COALESCE(p.balance, 0) - COALESCE(SUM(ap.total_amount - ap.paid_amount), 0)) > 0.01
        `;
        const count = vendorMismatch.length;
        results.push({
            name: 'Vendor Balance',
            status: count === 0 ? 'OK' : 'ERROR',
            issues: count,
        });
        if (count > 0) overallStatus = 'unhealthy';
    } catch {
        results.push({ name: 'Vendor Balance', status: 'WARN', issues: 0, message: 'Check skipped' });
    }

    // ========================================================
    // CHECK 5: Stock Quantity
    // ========================================================
    try {
        const stockMismatch = await prisma.$queryRaw<any[]>`
            SELECT COUNT(*) as count
            FROM stocks s
            LEFT JOIN stock_movements sm ON sm.product_id = s.product_id AND sm.farm_id = s.farm_id
            GROUP BY s.id, s.quantity
            HAVING ABS(s.quantity - COALESCE(
                SUM(CASE WHEN sm.type IN ('IN', 'ADJUST_IN') THEN sm.quantity ELSE -sm.quantity END),
                0
            )) > 0.01
        `;
        const count = stockMismatch.length;
        results.push({
            name: 'Stock Quantity',
            status: count === 0 ? 'OK' : 'ERROR',
            issues: count,
        });
        if (count > 0) overallStatus = 'unhealthy';
    } catch {
        results.push({ name: 'Stock Quantity', status: 'WARN', issues: 0, message: 'Check skipped' });
    }

    // ========================================================
    // CHECK 6: Invoice Status
    // ========================================================
    try {
        const statusMismatch = await prisma.$queryRaw<any[]>`
            SELECT COUNT(*) as count FROM ar_invoices
            WHERE 
                (status = 'PAID' AND paid_amount < total_amount) OR
                (status = 'PARTIALLY_PAID' AND paid_amount >= total_amount) OR
                (status = 'POSTED' AND paid_amount > 0)
        `;
        const count = Number(statusMismatch[0]?.count || 0);
        results.push({
            name: 'Invoice Status',
            status: count === 0 ? 'OK' : 'WARN',
            issues: count,
        });
        if (count > 0 && overallStatus === 'healthy') overallStatus = 'degraded';
    } catch {
        results.push({ name: 'Invoice Status', status: 'WARN', issues: 0, message: 'Check skipped' });
    }

    // ========================================================
    // SUMMARY
    // ========================================================
    const okCount = results.filter(r => r.status === 'OK').length;
    const totalIssues = results.reduce((sum, r) => sum + r.issues, 0);

    return NextResponse.json({
        status: overallStatus,
        timestamp: new Date().toISOString(),
        summary: {
            checks_passed: okCount,
            checks_total: results.length,
            total_issues: totalIssues,
        },
        checks: results,
    });
}
