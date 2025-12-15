// src/lib/services/tax-compliance.service.ts
// Tax Compliance Dashboard Service - Task 8
// Aggregates all tax data for compliance overview

import { prisma } from '@/lib/prisma';
import { getUpcomingDeadlines, getOverdueItems } from './tax-schedule.service';

// ==========================================
// TYPES
// ==========================================

export interface TaxComplianceDashboard {
    // Summary
    compliance_score: number;  // 0-100
    status: 'GOOD' | 'WARNING' | 'CRITICAL';

    // Alerts
    alerts: TaxAlert[];

    // Upcoming
    upcoming_deadlines: TaxDeadlineItem[];

    // Overdue
    overdue_items: TaxDeadlineItem[];

    // VAT Issues
    vat_issues_count: number;
    non_deductible_vat: number;

    // Quick Stats
    stats: {
        vat_this_quarter: number;
        cit_this_quarter: number;
        pit_this_month: number;
    };
}

export interface TaxAlert {
    id: string;
    type: 'VAT_ISSUE' | 'DEADLINE' | 'OVERDUE' | 'MISSING_INFO';
    severity: 'info' | 'warning' | 'error';
    title: string;
    message: string;
    action_link?: string;
    action_label?: string;
}

export interface TaxDeadlineItem {
    id: string;
    tax_type: string;
    period: string;
    due_date: string;
    days_remaining: number;
    status: string;
    amount?: number;
}

// ==========================================
// GET COMPLIANCE DASHBOARD
// ==========================================

export async function getTaxComplianceDashboard(
    farmId: string
): Promise<TaxComplianceDashboard> {
    const now = new Date();
    const alerts: TaxAlert[] = [];

    // 1. Get upcoming deadlines (next 60 days)
    const upcoming = await getUpcomingDeadlines(farmId, 60);
    const upcomingDeadlines: TaxDeadlineItem[] = upcoming.map(d => ({
        id: d.id,
        tax_type: d.tax_type,
        period: d.period,
        due_date: d.due_date.toISOString().split('T')[0],
        days_remaining: Math.ceil((d.due_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        status: d.status,
        amount: d.amount ? Number(d.amount) : undefined,
    }));

    // 2. Get overdue items
    const overdue = await getOverdueItems(farmId);
    const overdueItems: TaxDeadlineItem[] = overdue.map(d => ({
        id: d.id,
        tax_type: d.tax_type,
        period: d.period,
        due_date: d.due_date.toISOString().split('T')[0],
        days_remaining: Math.ceil((d.due_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        status: 'OVERDUE',
        amount: d.amount ? Number(d.amount) : undefined,
    }));

    // Add overdue alerts
    for (const item of overdueItems) {
        alerts.push({
            id: `overdue-${item.id}`,
            type: 'OVERDUE',
            severity: 'error',
            title: `Quá hạn ${getTaxTypeName(item.tax_type)}`,
            message: `${item.period} đã quá hạn ${Math.abs(item.days_remaining)} ngày`,
            action_link: getTaxTypeLink(item.tax_type),
            action_label: 'Xử lý ngay',
        });
    }

    // Add upcoming deadline alerts (< 7 days)
    for (const item of upcomingDeadlines.filter(d => d.days_remaining <= 7)) {
        alerts.push({
            id: `deadline-${item.id}`,
            type: 'DEADLINE',
            severity: 'warning',
            title: `Sắp đến hạn ${getTaxTypeName(item.tax_type)}`,
            message: `${item.period} - còn ${item.days_remaining} ngày`,
            action_link: getTaxTypeLink(item.tax_type),
            action_label: 'Chuẩn bị',
        });
    }

    // 3. Get VAT issues count (simplified - check transactions with vat_deductible = false)
    const vatIssuesData = await getVATIssuesCount(farmId);

    if (vatIssuesData.count > 0) {
        alerts.push({
            id: 'vat-issues',
            type: 'VAT_ISSUE',
            severity: 'warning',
            title: `${vatIssuesData.count} HĐ không được khấu trừ VAT`,
            message: `Tổng VAT mất: ${formatMoney(vatIssuesData.total_vat)}`,
            action_link: '/thue/vat-issues',
            action_label: 'Xem chi tiết',
        });
    }

    // 4. Calculate compliance score
    let score = 100;
    score -= overdueItems.length * 20;  // -20 per overdue
    score -= upcomingDeadlines.filter(d => d.days_remaining <= 3).length * 10;  // -10 per critical
    score -= Math.min(20, vatIssuesData.count * 2);  // Max -20 for VAT issues
    score = Math.max(0, score);

    // 5. Get quick stats
    const stats = await getQuickStats(farmId);

    return {
        compliance_score: Math.round(score),
        status: score >= 80 ? 'GOOD' : score >= 50 ? 'WARNING' : 'CRITICAL',
        alerts,
        upcoming_deadlines: upcomingDeadlines,
        overdue_items: overdueItems,
        vat_issues_count: vatIssuesData.count,
        non_deductible_vat: vatIssuesData.total_vat,
        stats,
    };
}

// ==========================================
// HELPERS
// ==========================================

async function getVATIssuesCount(farmId: string): Promise<{ count: number; total_vat: number }> {
    const currentQuarter = getCurrentQuarterDates();

    // Count transactions with vat_deductible = false
    const issues = await prisma.transaction.findMany({
        where: {
            farm_id: farmId,
            vat_deductible: false,
            trans_date: {
                gte: new Date(currentQuarter.from),
                lte: new Date(currentQuarter.to),
            },
        },
        select: {
            vat_amount: true,
        },
    });

    const totalVat = issues.reduce((sum, t) => sum + Number(t.vat_amount || 0), 0);

    return {
        count: issues.length,
        total_vat: totalVat,
    };
}

async function getQuickStats(farmId: string) {
    const currentQuarter = getCurrentQuarter();
    const currentMonth = getCurrentMonth();

    // Get VAT declaration amount
    const vatDecl = await prisma.vATDeclaration.findFirst({
        where: { farm_id: farmId, period_code: currentQuarter },
        select: { payable_vat: true },
        orderBy: { created_at: 'desc' },
    });

    // Get CIT calculation amount
    const citCalc = await prisma.cITCalculation.findFirst({
        where: { farm_id: farmId, period: currentQuarter },
        select: { cit_amount: true },
        orderBy: { created_at: 'desc' },
    });

    // Get PIT total for current month
    const pitCalcs = await prisma.pITCalculation.aggregate({
        where: { farm_id: farmId, period: currentMonth },
        _sum: { pit_amount: true },
    });

    return {
        vat_this_quarter: Number(vatDecl?.payable_vat || 0),
        cit_this_quarter: Number(citCalc?.cit_amount || 0),
        pit_this_month: Number(pitCalcs._sum.pit_amount || 0),
    };
}

function getCurrentQuarterDates() {
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    const year = now.getFullYear();
    const startMonth = (q - 1) * 3;
    return {
        from: new Date(year, startMonth, 1).toISOString().split('T')[0],
        to: new Date(year, startMonth + 3, 0).toISOString().split('T')[0],
    };
}

function getCurrentQuarter() {
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    return `${now.getFullYear()}-Q${q}`;
}

function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMoney(n: number) {
    return new Intl.NumberFormat('vi-VN').format(n) + 'đ';
}

function getTaxTypeName(type: string): string {
    switch (type) {
        case 'VAT': return 'VAT';
        case 'CIT': return 'TNDN';
        case 'PIT': return 'TNCN';
        case 'LICENSE': return 'Môn bài';
        default: return type;
    }
}

function getTaxTypeLink(type: string): string {
    switch (type) {
        case 'VAT': return '/thue/to-khai';
        case 'CIT': return '/thue/tndn';
        case 'PIT': return '/thue/tncn';
        default: return '/thue';
    }
}
