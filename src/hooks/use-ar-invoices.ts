// src/hooks/use-ar-invoices.ts
// React Query hooks for AR Invoices

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
    ARInvoice,
    ARInvoiceListParams,
    ARInvoiceListResponse,
    CreateARInvoiceInput,
    UpdateARInvoiceInput,
} from '@/types/ar-invoice';

const API_BASE = '/api/ar/invoices';

// Fetch AR Invoices
async function fetchARInvoices(
    farmId: string,
    params: ARInvoiceListParams
): Promise<ARInvoiceListResponse> {
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
        throw new Error(error.error || 'Failed to fetch invoices');
    }
    return res.json();
}

// Fetch single invoice
async function fetchARInvoice(farmId: string, id: string): Promise<ARInvoice> {
    const res = await fetch(`${API_BASE}/${id}?farm_id=${farmId}`);
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch invoice');
    }
    return res.json();
}

// Create invoice
async function createARInvoice(input: CreateARInvoiceInput): Promise<ARInvoice> {
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

// Update invoice
async function updateARInvoice(
    farmId: string,
    id: string,
    input: UpdateARInvoiceInput
): Promise<ARInvoice> {
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

// Delete invoice
async function deleteARInvoice(farmId: string, id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/${id}?farm_id=${farmId}`, {
        method: 'DELETE',
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete invoice');
    }
}

// ==========================================
// HOOKS
// ==========================================

export function useARInvoices(farmId: string, params: ARInvoiceListParams = {}) {
    return useQuery({
        queryKey: ['ar-invoices', farmId, params],
        queryFn: () => fetchARInvoices(farmId, params),
        enabled: !!farmId,
    });
}

export function useARInvoice(farmId: string, id: string) {
    return useQuery({
        queryKey: ['ar-invoice', farmId, id],
        queryFn: () => fetchARInvoice(farmId, id),
        enabled: !!farmId && !!id,
    });
}

export function useCreateARInvoice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createARInvoice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ar-invoices'] });
        },
    });
}

export function useUpdateARInvoice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            farmId,
            id,
            input,
        }: {
            farmId: string;
            id: string;
            input: UpdateARInvoiceInput;
        }) => updateARInvoice(farmId, id, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ar-invoices'] });
            queryClient.invalidateQueries({ queryKey: ['ar-invoice'] });
        },
    });
}

export function useDeleteARInvoice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ farmId, id }: { farmId: string; id: string }) =>
            deleteARInvoice(farmId, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ar-invoices'] });
        },
    });
}
