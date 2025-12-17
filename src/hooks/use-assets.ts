// src/hooks/use-assets.ts
// React Query hooks for Fixed Assets
// Custom hooks for managing fixed asset data with React Query

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import {
    AssetDetail,
    AssetSummary,
    DepreciationScheduleRow,
    DepreciationResult,
    AssetFilters,
} from '@/types/asset';
import {
    CreateAssetSchema,
    UpdateAssetSchema,
    DisposeAssetSchema,
} from '@/lib/validations/asset';

// ==========================================
// QUERY KEYS
// ==========================================

export const assetKeys = {
    all: ['assets'] as const,
    lists: () => [...assetKeys.all, 'list'] as const,
    list: (filters: AssetFilters) => [...assetKeys.lists(), filters] as const,
    details: () => [...assetKeys.all, 'detail'] as const,
    detail: (id: string) => [...assetKeys.details(), id] as const,
    summary: () => [...assetKeys.all, 'summary'] as const,
    depreciation: () => [...assetKeys.all, 'depreciation'] as const,
    depreciationByAsset: (assetId: string) => [...assetKeys.depreciation(), 'asset', assetId] as const,
    depreciationByYear: (year: number) => [...assetKeys.depreciation(), 'year', year] as const,
};

// ==========================================
// GET ASSETS LIST
// ==========================================

export function useAssets(filters?: AssetFilters) {
    return useQuery({
        queryKey: assetKeys.list(filters || {}),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters?.status) params.set('status', filters.status);
            if (filters?.category) params.set('category', filters.category);
            if (filters?.search) params.set('search', filters.search);
            if (filters?.from_date) params.set('from_date', filters.from_date);
            if (filters?.to_date) params.set('to_date', filters.to_date);

            const res = await apiClient.get<AssetDetail[]>(`/assets?${params.toString()}`);
            return res;
        },
    });
}

// ==========================================
// GET SINGLE ASSET
// ==========================================

export function useAsset(id: string | null) {
    return useQuery({
        queryKey: assetKeys.detail(id || ''),
        queryFn: async () => {
            if (!id) return null;
            const res = await apiClient.get<AssetDetail>(`/assets/${id}`);
            return res.data ?? null;
        },
        enabled: !!id,
    });
}

// ==========================================
// ASSET SUMMARY
// ==========================================

export function useAssetSummary() {
    return useQuery({
        queryKey: assetKeys.summary(),
        queryFn: async () => {
            const res = await apiClient.get<AssetSummary>('/assets?summary=true');
            return res.data ?? null;
        },
    });
}

// ==========================================
// DEPRECIATION SCHEDULE
// ==========================================

export function useDepreciationSchedule(assetId?: string, year?: number) {
    return useQuery({
        queryKey: assetId ? assetKeys.depreciationByAsset(assetId) : assetKeys.depreciationByYear(year || new Date().getFullYear()),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (assetId) params.set('asset_id', assetId);
            if (year) params.set('year', String(year));

            const res = await apiClient.get<DepreciationScheduleRow[]>(`/assets/depreciation?${params.toString()}`);
            return res.data ?? [];
        },
    });
}

// ==========================================
// CREATE ASSET
// ==========================================

export function useCreateAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateAssetSchema) => {
            const res = await apiClient.post<AssetDetail>('/assets', data);
            if (!res.success || !res.data) {
                throw new Error((res.error as any)?.message || 'Lỗi tạo tài sản');
            }
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
            queryClient.invalidateQueries({ queryKey: assetKeys.summary() });
            toast.success(`Đã tạo tài sản: ${data.name}`);
        },
        onError: (error: any) => {
            toast.error(error.message || 'Lỗi tạo tài sản');
        },
    });
}

// ==========================================
// UPDATE ASSET
// ==========================================

export function useUpdateAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdateAssetSchema }) => {
            const res = await apiClient.put<AssetDetail>(`/assets/${id}`, data);
            if (!res.success || !res.data) {
                throw new Error((res.error as any)?.message || 'Lỗi cập nhật tài sản');
            }
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
            queryClient.invalidateQueries({ queryKey: assetKeys.detail(data.id) });
            queryClient.invalidateQueries({ queryKey: assetKeys.summary() });
            toast.success(`Đã cập nhật tài sản: ${data.name}`);
        },
        onError: (error: any) => {
            toast.error(error.message || 'Lỗi cập nhật tài sản');
        },
    });
}

// ==========================================
// DELETE ASSET
// ==========================================

export function useDeleteAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await apiClient.delete(`/assets/${id}`);
            if (!res.success) {
                throw new Error((res.error as any)?.message || 'Lỗi xóa tài sản');
            }
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
            queryClient.invalidateQueries({ queryKey: assetKeys.summary() });
            toast.success('Đã xóa tài sản');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Lỗi xóa tài sản');
        },
    });
}

// ==========================================
// DISPOSE ASSET
// ==========================================

export function useDisposeAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: DisposeAssetSchema }) => {
            const res = await apiClient.post<AssetDetail>(`/assets/${id}/dispose`, data);
            if (!res.success || !res.data) {
                throw new Error((res.error as any)?.message || 'Lỗi thanh lý tài sản');
            }
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
            queryClient.invalidateQueries({ queryKey: assetKeys.detail(data.id) });
            queryClient.invalidateQueries({ queryKey: assetKeys.summary() });
            const message = data.status === 'SOLD' ? 'Đã bán' : 'Đã thanh lý';
            toast.success(`${message}: ${data.name}`);
        },
        onError: (error: any) => {
            toast.error(error.message || 'Lỗi thanh lý tài sản');
        },
    });
}

// ==========================================
// RUN DEPRECIATION
// ==========================================

export function useRunDepreciation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (period?: string) => {
            const res = await apiClient.post<DepreciationResult>('/assets/depreciation', { period });
            if (!res.success || !res.data) {
                throw new Error((res.error as any)?.message || 'Lỗi tính khấu hao');
            }
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
            queryClient.invalidateQueries({ queryKey: assetKeys.depreciation() });
            queryClient.invalidateQueries({ queryKey: assetKeys.summary() });
            toast.success(
                `Khấu hao: ${data.processed} xử lý, ${data.skipped} bỏ qua` +
                (data.errors > 0 ? `, ${data.errors} lỗi` : '')
            );
        },
        onError: (error: any) => {
            toast.error(error.message || 'Lỗi tính khấu hao');
        },
    });
}
