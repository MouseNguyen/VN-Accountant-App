// src/hooks/use-ar-aging.ts
// React Query hooks for AR Aging Report - Phase 4 Task 5

import { useQuery } from '@tanstack/react-query';
import type {
    AgingReportResponse,
    CustomerAgingDetail,
    AgingExcelRow,
} from '@/services/ar-aging.service';

const API_BASE = '/api/ar/aging';

// ==========================================
// FETCH FUNCTIONS
// ==========================================

interface AgingReportParams {
    as_of_date?: string;
    customer_id?: string;
}

async function fetchAgingReport(
    params: AgingReportParams = {}
): Promise<AgingReportResponse> {
    const searchParams = new URLSearchParams();

    if (params.as_of_date) searchParams.set('as_of_date', params.as_of_date);
    if (params.customer_id) searchParams.set('customer_id', params.customer_id);

    const url = searchParams.toString()
        ? `${API_BASE}?${searchParams.toString()}`
        : API_BASE;

    const res = await fetch(url);
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || 'Failed to fetch aging report');
    }
    const json = await res.json();
    return json.data;
}

async function fetchCustomerAgingDetail(
    customerId: string,
    asOfDate?: string
): Promise<CustomerAgingDetail> {
    const url = asOfDate
        ? `${API_BASE}/${customerId}?as_of_date=${asOfDate}`
        : `${API_BASE}/${customerId}`;

    const res = await fetch(url);
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || 'Failed to fetch customer aging');
    }
    const json = await res.json();
    return json.data;
}

async function fetchAgingExportData(
    asOfDate?: string
): Promise<{ rows: AgingExcelRow[]; summary: AgingExcelRow }> {
    const url = asOfDate
        ? `${API_BASE}?format=excel&as_of_date=${asOfDate}`
        : `${API_BASE}?format=excel`;

    const res = await fetch(url);
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || 'Failed to fetch export data');
    }
    const json = await res.json();
    return json.data;
}

// ==========================================
// HOOKS
// ==========================================

export function useAgingReport(params: AgingReportParams = {}) {
    return useQuery({
        queryKey: ['ar-aging', params],
        queryFn: () => fetchAgingReport(params),
    });
}

export function useCustomerAgingDetail(customerId: string, asOfDate?: string) {
    return useQuery({
        queryKey: ['ar-aging-detail', customerId, asOfDate],
        queryFn: () => fetchCustomerAgingDetail(customerId, asOfDate),
        enabled: !!customerId,
    });
}

export function useAgingExportData(asOfDate?: string) {
    return useQuery({
        queryKey: ['ar-aging-export', asOfDate],
        queryFn: () => fetchAgingExportData(asOfDate),
        enabled: false, // Only fetch on demand
    });
}

// ==========================================
// EXCEL EXPORT HELPER
// ==========================================

export function downloadAgingExcel(
    rows: AgingExcelRow[],
    summary: AgingExcelRow,
    asOfDate: string
) {
    // Build CSV content (simple export without xlsx library)
    const headers = [
        'Mã KH',
        'Tên khách hàng',
        'Chưa đến hạn',
        '1-30 ngày',
        '31-60 ngày',
        '61-90 ngày',
        'Trên 90 ngày',
        'Tổng cộng',
    ];

    const csvRows = [
        headers.join(','),
        ...rows.map(r =>
            [
                r.customer_code,
                `"${r.customer_name}"`,
                r.current,
                r.days_1_30,
                r.days_31_60,
                r.days_61_90,
                r.over_90,
                r.total,
            ].join(',')
        ),
        '', // Empty row before summary
        [
            '',
            'TỔNG CỘNG',
            summary.current,
            summary.days_1_30,
            summary.days_31_60,
            summary.days_61_90,
            summary.over_90,
            summary.total,
        ].join(','),
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AR_Aging_Report_${asOfDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}
