// src/hooks/use-vat.ts
// React Query hooks for VAT Declarations

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
    VATDeclaration,
    VATDeclarationListParams,
    VATDeclarationListResponse,
    CreateVATDeclarationInput,
    CalculateVATResult,
    TaxCodeValidation,
} from '@/types/vat';

const API_BASE = '/api/vat-declarations';

// ==========================================
// QUERY KEYS
// ==========================================

export const vatKeys = {
    all: ['vat-declarations'] as const,
    lists: () => [...vatKeys.all, 'list'] as const,
    list: (params: VATDeclarationListParams) => [...vatKeys.lists(), params] as const,
    detail: (id: string) => [...vatKeys.all, 'detail', id] as const,
};

// ==========================================
// GET VAT DECLARATIONS
// ==========================================

export function useVATDeclarations(params: VATDeclarationListParams = {}) {
    return useQuery<VATDeclarationListResponse>({
        queryKey: vatKeys.list(params),
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params.page) searchParams.set('page', String(params.page));
            if (params.limit) searchParams.set('limit', String(params.limit));
            if (params.year) searchParams.set('year', String(params.year));
            if (params.status) searchParams.set('status', params.status);

            const response = await fetch(`${API_BASE}?${searchParams}`, {
                credentials: 'include',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Không thể tải danh sách tờ khai');
            }

            const json = await response.json();
            return json.data;
        },
    });
}

// ==========================================
// GET SINGLE DECLARATION
// ==========================================

export function useVATDeclaration(id: string) {
    return useQuery<VATDeclaration>({
        queryKey: vatKeys.detail(id),
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/${id}`, {
                credentials: 'include',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Không thể tải tờ khai');
            }

            const json = await response.json();
            return json.data;
        },
        enabled: !!id,
    });
}

// ==========================================
// CREATE DECLARATION
// ==========================================

export function useCreateVATDeclaration() {
    const queryClient = useQueryClient();

    return useMutation<VATDeclaration, Error, CreateVATDeclarationInput>({
        mutationFn: async (input) => {
            const response = await fetch(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(input),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Không thể tạo tờ khai');
            }

            const json = await response.json();
            return json.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vatKeys.all });
            toast.success('Đã tạo tờ khai thành công');
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });
}

// ==========================================
// CALCULATE VAT
// ==========================================

export function useCalculateVAT() {
    const queryClient = useQueryClient();

    return useMutation<CalculateVATResult, Error, string>({
        mutationFn: async (declarationId) => {
            const response = await fetch(`${API_BASE}/${declarationId}/calculate`, {
                method: 'POST',
                credentials: 'include',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Không thể tính thuế');
            }

            const json = await response.json();
            return json.data;
        },
        onSuccess: (_, declarationId) => {
            queryClient.invalidateQueries({ queryKey: vatKeys.all });
            queryClient.invalidateQueries({ queryKey: vatKeys.detail(declarationId) });
            toast.success('Đã tính thuế thành công');
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });
}

// ==========================================
// SUBMIT DECLARATION
// ==========================================

export function useSubmitVATDeclaration() {
    const queryClient = useQueryClient();

    return useMutation<VATDeclaration, Error, string>({
        mutationFn: async (declarationId) => {
            const response = await fetch(`${API_BASE}/${declarationId}/submit`, {
                method: 'POST',
                credentials: 'include',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Không thể nộp tờ khai');
            }

            const json = await response.json();
            return json.data;
        },
        onSuccess: (_, declarationId) => {
            queryClient.invalidateQueries({ queryKey: vatKeys.all });
            queryClient.invalidateQueries({ queryKey: vatKeys.detail(declarationId) });
            toast.success('Đã nộp tờ khai thành công');
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });
}

// ==========================================
// DELETE DECLARATION
// ==========================================

export function useDeleteVATDeclaration() {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: async (declarationId) => {
            const response = await fetch(`${API_BASE}/${declarationId}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Không thể xóa tờ khai');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vatKeys.all });
            toast.success('Đã xóa tờ khai');
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });
}

// ==========================================
// DOWNLOAD XML
// ==========================================

export function useDownloadVATXML() {
    return useMutation<void, Error, { id: string; periodCode: string }>({
        mutationFn: async ({ id, periodCode }) => {
            const response = await fetch(`${API_BASE}/${id}/xml`, {
                credentials: 'include',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Không thể xuất XML');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `tokhai-gtgt-${periodCode}.xml`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        },
        onSuccess: () => {
            toast.success('Đã tải xuống XML');
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });
}

// ==========================================
// VALIDATE TAX CODE
// ==========================================

export function useValidateTaxCode() {
    return useMutation<TaxCodeValidation, Error, string>({
        mutationFn: async (taxCode) => {
            const response = await fetch('/api/vat/validate-tax-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ tax_code: taxCode }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Không thể kiểm tra MST');
            }

            const json = await response.json();
            return json.data;
        },
    });
}
