// src/hooks/use-reports.ts
// React Query hooks cho module báo cáo

import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
    IncomeExpenseReportParams,
    IncomeExpenseReport,
    ProfitLossReportParams,
    ProfitLossReport,
    InventoryReportParams,
    InventoryReport,
    PayableReport,
} from '@/types/report';

const API_BASE = '/api/reports';

// ============ Query Keys ============
export const reportKeys = {
    all: ['reports'] as const,
    incomeExpense: () => [...reportKeys.all, 'income-expense'] as const,
    incomeExpenseParams: (params: IncomeExpenseReportParams) =>
        [...reportKeys.incomeExpense(), params] as const,
    profitLoss: () => [...reportKeys.all, 'profit-loss'] as const,
    profitLossParams: (params: ProfitLossReportParams) =>
        [...reportKeys.profitLoss(), params] as const,
    inventory: () => [...reportKeys.all, 'inventory'] as const,
    inventoryParams: (params: InventoryReportParams) =>
        [...reportKeys.inventory(), params] as const,
    payable: () => [...reportKeys.all, 'payable'] as const,
};

// ============ API Functions ============
async function fetchIncomeExpenseReport(
    params: IncomeExpenseReportParams
): Promise<IncomeExpenseReport> {
    const searchParams = new URLSearchParams();
    // Note: farm_id is handled by context, but we keep it for compatibility
    if (params.farm_id) searchParams.set('farm_id', params.farm_id);
    searchParams.set('from', params.start_date);
    searchParams.set('to', params.end_date);
    if (params.group_by) searchParams.set('group_by', params.group_by);
    if (params.include_details !== undefined)
        searchParams.set('include_drill_down', params.include_details.toString());

    const response = await fetch(`${API_BASE}/income-expense?${searchParams}`, {
        credentials: 'include',
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Lỗi khi tải báo cáo thu chi');
    }

    const result = await response.json();
    return result.data;
}

async function fetchProfitLossReport(params: ProfitLossReportParams): Promise<ProfitLossReport> {
    const searchParams = new URLSearchParams();
    if (params.farm_id) searchParams.set('farm_id', params.farm_id);
    searchParams.set('from', params.start_date);
    searchParams.set('to', params.end_date);
    if (params.include_details !== undefined)
        searchParams.set('include_details', params.include_details.toString());

    const response = await fetch(`${API_BASE}/profit-loss?${searchParams}`, {
        credentials: 'include',
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Lỗi khi tải báo cáo lãi lỗ');
    }

    const result = await response.json();
    return result.data;
}

async function fetchInventoryReport(params: InventoryReportParams): Promise<InventoryReport> {
    const searchParams = new URLSearchParams();
    searchParams.set('farm_id', params.farm_id);
    if (params.as_of_date) searchParams.set('as_of_date', params.as_of_date);
    if (params.low_stock_only !== undefined)
        searchParams.set('low_stock_only', params.low_stock_only.toString());

    const response = await fetch(`${API_BASE}/inventory?${searchParams}`, {
        credentials: 'include',
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Lỗi khi tải báo cáo tồn kho');
    }

    const result = await response.json();
    return result.data;
}

async function fetchPayableReport(): Promise<PayableReport> {
    const response = await fetch(`${API_BASE}/payable`, {
        credentials: 'include',
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Lỗi khi tải báo cáo công nợ');
    }

    const result = await response.json();
    return result.data;
}

// ============ Export API ============
interface ExportReportParams {
    report_type: 'income_expense' | 'profit_loss' | 'inventory' | 'payable';
    from?: string;
    to?: string;
}

interface ExportReportResponse {
    success: boolean;
    filename: string;
    data: unknown;
    export_format: string;
}

async function exportReport(params: ExportReportParams): Promise<ExportReportResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set('report_type', params.report_type);
    if (params.from) searchParams.set('from', params.from);
    if (params.to) searchParams.set('to', params.to);

    const response = await fetch(`${API_BASE}/export?${searchParams}`, {
        credentials: 'include',
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Lỗi khi xuất báo cáo');
    }

    return response.json();
}

// ============ Hooks ============

/**
 * Hook để lấy báo cáo thu chi
 */
export function useIncomeExpenseReport(
    params: IncomeExpenseReportParams,
    options?: { enabled?: boolean }
) {
    return useQuery({
        queryKey: reportKeys.incomeExpenseParams(params),
        queryFn: () => fetchIncomeExpenseReport(params),
        staleTime: 5 * 60 * 1000, // 5 minutes - reports don't change often
        enabled: options?.enabled ?? true,
    });
}

/**
 * Hook để lấy báo cáo lãi lỗ
 */
export function useProfitLossReport(
    params: ProfitLossReportParams,
    options?: { enabled?: boolean }
) {
    return useQuery({
        queryKey: reportKeys.profitLossParams(params),
        queryFn: () => fetchProfitLossReport(params),
        staleTime: 5 * 60 * 1000,
        enabled: options?.enabled ?? true,
    });
}

/**
 * Hook để lấy báo cáo tồn kho
 */
export function useInventoryReport(
    params: InventoryReportParams,
    options?: { enabled?: boolean }
) {
    return useQuery({
        queryKey: reportKeys.inventoryParams(params),
        queryFn: () => fetchInventoryReport(params),
        staleTime: 2 * 60 * 1000, // 2 minutes - inventory changes more often
        enabled: options?.enabled ?? true,
    });
}

/**
 * Hook để lấy báo cáo công nợ (aging)
 */
export function usePayableReport(options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: reportKeys.payable(),
        queryFn: fetchPayableReport,
        staleTime: 5 * 60 * 1000,
        enabled: options?.enabled ?? true,
    });
}

/**
 * Hook để lấy tóm tắt AR (Công nợ phải thu) từ module AR mới
 */
export function useARSummary(options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: ['ar-summary'],
        queryFn: async () => {
            const response = await fetch('/api/ar/summary', {
                credentials: 'include',
            });
            if (!response.ok) {
                throw new Error('Lỗi khi tải tóm tắt công nợ phải thu');
            }
            const result = await response.json();
            return result.data as {
                total_receivable: number;
                total_overdue: number;
                overdue_count: number;
                total_customers_with_debt: number;
                collected_this_month: number;
            };
        },
        staleTime: 2 * 60 * 1000,
        enabled: options?.enabled ?? true,
    });
}

/**
 * Hook để xuất báo cáo (mutation)
 */
export function useExportReport() {
    return useMutation({
        mutationFn: exportReport,
        onSuccess: (data) => {
            // Download JSON as file
            const blob = new Blob([JSON.stringify(data.data, null, 2)], {
                type: 'application/json',
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = data.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success('Xuất báo cáo thành công!');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Lỗi xuất báo cáo');
        },
    });
}

// ============ Export utilities ============

/**
 * Download report as Excel file
 */
export async function downloadReportExcel(
    reportType: 'income-expense' | 'profit-loss' | 'inventory' | 'payable',
    params?: Record<string, string>
): Promise<void> {
    // Convert hyphenated reportType to underscored for API
    const reportTypeMap: Record<string, string> = {
        'income-expense': 'income_expense',
        'profit-loss': 'profit_loss',
        'inventory': 'inventory',
        'payable': 'payable',
    };

    const searchParams = new URLSearchParams(params);
    searchParams.set('report_type', reportTypeMap[reportType]);
    searchParams.set('format', 'excel');

    const response = await fetch(`${API_BASE}/export?${searchParams}`, {
        credentials: 'include',
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Lỗi khi xuất báo cáo' }));
        throw new Error(error.error?.message || error.error || 'Lỗi khi xuất báo cáo');
    }

    const contentType = response.headers.get('content-type') || '';

    // Handle Excel binary response
    if (contentType.includes('spreadsheetml') || contentType.includes('octet-stream')) {
        const blob = await response.blob();
        const contentDisposition = response.headers.get('content-disposition') || '';
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        const filename = filenameMatch ? filenameMatch[1] : `${reportType}-report.xlsx`;

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        return;
    }

    // Fallback: Handle JSON response (convert to downloadable JSON file)
    const result = await response.json();
    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename || `${reportType}-report.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}
