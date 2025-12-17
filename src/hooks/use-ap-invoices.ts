// src/hooks/use-ap-invoices.ts
// React Query hooks for AP Invoices - Phase 4 Task 6

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
    APInvoice,
    APInvoiceListParams,
    APInvoiceListResponse,
    CreateAPInvoiceInput,
    UpdateAPInvoiceInput,
} from '@/types/ap-invoice';

const API_BASE = '/api/ap/invoices';

// ==========================================
// FETCH FUNCTIONS
// ==========================================

async function fetchAPInvoices(
    farmId: string,
    params: APInvoiceListParams
): Promise<APInvoiceListResponse> {
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
        throw new Error(error.error || 'Failed to fetch invoices');
    }
    return res.json();
}

async function fetchAPInvoice(farmId: string, id: string): Promise<APInvoice> {
    const res = await fetch(`${API_BASE}/${id}?farm_id=${farmId}`);
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch invoice');
    }
    return res.json();
}

async function createAPInvoice(input: CreateAPInvoiceInput): Promise<APInvoice> {
    const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create invoice');
    }
    return res.json();
}

async function updateAPInvoice(
    farmId: string,
    id: string,
    input: UpdateAPInvoiceInput
): Promise<APInvoice> {
    const res = await fetch(`${API_BASE}/${id}?farm_id=${farmId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update invoice');
    }
    return res.json();
}

async function deleteAPInvoice(farmId: string, id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/${id}?farm_id=${farmId}`, {
        method: 'DELETE',
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete invoice');
    }
}

async function postAPInvoice(farmId: string, id: string): Promise<{ invoice: APInvoice }> {
    const res = await fetch(`${API_BASE}/${id}/post`, {
        method: 'POST',
        headers: { 'X-Farm-Id': farmId },
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to post invoice');
    }
    return res.json();
}

async function voidAPInvoice(farmId: string, id: string, reason?: string): Promise<{ invoice: APInvoice }> {
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
        throw new Error(error.error || 'Failed to void invoice');
    }
    return res.json();
}

// ==========================================
// HOOKS
// ==========================================

export function useAPInvoices(farmId: string, params: APInvoiceListParams = {}) {
    return useQuery({
        queryKey: ['ap-invoices', farmId, params],
        queryFn: () => fetchAPInvoices(farmId, params),
        enabled: !!farmId,
    });
}

export function useAPInvoice(farmId: string, id: string) {
    return useQuery({
        queryKey: ['ap-invoice', farmId, id],
        queryFn: () => fetchAPInvoice(farmId, id),
        enabled: !!farmId && !!id,
    });
}

export function useCreateAPInvoice() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createAPInvoice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ap-invoices'] });
        },
    });
}

export function useUpdateAPInvoice() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ farmId, id, input }: { farmId: string; id: string; input: UpdateAPInvoiceInput }) =>
            updateAPInvoice(farmId, id, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ap-invoices'] });
            queryClient.invalidateQueries({ queryKey: ['ap-invoice'] });
        },
    });
}

export function useDeleteAPInvoice() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ farmId, id }: { farmId: string; id: string }) => deleteAPInvoice(farmId, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ap-invoices'] });
        },
    });
}

export function usePostAPInvoice() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ farmId, id }: { farmId: string; id: string }) => postAPInvoice(farmId, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ap-invoices'] });
            queryClient.invalidateQueries({ queryKey: ['ap-invoice'] });
        },
    });
}

export function useVoidAPInvoice() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ farmId, id, reason }: { farmId: string; id: string; reason?: string }) =>
            voidAPInvoice(farmId, id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ap-invoices'] });
            queryClient.invalidateQueries({ queryKey: ['ap-invoice'] });
        },
    });
}
