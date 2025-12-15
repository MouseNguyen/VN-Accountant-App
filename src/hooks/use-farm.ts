// src/hooks/use-farm.ts
// React Query hook cho Farm management

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Farm {
    id: string;
    name: string;
    owner_name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    tax_code?: string | null;
    business_type: 'FARM' | 'RETAIL_FNB';
    fiscal_year_start: number;
    currency: string;
    locale: string;
    created_at: string;
}

interface UpdateFarmInput {
    name?: string;
    owner_name?: string;
    phone?: string;
    email?: string;
    address?: string;
    tax_code?: string;
    fiscal_year_start?: number;
}

// Fetch Farm
async function fetchFarm(): Promise<Farm> {
    const res = await fetch('/api/farms/current', {
        credentials: 'include',
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Lỗi khi tải thông tin');
    return data.data;
}

// Update Farm
async function updateFarmApi(input: UpdateFarmInput): Promise<Farm> {
    const res = await fetch('/api/farms/current', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Lỗi khi cập nhật');
    return data.data;
}

// Change Business Type
async function changeBusinessTypeApi(
    business_type: 'FARM' | 'RETAIL_FNB'
): Promise<{ requireReload: boolean }> {
    const res = await fetch('/api/farms/current/business-type', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ business_type, confirm: true }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Lỗi khi thay đổi');
    return data;
}

export function useFarm() {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['farm'],
        queryFn: fetchFarm,
        staleTime: 5 * 60 * 1000, // 5 phút
    });

    const updateMutation = useMutation({
        mutationFn: updateFarmApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['farm'] });
            toast.success('Cập nhật thành công!');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    const changeTypeMutation = useMutation({
        mutationFn: changeBusinessTypeApi,
        onSuccess: (data) => {
            toast.success('Đã thay đổi mô hình kinh doanh!');
            // Force reload để reset toàn bộ app state
            if (data.requireReload) {
                setTimeout(() => window.location.reload(), 1000);
            }
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    return {
        farm: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
        updateFarm: updateMutation.mutate,
        updateFarmAsync: updateMutation.mutateAsync,
        isUpdating: updateMutation.isPending,
        changeBusinessType: changeTypeMutation.mutate,
        isChangingType: changeTypeMutation.isPending,
    };
}
