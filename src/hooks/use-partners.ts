// src/hooks/use-partners.ts
// React Query hooks for Partners

'use client';

import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
    Partner,
    PartnerListParams,
    PartnerListResponse,
    CreatePartnerInput,
    UpdatePartnerInput,
} from '@/types/partner';

const BASE_URL = '/api/partners';

// ==========================================
// API FUNCTIONS
// ==========================================

async function fetchPartners(params: PartnerListParams): Promise<PartnerListResponse> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
            searchParams.set(key, String(value));
        }
    });

    const res = await fetch(`${BASE_URL}?${searchParams}`, {
        credentials: 'include',
    });

    const data = await res.json();
    if (!data.success) {
        throw new Error(data.error?.message || 'Không thể tải danh sách đối tác');
    }
    return data.data;
}

async function fetchPartner(id: string): Promise<Partner> {
    const res = await fetch(`${BASE_URL}/${id}`, {
        credentials: 'include',
    });

    const data = await res.json();
    if (!data.success) {
        throw new Error(data.error?.message || 'Không tìm thấy đối tác');
    }
    return data.data;
}

async function createPartner(input: CreatePartnerInput): Promise<Partner> {
    const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
    });

    const data = await res.json();
    if (!data.success) {
        throw new Error(data.error?.message || 'Không thể tạo đối tác');
    }
    return data.data;
}

async function updatePartner({
    id,
    ...input
}: UpdatePartnerInput & { id: string }): Promise<Partner> {
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
    });

    const data = await res.json();
    if (!data.success) {
        throw new Error(data.error?.message || 'Không thể cập nhật đối tác');
    }
    return data.data;
}

async function deletePartner(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: 'DELETE',
        credentials: 'include',
    });

    if (!res.ok && res.status !== 204) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Không thể xóa đối tác');
    }
}

async function bulkDeletePartners(ids: string[]): Promise<{ deleted: number }> {
    const res = await fetch(`${BASE_URL}/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids }),
    });

    const data = await res.json();
    if (!data.success) {
        throw new Error(data.error?.message || 'Không thể xóa đối tác');
    }
    return data.data;
}

// ==========================================
// HOOKS
// ==========================================

/**
 * Hook danh sách đối tác với infinite scroll / load more
 */
export function usePartners(params: Omit<PartnerListParams, 'page'> = {}) {
    const queryClient = useQueryClient();

    // Infinite Query cho Load More
    const query = useInfiniteQuery({
        queryKey: ['partners', params],
        queryFn: ({ pageParam }) => fetchPartners({ ...params, page: pageParam }),
        getNextPageParam: (lastPage) =>
            lastPage.hasMore ? lastPage.page + 1 : undefined,
        initialPageParam: 1,
        staleTime: 1000 * 60, // 1 phút
    });

    // Flatten pages thành single array
    const partners = query.data?.pages.flatMap((page) => page.items) ?? [];
    const total = query.data?.pages[0]?.total ?? 0;

    // Create Mutation
    const createMutation = useMutation({
        mutationFn: createPartner,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['partners'] });
            toast.success('Tạo đối tác thành công!');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // Update Mutation
    const updateMutation = useMutation({
        mutationFn: updatePartner,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['partners'] });
            toast.success('Cập nhật đối tác thành công!');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: deletePartner,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['partners'] });
            toast.success('Xóa đối tác thành công!');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // Bulk Delete Mutation
    const bulkDeleteMutation = useMutation({
        mutationFn: bulkDeletePartners,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['partners'] });
            toast.success(`Đã xóa ${data.deleted} đối tác`);
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    return {
        // Data
        partners,
        total,

        // Query state
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        isFetchingNextPage: query.isFetchingNextPage,
        hasNextPage: query.hasNextPage,
        fetchNextPage: query.fetchNextPage,
        refetch: query.refetch,

        // Create
        createPartner: createMutation.mutateAsync,
        isCreating: createMutation.isPending,

        // Update
        updatePartner: updateMutation.mutateAsync,
        isUpdating: updateMutation.isPending,

        // Delete
        deletePartner: deleteMutation.mutateAsync,
        isDeleting: deleteMutation.isPending,

        // Bulk Delete
        bulkDelete: bulkDeleteMutation.mutateAsync,
        isBulkDeleting: bulkDeleteMutation.isPending,
    };
}

/**
 * Hook lấy chi tiết 1 đối tác
 */
export function usePartner(id: string | null) {
    return useQuery({
        queryKey: ['partner', id],
        queryFn: () => fetchPartner(id!),
        enabled: !!id,
        staleTime: 1000 * 60, // 1 phút
    });
}
