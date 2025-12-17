// src/hooks/use-ap.ts
// React Query hooks for AP (Accounts Payable)

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
    APListParams,
    APListResponse,
    APSummary,
    APAgingReport,
    PaymentSchedule,
    CashFlowForecast,
    MakePaymentInput,
    MakePaymentResponse,
    CreateAPInput,
    APTransaction,
} from '@/types/ap';

const API_BASE = '/api';

// ==========================================
// QUERY KEYS
// ==========================================

export const apKeys = {
    all: ['ap'] as const,
    lists: () => [...apKeys.all, 'list'] as const,
    list: (params: APListParams) => [...apKeys.lists(), params] as const,
    summary: () => [...apKeys.all, 'summary'] as const,
    aging: () => [...apKeys.all, 'aging'] as const,
    schedule: () => [...apKeys.all, 'schedule'] as const,
    cashFlow: (days?: number) => [...apKeys.all, 'cash-flow', days] as const,
};

// ==========================================
// GET AP TRANSACTIONS
// ==========================================

export function useAPTransactions(params: APListParams = {}) {
    return useQuery<APListResponse>({
        queryKey: apKeys.list(params),
        queryFn: async () => {
            const searchParams = new URLSearchParams();

            // Use proper AP transactions API
            if (params.page) searchParams.set('page', String(params.page));
            if (params.limit) searchParams.set('limit', String(params.limit));
            if (params.search) searchParams.set('search', params.search);
            if (params.vendor_id) searchParams.set('vendor_id', params.vendor_id);
            if (params.status) searchParams.set('status', params.status);
            if (params.date_from) searchParams.set('date_from', params.date_from);
            if (params.date_to) searchParams.set('date_to', params.date_to);

            const response = await fetch(`${API_BASE}/ap-transactions?${searchParams}`, {
                credentials: 'include',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Không thể tải danh sách công nợ');
            }

            const json = await response.json();
            return json.data;
        },
    });
}

// Helper to calculate days overdue
function calculateDaysOverdue(dueDate: string | null | undefined): number {
    if (!dueDate) return 0;
    const due = new Date(dueDate);
    const today = new Date();
    const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
}

// ==========================================
// GET AP SUMMARY (from Transaction table via reports API)
// ==========================================

export function useAPSummary() {
    return useQuery<APSummary>({
        queryKey: apKeys.summary(),
        queryFn: async () => {
            // Use the reports/payable API which aggregates from Transaction table
            const response = await fetch(`${API_BASE}/reports/payable`, {
                credentials: 'include',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Không thể tải tổng hợp công nợ');
            }

            const json = await response.json();
            const data = json.data;

            // Map to APSummary type
            return {
                total_payable: data?.total_payable || 0,
                total_overdue: data?.overdue_payable || 0,
                due_soon_count: data?.partners?.length || 0,
                vendor_count: (data?.partners || []).filter((p: any) => p.partner_type === 'VENDOR').length,
            };
        },
    });
}

// ==========================================
// GET AGING REPORT
// ==========================================

export function useAPAgingReport() {
    return useQuery<APAgingReport>({
        queryKey: apKeys.aging(),
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/ap/aging`, {
                credentials: 'include',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Không thể tải báo cáo tuổi nợ');
            }

            const json = await response.json();
            return json.data;
        },
    });
}

// ==========================================
// GET PAYMENT SCHEDULE
// ==========================================

export function usePaymentSchedule() {
    return useQuery<PaymentSchedule>({
        queryKey: apKeys.schedule(),
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/ap/schedule`, {
                credentials: 'include',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Không thể tải lịch thanh toán');
            }

            const json = await response.json();
            return json.data;
        },
    });
}

// ==========================================
// GET CASH FLOW FORECAST
// ==========================================

export function useCashFlowForecast(days: number = 30) {
    return useQuery<CashFlowForecast>({
        queryKey: apKeys.cashFlow(days),
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/ap/cash-flow?days=${days}`, {
                credentials: 'include',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Không thể tải dự báo dòng tiền');
            }

            const json = await response.json();
            return json.data;
        },
    });
}

// ==========================================
// CREATE AP TRANSACTION
// ==========================================

export function useCreateAP() {
    const queryClient = useQueryClient();

    return useMutation<APTransaction, Error, CreateAPInput>({
        mutationFn: async (input) => {
            const response = await fetch(`${API_BASE}/ap-transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(input),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Không thể tạo công nợ');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: apKeys.all });
            toast.success('Tạo công nợ thành công');
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });
}

// ==========================================
// MAKE PAYMENT
// ==========================================

export function useMakePayment() {
    const queryClient = useQueryClient();

    return useMutation<MakePaymentResponse, Error, MakePaymentInput>({
        mutationFn: async (input) => {
            const response = await fetch(`${API_BASE}/ap/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(input),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Không thể trả tiền');
            }

            const result = await response.json();
            // API returns { success: true, data: result }
            return result.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: apKeys.all });
            queryClient.invalidateQueries({ queryKey: ['partners'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['reports'] }); // Refresh báo cáo
            queryClient.invalidateQueries({ queryKey: ['ar-summary'] });
            const amount = data?.amount ?? 0;
            const allocCount = data?.allocations?.length ?? 0;
            toast.success(
                `Trả tiền thành công: ${amount.toLocaleString()}đ cho ${allocCount} hóa đơn`
            );
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });
}
