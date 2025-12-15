// src/hooks/use-products.ts
// React Query hooks for Products

'use client';

import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
    Product,
    ProductListParams,
    ProductListResponse,
    CreateProductInput,
    UpdateProductInput,
} from '@/types/product';

const BASE_URL = '/api/products';

// ==========================================
// API FUNCTIONS
// ==========================================

async function fetchProducts(params: ProductListParams): Promise<ProductListResponse> {
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
        throw new Error(data.error?.message || 'Không thể tải danh sách sản phẩm');
    }
    return data.data;
}

async function fetchProduct(id: string): Promise<Product> {
    const res = await fetch(`${BASE_URL}/${id}`, {
        credentials: 'include',
    });

    const data = await res.json();
    if (!data.success) {
        throw new Error(data.error?.message || 'Không tìm thấy sản phẩm');
    }
    return data.data;
}

async function createProduct(input: CreateProductInput): Promise<Product> {
    const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
    });

    const data = await res.json();
    if (!data.success) {
        throw new Error(data.error?.message || 'Không thể tạo sản phẩm');
    }
    return data.data;
}

async function updateProduct({
    id,
    ...input
}: UpdateProductInput & { id: string }): Promise<Product> {
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
    });

    const data = await res.json();
    if (!data.success) {
        throw new Error(data.error?.message || 'Không thể cập nhật sản phẩm');
    }
    return data.data;
}

async function deleteProduct(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: 'DELETE',
        credentials: 'include',
    });

    if (!res.ok && res.status !== 204) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Không thể xóa sản phẩm');
    }
}

async function bulkDeleteProducts(ids: string[]): Promise<{ deleted: number }> {
    const res = await fetch(`${BASE_URL}/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids }),
    });

    const data = await res.json();
    if (!data.success) {
        throw new Error(data.error?.message || 'Không thể xóa sản phẩm');
    }
    return data.data;
}

// ==========================================
// HOOKS
// ==========================================

/**
 * Hook danh sách sản phẩm với infinite scroll / load more
 */
export function useProducts(params: Omit<ProductListParams, 'page'> = {}) {
    const queryClient = useQueryClient();

    // Infinite Query cho Load More
    const query = useInfiniteQuery({
        queryKey: ['products', params],
        queryFn: ({ pageParam }) => fetchProducts({ ...params, page: pageParam }),
        getNextPageParam: (lastPage) =>
            lastPage.hasMore ? lastPage.page + 1 : undefined,
        initialPageParam: 1,
        staleTime: 0, // Always refetch fresh data
        gcTime: 0, // Don't cache old data
        refetchOnMount: 'always' as const,
    });

    // Flatten pages thành single array
    const products = query.data?.pages.flatMap((page) => page.items) ?? [];
    const total = query.data?.pages[0]?.total ?? 0;

    // Create Mutation
    const createMutation = useMutation({
        mutationFn: createProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Tạo sản phẩm thành công!');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // Update Mutation
    const updateMutation = useMutation({
        mutationFn: updateProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Cập nhật sản phẩm thành công!');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: deleteProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Xóa sản phẩm thành công!');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // Bulk Delete Mutation
    const bulkDeleteMutation = useMutation({
        mutationFn: bulkDeleteProducts,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success(`Đã xóa ${data.deleted} sản phẩm`);
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    return {
        // Data
        products,
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
        createProduct: createMutation.mutateAsync,
        isCreating: createMutation.isPending,

        // Update
        updateProduct: updateMutation.mutateAsync,
        isUpdating: updateMutation.isPending,

        // Delete
        deleteProduct: deleteMutation.mutateAsync,
        isDeleting: deleteMutation.isPending,

        // Bulk Delete
        bulkDelete: bulkDeleteMutation.mutateAsync,
        isBulkDeleting: bulkDeleteMutation.isPending,
    };
}

/**
 * Hook lấy chi tiết 1 sản phẩm
 */
export function useProduct(id: string | null) {
    return useQuery({
        queryKey: ['product', id],
        queryFn: () => fetchProduct(id!),
        enabled: !!id,
        staleTime: 1000 * 60, // 1 phút
    });
}
