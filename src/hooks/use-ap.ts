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

            // Filter for EXPENSE transactions (AP)
            searchParams.set('trans_type', 'EXPENSE');
            // Don't set payment_status - will filter unpaid ones client-side

            if (params.page) searchParams.set('page', String(params.page));
            if (params.limit) searchParams.set('limit', String(params.limit));
            if (params.search) searchParams.set('search', params.search);
            if (params.vendor_id) searchParams.set('partner_id', params.vendor_id);
            if (params.date_from) searchParams.set('date_from', params.date_from);
            if (params.date_to) searchParams.set('date_to', params.date_to);

            const response = await fetch(`${API_BASE}/transactions?${searchParams}`, {
                credentials: 'include',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Không thể tải danh sách công nợ');
            }

            const json = await response.json();
            const data = json.data;

            // Map Transaction format to APTransaction format
            const allItems = (data?.items || data || []).map((t: any) => ({
                id: t.id,
                farm_id: t.farm_id,
                vendor_id: t.partner_id,
                vendor: t.partner ? {
                    id: t.partner.id,
                    code: t.partner.code,
                    name: t.partner.name,
                    phone: t.partner.phone,
                } : undefined,
                type: 'INVOICE',
                code: t.code || t.trans_number,
                trans_date: t.trans_date,
                amount: Number(t.total_amount || 0),
                paid_amount: Number(t.paid_amount || 0),
                balance: Number(t.total_amount || 0) - Number(t.paid_amount || 0),
                due_date: t.due_date,
                days_overdue: calculateDaysOverdue(t.due_date),
                status: t.payment_status === 'PAID' ? 'PAID' :
                    calculateDaysOverdue(t.due_date) > 0 ? 'OVERDUE' :
                        Number(t.paid_amount) > 0 ? 'PARTIAL' : 'UNPAID',
                payment_status: t.payment_status,
                description: t.description,
                notes: t.notes,
                created_at: t.created_at,
                updated_at: t.updated_at,
            }));

            // Filter only unpaid items (PENDING, PARTIAL, or UNPAID - database uses different values)
            const items = allItems.filter((i: any) =>
                i.payment_status === 'PENDING' ||
                i.payment_status === 'PARTIAL' ||
                i.payment_status === 'UNPAID'
            );

            return {
                items,
                total: items.length,
                page: params.page || 1,
                limit: params.limit || 20,
                hasMore: items.length >= (params.limit || 20),
                summary: {
                    total_payable: items.reduce((sum: number, i: any) => sum + i.balance, 0),
                    total_overdue: items.filter((i: any) => i.days_overdue > 0).reduce((sum: number, i: any) => sum + i.balance, 0),
                    total_paid_this_month: 0,
                },
            };
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

            return response.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: apKeys.all });
            queryClient.invalidateQueries({ queryKey: ['partners'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            toast.success(
                `Trả tiền thành công: ${data.amount.toLocaleString()}đ cho ${data.allocations.length} hóa đơn`
            );
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });
}
