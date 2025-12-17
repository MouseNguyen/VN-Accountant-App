// src/services/ar-aging.service.ts
// AR Aging Report Service - Phase 4 Task 5

import prisma from '@/lib/prisma';
import { roundMoney } from '@/lib/decimal';
import { differenceInDays } from 'date-fns';

// ==========================================
// TYPES
// ==========================================

export interface AgingBucket {
    customer_id: string;
    customer_code: string;
    customer_name: string;
    current: number;      // 0-30 days (not overdue)
    days_1_30: number;    // 1-30 days overdue
    days_31_60: number;   // 31-60 days overdue
    days_61_90: number;   // 61-90 days overdue
    over_90: number;      // >90 days overdue
    total: number;
    invoice_count: number;
}

export interface AgingReportParams {
    as_of_date?: string;
    customer_id?: string;
}

export interface AgingReportResponse {
    as_of_date: string;
    customers: AgingBucket[];
    summary: {
        current: number;
        days_1_30: number;
        days_31_60: number;
        days_61_90: number;
        over_90: number;
        total: number;
        customer_count: number;
        invoice_count: number;
    };
}

export interface InvoiceAgingDetail {
    invoice_id: string;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    total_amount: number;
    paid_amount: number;
    balance: number;
    days_overdue: number;
    bucket: 'current' | 'days_1_30' | 'days_31_60' | 'days_61_90' | 'over_90';
}

export interface CustomerAgingDetail extends AgingBucket {
    invoices: InvoiceAgingDetail[];
}

// ==========================================
// GET AGING REPORT (SUMMARY)
// ==========================================

export async function getAgingReport(
    farmId: string,
    params: AgingReportParams = {}
): Promise<AgingReportResponse> {
    const asOfDate = params.as_of_date ? new Date(params.as_of_date) : new Date();

    const where: any = {
        farm_id: farmId,
        status: { in: ['POSTED', 'PARTIALLY_PAID', 'OVERDUE'] },
    };

    if (params.customer_id) {
        where.customer_id = params.customer_id;
    }

    const invoices = await prisma.aRInvoice.findMany({
        where,
        include: {
            customer: { select: { id: true, code: true, name: true } },
        },
        orderBy: { invoice_date: 'asc' },
    });

    const agingMap = new Map<string, AgingBucket>();

    for (const inv of invoices) {
        const balance = Number(inv.total_amount) - Number(inv.paid_amount);
        if (balance <= 0) continue;

        const daysOverdue = differenceInDays(asOfDate, inv.due_date);

        let bucket = agingMap.get(inv.customer_id);
        if (!bucket) {
            bucket = {
                customer_id: inv.customer_id,
                customer_code: inv.customer?.code || '',
                customer_name: inv.customer?.name || 'Unknown',
                current: 0,
                days_1_30: 0,
                days_31_60: 0,
                days_61_90: 0,
                over_90: 0,
                total: 0,
                invoice_count: 0,
            };
        }

        // Categorize by days overdue
        if (daysOverdue <= 0) {
            bucket.current += balance; // Not yet due
        } else if (daysOverdue <= 30) {
            bucket.days_1_30 += balance;
        } else if (daysOverdue <= 60) {
            bucket.days_31_60 += balance;
        } else if (daysOverdue <= 90) {
            bucket.days_61_90 += balance;
        } else {
            bucket.over_90 += balance;
        }

        bucket.total += balance;
        bucket.invoice_count += 1;
        agingMap.set(inv.customer_id, bucket);
    }

    // Convert to array and round
    const customers = Array.from(agingMap.values()).map(b => ({
        ...b,
        current: roundMoney(b.current),
        days_1_30: roundMoney(b.days_1_30),
        days_31_60: roundMoney(b.days_31_60),
        days_61_90: roundMoney(b.days_61_90),
        over_90: roundMoney(b.over_90),
        total: roundMoney(b.total),
    }));

    // Sort by total descending
    customers.sort((a, b) => b.total - a.total);

    // Calculate summary
    const summary = {
        current: roundMoney(customers.reduce((sum, c) => sum + c.current, 0)),
        days_1_30: roundMoney(customers.reduce((sum, c) => sum + c.days_1_30, 0)),
        days_31_60: roundMoney(customers.reduce((sum, c) => sum + c.days_31_60, 0)),
        days_61_90: roundMoney(customers.reduce((sum, c) => sum + c.days_61_90, 0)),
        over_90: roundMoney(customers.reduce((sum, c) => sum + c.over_90, 0)),
        total: roundMoney(customers.reduce((sum, c) => sum + c.total, 0)),
        customer_count: customers.length,
        invoice_count: customers.reduce((sum, c) => sum + c.invoice_count, 0),
    };

    return {
        as_of_date: asOfDate.toISOString().split('T')[0],
        customers,
        summary,
    };
}

// ==========================================
// GET CUSTOMER AGING DETAIL (WITH INVOICES)
// ==========================================

export async function getCustomerAgingDetail(
    farmId: string,
    customerId: string,
    asOfDate?: string
): Promise<CustomerAgingDetail | null> {
    const date = asOfDate ? new Date(asOfDate) : new Date();

    const invoices = await prisma.aRInvoice.findMany({
        where: {
            farm_id: farmId,
            customer_id: customerId,
            status: { in: ['POSTED', 'PARTIALLY_PAID', 'OVERDUE'] },
        },
        include: {
            customer: { select: { id: true, code: true, name: true } },
        },
        orderBy: { due_date: 'asc' },
    });

    if (invoices.length === 0) return null;

    const customer = invoices[0].customer;
    const result: CustomerAgingDetail = {
        customer_id: customerId,
        customer_code: customer?.code || '',
        customer_name: customer?.name || 'Unknown',
        current: 0,
        days_1_30: 0,
        days_31_60: 0,
        days_61_90: 0,
        over_90: 0,
        total: 0,
        invoice_count: 0,
        invoices: [],
    };

    for (const inv of invoices) {
        const balance = Number(inv.total_amount) - Number(inv.paid_amount);
        if (balance <= 0) continue;

        const daysOverdue = differenceInDays(date, inv.due_date);
        let bucket: InvoiceAgingDetail['bucket'] = 'current';

        if (daysOverdue <= 0) {
            result.current += balance;
            bucket = 'current';
        } else if (daysOverdue <= 30) {
            result.days_1_30 += balance;
            bucket = 'days_1_30';
        } else if (daysOverdue <= 60) {
            result.days_31_60 += balance;
            bucket = 'days_31_60';
        } else if (daysOverdue <= 90) {
            result.days_61_90 += balance;
            bucket = 'days_61_90';
        } else {
            result.over_90 += balance;
            bucket = 'over_90';
        }

        result.total += balance;
        result.invoice_count += 1;

        result.invoices.push({
            invoice_id: inv.id,
            invoice_number: inv.invoice_number,
            invoice_date: inv.invoice_date.toISOString().split('T')[0],
            due_date: inv.due_date.toISOString().split('T')[0],
            total_amount: roundMoney(Number(inv.total_amount)),
            paid_amount: roundMoney(Number(inv.paid_amount)),
            balance: roundMoney(balance),
            days_overdue: Math.max(0, daysOverdue),
            bucket,
        });
    }

    // Round totals
    result.current = roundMoney(result.current);
    result.days_1_30 = roundMoney(result.days_1_30);
    result.days_31_60 = roundMoney(result.days_31_60);
    result.days_61_90 = roundMoney(result.days_61_90);
    result.over_90 = roundMoney(result.over_90);
    result.total = roundMoney(result.total);

    return result;
}

// ==========================================
// EXPORT AGING TO EXCEL DATA
// ==========================================

export interface AgingExcelRow {
    customer_code: string;
    customer_name: string;
    current: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    over_90: number;
    total: number;
}

export async function getAgingExportData(
    farmId: string,
    asOfDate?: string
): Promise<{ rows: AgingExcelRow[]; summary: AgingExcelRow }> {
    const report = await getAgingReport(farmId, { as_of_date: asOfDate });

    const rows: AgingExcelRow[] = report.customers.map(c => ({
        customer_code: c.customer_code,
        customer_name: c.customer_name,
        current: c.current,
        days_1_30: c.days_1_30,
        days_31_60: c.days_31_60,
        days_61_90: c.days_61_90,
        over_90: c.over_90,
        total: c.total,
    }));

    const summary: AgingExcelRow = {
        customer_code: '',
        customer_name: 'TỔNG CỘNG',
        current: report.summary.current,
        days_1_30: report.summary.days_1_30,
        days_31_60: report.summary.days_31_60,
        days_61_90: report.summary.days_61_90,
        over_90: report.summary.over_90,
        total: report.summary.total,
    };

    return { rows, summary };
}
