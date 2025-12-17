// src/hooks/use-ap-payments.ts
// React Query hooks for AP Payments - Phase 4 Task 6

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
    APPayment,
    APPaymentListParams,
    CreateAPPaymentInput,
    AllocateAPPaymentInput,
} from '@/types/ap-invoice';

const API_BASE = '/api/ap/payments';

// ==========================================
// FETCH FUNCTIONS
// ==========================================

async function fetchAPPayments(
    farmId: string,
    params: APPaymentListParams
): Promise<{ items: APPayment[]; total: number }> {
    const searchParams = new URLSearchParams({ farm_id: farmId });

    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.status) searchParams.set('status', params.status);
    if (params.vendor_id) searchParams.set('vendor_id', params.vendor_id);
    if (params.from_date) searchParams.set('from_date', params.from_date);
    if (params.to_date) searchParams.set('to_date', params.to_date);
    if (params.search) searchParams.set('search', params.search);

    const res = await fetch(`${API_BASE}?${searchParams.toString()}`);
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch payments');
    }
    return res.json();
}

async function createAPPayment(input: CreateAPPaymentInput): Promise<APPayment> {
    const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create payment');
    }
    return res.json();
}

async function postAPPayment(farmId: string, id: string): Promise<{ payment: APPayment }> {
    const res = await fetch(`${API_BASE}/${id}/post`, {
        method: 'POST',
        headers: { 'X-Farm-Id': farmId },
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to post payment');
    }
    return res.json();
}

async function allocateAPPayment(
    farmId: string,
    id: string,
    input: AllocateAPPaymentInput
): Promise<{ payment: APPayment }> {
    const res = await fetch(`${API_BASE}/${id}/allocate`, {
        method: 'POST',
        headers: {
            'X-Farm-Id': farmId,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to allocate payment');
    }
    return res.json();
}

async function autoAllocateAPPayment(
    farmId: string,
    id: string
): Promise<{ payment: APPayment; allocations: any[] }> {
    const res = await fetch(`${API_BASE}/${id}/auto-allocate`, {
        method: 'POST',
        headers: { 'X-Farm-Id': farmId },
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to auto-allocate payment');
    }
    return res.json();
}

async function voidAPPayment(
    farmId: string,
    id: string,
    reason?: string
): Promise<{ payment: APPayment }> {
    const res = await fetch(`${API_BASE}/${id}/void`, {
        method: 'POST',
        headers: {
            'X-Farm-Id': farmId,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to void payment');
    }
    return res.json();
}

// ==========================================
// HOOKS
// ==========================================

export function useAPPayments(farmId: string, params: APPaymentListParams = {}) {
    return useQuery({
        queryKey: ['ap-payments', farmId, params],
        queryFn: () => fetchAPPayments(farmId, params),
        enabled: !!farmId,
    });
}

export function useCreateAPPayment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createAPPayment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ap-payments'] });
        },
    });
}

export function usePostAPPayment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ farmId, id }: { farmId: string; id: string }) => postAPPayment(farmId, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ap-payments'] });
            queryClient.invalidateQueries({ queryKey: ['ap-invoices'] });
        },
    });
}

export function useAllocateAPPayment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ farmId, id, input }: { farmId: string; id: string; input: AllocateAPPaymentInput }) =>
            allocateAPPayment(farmId, id, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ap-payments'] });
            queryClient.invalidateQueries({ queryKey: ['ap-invoices'] });
        },
    });
}

export function useAutoAllocateAPPayment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ farmId, id }: { farmId: string; id: string }) => autoAllocateAPPayment(farmId, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ap-payments'] });
            queryClient.invalidateQueries({ queryKey: ['ap-invoices'] });
        },
    });
}

export function useVoidAPPayment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ farmId, id, reason }: { farmId: string; id: string; reason?: string }) =>
            voidAPPayment(farmId, id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ap-payments'] });
            queryClient.invalidateQueries({ queryKey: ['ap-invoices'] });
        },
    });
}
