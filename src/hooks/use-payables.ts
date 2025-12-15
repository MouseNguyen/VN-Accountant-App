// src/hooks/use-payables.ts
// React Query hooks cho module công nợ

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
    PayableQuery,
    PayableListResponse,
    PayDebtRequest,
    PayDebtResponse,
    BulkPayDebtRequest,
    BulkPayDebtResponse,
    PaymentHistoryQuery,
    PaymentHistoryResponse,
    UpdateCreditLimitRequest,
} from '@/types/payable';

const API_BASE = '/api/payables';

// ============ Query Keys ============
export const payableKeys = {
    all: ['payables'] as const,
    lists: () => [...payableKeys.all, 'list'] as const,
    list: (filters: PayableQuery) => [...payableKeys.lists(), filters] as const,
    history: () => [...payableKeys.all, 'history'] as const,
    historyList: (filters: PaymentHistoryQuery) => [...payableKeys.history(), filters] as const,
};

// ============ API Functions ============
async function fetchPayables(query: PayableQuery): Promise<PayableListResponse> {
    const params = new URLSearchParams();
    if (query.farm_id) params.set('farm_id', query.farm_id);
    if (query.partner_type) params.set('partner_type', query.partner_type);
    if (query.status) params.set('status', query.status);
    if (query.search) params.set('search', query.search);
    if (query.page) params.set('page', query.page.toString());
    if (query.limit) params.set('limit', query.limit.toString());

    const response = await fetch(`${API_BASE}?${params}`, {
        credentials: 'include',
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Lỗi khi tải danh sách công nợ');
    }

    const result = await response.json();
    return result.data;
}

async function payDebt(data: PayDebtRequest): Promise<PayDebtResponse> {
    const response = await fetch(`${API_BASE}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Lỗi thanh toán');
    }

    const result = await response.json();
    return result.data;
}

async function bulkPayDebt(data: BulkPayDebtRequest): Promise<BulkPayDebtResponse> {
    const response = await fetch(`${API_BASE}/bulk-pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Lỗi thanh toán hàng loạt');
    }

    const result = await response.json();
    return result.data;
}

async function fetchPaymentHistory(query: PaymentHistoryQuery): Promise<PaymentHistoryResponse> {
    const params = new URLSearchParams();
    if (query.farm_id) params.set('farm_id', query.farm_id);
    if (query.partner_id) params.set('partner_id', query.partner_id);
    if (query.start_date) params.set('start_date', query.start_date);
    if (query.end_date) params.set('end_date', query.end_date);
    if (query.page) params.set('page', query.page.toString());
    if (query.limit) params.set('limit', query.limit.toString());

    const response = await fetch(`${API_BASE}/history?${params}`, {
        credentials: 'include',
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Lỗi khi tải lịch sử thanh toán');
    }

    const result = await response.json();
    return result.data;
}

async function updateCreditLimit(
    partnerId: string,
    data: Omit<UpdateCreditLimitRequest, 'partner_id'>
): Promise<void> {
    const response = await fetch(`/api/partners/${partnerId}/credit-limit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Lỗi cập nhật hạn mức');
    }
}

// ============ Hooks ============

/**
 * Hook để lấy danh sách công nợ
 */
export function usePayables(query: PayableQuery) {
    return useQuery({
        queryKey: payableKeys.list(query),
        queryFn: () => fetchPayables(query),
        staleTime: 30 * 1000, // 30 seconds
    });
}

/**
 * Hook để thanh toán công nợ (FIFO)
 */
export function usePayDebt() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: payDebt,
        onSuccess: () => {
            // Invalidate all payable queries
            queryClient.invalidateQueries({ queryKey: payableKeys.all });
            // Also invalidate partners and transactions
            queryClient.invalidateQueries({ queryKey: ['partners'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        },
    });
}

/**
 * Hook để thanh toán hàng loạt
 */
export function useBulkPayDebt() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: bulkPayDebt,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: payableKeys.all });
            queryClient.invalidateQueries({ queryKey: ['partners'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        },
    });
}

/**
 * Hook để lấy lịch sử thanh toán
 */
export function usePaymentHistory(query: PaymentHistoryQuery) {
    return useQuery({
        queryKey: payableKeys.historyList(query),
        queryFn: () => fetchPaymentHistory(query),
        staleTime: 30 * 1000,
    });
}

/**
 * Hook để cập nhật hạn mức tín dụng
 */
export function useUpdateCreditLimit() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ partnerId, ...data }: UpdateCreditLimitRequest & { partnerId: string }) =>
            updateCreditLimit(partnerId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: payableKeys.all });
            queryClient.invalidateQueries({ queryKey: ['partners'] });
        },
    });
}
