// src/hooks/use-transactions.ts
// React Query hooks cho Transaction module

'use client';

import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
    Transaction,
    TransactionListParams,
    TransactionListResponse,
    CreateTransactionInput,
    UpdateTransactionInput,
    AddPaymentInput,
    PeriodSummary,
    DailySummary,
} from '@/types/transaction';

const BASE_URL = '/api/transactions';

// ==========================================
// API FUNCTIONS
// ==========================================

async function fetchTransactions(
    params: TransactionListParams
): Promise<TransactionListResponse> {
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
        throw new Error(data.error?.message || 'Không thể tải danh sách giao dịch');
    }
    return data.data;
}

async function fetchTransaction(id: string): Promise<Transaction> {
    const res = await fetch(`${BASE_URL}/${id}`, {
        credentials: 'include',
    });

    const data = await res.json();
    if (!data.success) {
        throw new Error(data.error?.message || 'Không tìm thấy giao dịch');
    }
    return data.data;
}

async function createTransactionApi(
    input: CreateTransactionInput
): Promise<Transaction> {
    const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
    });

    const data = await res.json();
    if (!data.success) {
        throw new Error(data.error?.message || 'Không thể tạo giao dịch');
    }
    return data.data;
}

async function updateTransactionApi({
    id,
    ...input
}: UpdateTransactionInput & { id: string }): Promise<Transaction> {
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
    });

    const data = await res.json();
    if (!data.success) {
        throw new Error(data.error?.message || 'Không thể cập nhật giao dịch');
    }
    return data.data;
}

async function deleteTransactionApi(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: 'DELETE',
        credentials: 'include',
    });

    if (!res.ok && res.status !== 204) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Không thể xóa giao dịch');
    }
}

async function addPaymentApi({
    id,
    ...input
}: AddPaymentInput & { id: string }): Promise<Transaction> {
    const res = await fetch(`${BASE_URL}/${id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
    });

    const data = await res.json();
    if (!data.success) {
        throw new Error(data.error?.message || 'Không thể thanh toán');
    }
    return data.data;
}

// ==========================================
// HOOKS
// ==========================================

/**
 * Hook danh sách giao dịch với infinite scroll
 */
export function useTransactions(params: Omit<TransactionListParams, 'page'> = {}) {
    const queryClient = useQueryClient();

    const query = useInfiniteQuery({
        queryKey: ['transactions', params],
        queryFn: ({ pageParam }) => fetchTransactions({ ...params, page: pageParam }),
        getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
        initialPageParam: 1,
        staleTime: 1000 * 60, // 1 phút
    });

    // Invalidate tất cả queries liên quan sau khi mutation
    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['transaction'] });
        queryClient.invalidateQueries({ queryKey: ['transaction-summary'] });
        queryClient.invalidateQueries({ queryKey: ['transaction-daily'] });
        queryClient.invalidateQueries({ queryKey: ['products'] }); // Tồn kho thay đổi
        queryClient.invalidateQueries({ queryKey: ['partners'] }); // Công nợ thay đổi
    };

    // Create Mutation
    const createMutation = useMutation({
        mutationFn: createTransactionApi,
        onSuccess: () => {
            invalidateAll();
            toast.success('Tạo giao dịch thành công!');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // Update Mutation
    const updateMutation = useMutation({
        mutationFn: updateTransactionApi,
        onSuccess: () => {
            invalidateAll();
            toast.success('Cập nhật giao dịch thành công!');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: deleteTransactionApi,
        onSuccess: () => {
            invalidateAll();
            toast.success('Xóa giao dịch thành công!');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // Add Payment Mutation
    const paymentMutation = useMutation({
        mutationFn: addPaymentApi,
        onSuccess: () => {
            invalidateAll();
            toast.success('Thanh toán thành công!');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // Flatten pages
    const transactions = query.data?.pages.flatMap((page) => page.items) ?? [];
    const total = query.data?.pages[0]?.total ?? 0;
    const summary = query.data?.pages[0]?.summary ?? {
        total_income: 0,
        total_expense: 0,
        net: 0,
    };

    return {
        // Data
        transactions,
        total,
        summary,

        // Query state
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        isFetchingNextPage: query.isFetchingNextPage,
        hasNextPage: query.hasNextPage,
        fetchNextPage: query.fetchNextPage,
        refetch: query.refetch,

        // Create
        createTransaction: createMutation.mutateAsync,
        isCreating: createMutation.isPending,

        // Update
        updateTransaction: updateMutation.mutateAsync,
        isUpdating: updateMutation.isPending,

        // Delete
        deleteTransaction: deleteMutation.mutateAsync,
        isDeleting: deleteMutation.isPending,

        // Payment
        addPayment: paymentMutation.mutateAsync,
        isAddingPayment: paymentMutation.isPending,
    };
}

/**
 * Hook lấy chi tiết 1 giao dịch
 */
export function useTransaction(id: string | null) {
    return useQuery({
        queryKey: ['transaction', id],
        queryFn: () => fetchTransaction(id!),
        enabled: !!id,
        staleTime: 1000 * 60, // 1 phút
    });
}

/**
 * Hook lấy summary theo period
 */
export function useTransactionSummary(params?: {
    start_date?: string;
    end_date?: string;
}) {
    return useQuery({
        queryKey: ['transaction-summary', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params?.start_date) searchParams.set('start_date', params.start_date);
            if (params?.end_date) searchParams.set('end_date', params.end_date);

            const res = await fetch(`${BASE_URL}/summary?${searchParams}`, {
                credentials: 'include',
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error?.message);
            return data.data as PeriodSummary;
        },
        staleTime: 1000 * 60, // 1 phút
    });
}

/**
 * Hook lấy daily summary cho chart
 */
export function useTransactionDaily(params?: {
    start_date?: string;
    end_date?: string;
}) {
    return useQuery({
        queryKey: ['transaction-daily', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params?.start_date) searchParams.set('start_date', params.start_date);
            if (params?.end_date) searchParams.set('end_date', params.end_date);

            const res = await fetch(`${BASE_URL}/daily?${searchParams}`, {
                credentials: 'include',
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error?.message);
            return data.data as { period: unknown; daily: DailySummary[]; totals: unknown };
        },
        staleTime: 1000 * 60 * 5, // 5 phút
    });
}

/**
 * Hook mutations riêng (cho trường hợp không cần list)
 */
export function useTransactionMutations() {
    const queryClient = useQueryClient();

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['transaction'] });
        queryClient.invalidateQueries({ queryKey: ['transaction-summary'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['partners'] });
    };

    const createMutation = useMutation({
        mutationFn: createTransactionApi,
        onSuccess: () => {
            invalidateAll();
            toast.success('Tạo giao dịch thành công!');
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const updateMutation = useMutation({
        mutationFn: updateTransactionApi,
        onSuccess: () => {
            invalidateAll();
            toast.success('Cập nhật thành công!');
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteTransactionApi,
        onSuccess: () => {
            invalidateAll();
            toast.success('Xóa thành công!');
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const paymentMutation = useMutation({
        mutationFn: addPaymentApi,
        onSuccess: () => {
            invalidateAll();
            toast.success('Thanh toán thành công!');
        },
        onError: (error: Error) => toast.error(error.message),
    });

    return {
        createTransaction: createMutation.mutateAsync,
        isCreating: createMutation.isPending,
        updateTransaction: updateMutation.mutateAsync,
        isUpdating: updateMutation.isPending,
        deleteTransaction: deleteMutation.mutateAsync,
        isDeleting: deleteMutation.isPending,
        addPayment: paymentMutation.mutateAsync,
        isAddingPayment: paymentMutation.isPending,
    };
}
