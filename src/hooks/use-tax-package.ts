// src/hooks/use-tax-package.ts
// React Query hooks for Tax Package Export

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
    TaxPackageConfig,
    TaxPackageChecklist,
    TaxPackageExportResult,
    TaxPackageHistoryResponse,
} from '@/types/tax-package';

const API_BASE = '/api/tax-package';

// ==========================================
// QUERY KEYS
// ==========================================

export const taxPackageKeys = {
    all: ['tax-package'] as const,
    checklist: (periodType: string, periodCode: string) =>
        [...taxPackageKeys.all, 'checklist', periodType, periodCode] as const,
    history: (page: number) => [...taxPackageKeys.all, 'history', page] as const,
};

// ==========================================
// GET CHECKLIST
// ==========================================

export function useExportChecklist(periodType: string, periodCode: string) {
    return useQuery<TaxPackageChecklist>({
        queryKey: taxPackageKeys.checklist(periodType, periodCode),
        queryFn: async () => {
            const params = new URLSearchParams({
                period_type: periodType,
                period_code: periodCode,
            });

            const response = await fetch(`${API_BASE}/checklist?${params}`, {
                credentials: 'include',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Không thể tải checklist');
            }

            const json = await response.json();
            return json.data;
        },
        enabled: !!periodCode,
    });
}

// ==========================================
// EXPORT TAX PACKAGE
// ==========================================

export function useExportTaxPackage() {
    const queryClient = useQueryClient();

    return useMutation<TaxPackageExportResult, Error, TaxPackageConfig>({
        mutationFn: async (config) => {
            const response = await fetch(`${API_BASE}/export`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(config),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Không thể xuất hồ sơ');
            }

            const json = await response.json();
            return json.data;
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: taxPackageKeys.all });
            toast.success('Xuất hồ sơ thuế thành công!');

            // Auto download
            window.open(`${API_BASE}/${result.id}/download`, '_blank');
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });
}

// ==========================================
// GET HISTORY
// ==========================================

export function useTaxPackageHistory(page: number = 1) {
    return useQuery<TaxPackageHistoryResponse>({
        queryKey: taxPackageKeys.history(page),
        queryFn: async () => {
            const params = new URLSearchParams({
                page: String(page),
                limit: '20',
            });

            const response = await fetch(`${API_BASE}/history?${params}`, {
                credentials: 'include',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Không thể tải lịch sử');
            }

            const json = await response.json();
            return json.data;
        },
    });
}

// ==========================================
// DOWNLOAD
// ==========================================

export function useDownloadTaxPackage() {
    return useMutation<void, Error, { id: string; fileName: string }>({
        mutationFn: async ({ id }) => {
            window.open(`${API_BASE}/${id}/download`, '_blank');
        },
        onSuccess: () => {
            toast.success('Đang tải xuống...');
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });
}
