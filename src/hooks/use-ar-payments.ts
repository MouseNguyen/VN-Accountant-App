// src/hooks/use-ar-payments.ts
// React Query hooks for AR Payments - Phase 4 Task 4

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
    ARPayment,
    ARPaymentListParams,
    ARPaymentListResponse,
    CreateARPaymentInput,
    UpdateARPaymentInput,
    AllocatePaymentInput,
} from '@/types/ar-payment';

const API_BASE = '/api/ar/payments';

// ==========================================
// FETCH FUNCTIONS
// ==========================================

async function fetchARPayments(
    farmId: string,
    params: ARPaymentListParams
): Promise<ARPaymentListResponse> {
    const searchParams = new URLSearchParams({ farm_id: farmId });

    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.status) searchParams.set('status', params.status);
    if (params.customer_id) searchParams.set('customer_id', params.customer_id);
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

async function fetchARPayment(farmId: string, id: string): Promise<ARPayment> {
    const res = await fetch(`${API_BASE}/${id}?farm_id=${farmId}`);
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch payment');
    }
    return res.json();
}

async function createARPayment(input: CreateARPaymentInput): Promise<ARPayment> {
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

async function updateARPayment(
    farmId: string,
    id: string,
    input: UpdateARPaymentInput
): Promise<ARPayment> {
    const res = await fetch(`${API_BASE}/${id}?farm_id=${farmId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update payment');
    }
    return res.json();
}

async function deleteARPayment(farmId: string, id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/${id}?farm_id=${farmId}`, {
        method: 'DELETE',
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete payment');
    }
}

async function postARPayment(farmId: string, id: string): Promise<{ payment: ARPayment }> {
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

async function allocateARPayment(
    farmId: string,
    id: string,
    input: AllocatePaymentInput
): Promise<{ payment: ARPayment }> {
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

async function autoAllocateARPayment(
    farmId: string,
    id: string
): Promise<{ payment: ARPayment; allocations: any[] }> {
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

async function voidARPayment(
    farmId: string,
    id: string,
    reason?: string
): Promise<{ payment: ARPayment }> {
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

export function useARPayments(farmId: string, params: ARPaymentListParams = {}) {
    return useQuery({
        queryKey: ['ar-payments', farmId, params],
        queryFn: () => fetchARPayments(farmId, params),
        enabled: !!farmId,
    });
}

export function useARPayment(farmId: string, id: string) {
    return useQuery({
        queryKey: ['ar-payment', farmId, id],
        queryFn: () => fetchARPayment(farmId, id),
        enabled: !!farmId && !!id,
    });
}

export function useCreateARPayment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createARPayment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ar-payments'] });
        },
    });
}

export function useUpdateARPayment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            farmId,
            id,
            input,
        }: {
            farmId: string;
            id: string;
            input: UpdateARPaymentInput;
        }) => updateARPayment(farmId, id, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ar-payments'] });
            queryClient.invalidateQueries({ queryKey: ['ar-payment'] });
        },
    });
}

export function useDeleteARPayment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ farmId, id }: { farmId: string; id: string }) =>
            deleteARPayment(farmId, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ar-payments'] });
        },
    });
}

export function usePostARPayment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ farmId, id }: { farmId: string; id: string }) =>
            postARPayment(farmId, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ar-payments'] });
            queryClient.invalidateQueries({ queryKey: ['ar-payment'] });
            queryClient.invalidateQueries({ queryKey: ['ar-invoices'] });
        },
    });
}

export function useAllocateARPayment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            farmId,
            id,
            input,
        }: {
            farmId: string;
            id: string;
            input: AllocatePaymentInput;
        }) => allocateARPayment(farmId, id, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ar-payments'] });
            queryClient.invalidateQueries({ queryKey: ['ar-payment'] });
            queryClient.invalidateQueries({ queryKey: ['ar-invoices'] });
        },
    });
}

export function useAutoAllocateARPayment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ farmId, id }: { farmId: string; id: string }) =>
            autoAllocateARPayment(farmId, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ar-payments'] });
            queryClient.invalidateQueries({ queryKey: ['ar-payment'] });
            queryClient.invalidateQueries({ queryKey: ['ar-invoices'] });
        },
    });
}

export function useVoidARPayment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            farmId,
            id,
            reason,
        }: {
            farmId: string;
            id: string;
            reason?: string;
        }) => voidARPayment(farmId, id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ar-payments'] });
            queryClient.invalidateQueries({ queryKey: ['ar-payment'] });
            queryClient.invalidateQueries({ queryKey: ['ar-invoices'] });
        },
    });
}
