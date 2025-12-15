// src/hooks/use-inventory.ts
// React Query hooks cho Inventory Management

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import {
    Stock,
    StockMovement,
    StockListParams,
    StockListResponse,
    StockMovementListParams,
    StockMovementListResponse,
    StockInInput,
    StockOutInput,
    StockAdjustInput,
} from '@/types/inventory';
import { toast } from 'sonner';

// ==========================================
// API FUNCTIONS
// ==========================================

async function fetchStocks(params: StockListParams): Promise<StockListResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.search) searchParams.set('search', params.search);
    if (params.category) searchParams.set('category', params.category);
    if (params.location_code) searchParams.set('location_code', params.location_code);
    if (params.low_stock) searchParams.set('low_stock', 'true');
    if (params.out_of_stock) searchParams.set('out_of_stock', 'true');
    if (params.sort_by) searchParams.set('sort_by', params.sort_by);
    if (params.sort_order) searchParams.set('sort_order', params.sort_order);

    const res = await fetch(`/api/stocks?${searchParams.toString()}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Lỗi tải danh sách tồn kho');
    return data.data;
}

async function fetchStockMovements(params: StockMovementListParams): Promise<StockMovementListResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.product_id) searchParams.set('product_id', params.product_id);
    if (params.type) searchParams.set('type', params.type);
    if (params.partner_id) searchParams.set('partner_id', params.partner_id);
    if (params.date_from) searchParams.set('date_from', params.date_from);
    if (params.date_to) searchParams.set('date_to', params.date_to);
    if (params.sort_by) searchParams.set('sort_by', params.sort_by);
    if (params.sort_order) searchParams.set('sort_order', params.sort_order);

    const res = await fetch(`/api/stock-movements?${searchParams.toString()}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Lỗi tải lịch sử kho');
    return data.data;
}

async function stockInApi(input: StockInInput): Promise<StockMovement> {
    const res = await fetch('/api/stock-movements/in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Lỗi nhập kho');
    return data.data;
}

async function stockOutApi(input: StockOutInput): Promise<StockMovement> {
    const res = await fetch('/api/stock-movements/out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Lỗi xuất kho');
    return data.data;
}

async function stockAdjustApi(input: StockAdjustInput): Promise<StockMovement> {
    const res = await fetch('/api/stock-movements/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Lỗi điều chỉnh');
    return data.data;
}

// ==========================================
// QUERY HOOKS
// ==========================================

/**
 * Hook để lấy danh sách tồn kho
 */
export function useStocks(params: StockListParams = {}) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['stocks', params],
        queryFn: () => fetchStocks(params),
        enabled: !!user,
        staleTime: 30 * 1000, // 30 seconds
    });
}

/**
 * Hook để lấy lịch sử nhập/xuất kho
 */
export function useStockMovements(params: StockMovementListParams = {}) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['stock-movements', params],
        queryFn: () => fetchStockMovements(params),
        enabled: !!user,
        staleTime: 30 * 1000,
    });
}

// ==========================================
// MUTATION HOOKS
// ==========================================

/**
 * Hook để nhập kho
 */
export function useStockIn() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: stockInApi,
        onSuccess: (data) => {
            toast.success('Nhập kho thành công!', {
                description: `Mã phiếu: ${data.code}`,
            });
            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: ['stocks'] });
            queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
        onError: (error: Error) => {
            toast.error('Lỗi nhập kho', {
                description: error.message,
            });
        },
    });
}

/**
 * Hook để xuất kho
 */
export function useStockOut() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: stockOutApi,
        onSuccess: (data) => {
            toast.success('Xuất kho thành công!', {
                description: `Mã phiếu: ${data.code}`,
            });
            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: ['stocks'] });
            queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
        onError: (error: Error) => {
            toast.error('Lỗi xuất kho', {
                description: error.message,
            });
        },
    });
}

/**
 * Hook để điều chỉnh tồn kho
 */
export function useStockAdjust() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: stockAdjustApi,
        onSuccess: (data) => {
            toast.success('Điều chỉnh thành công!', {
                description: `Mã phiếu: ${data.code}`,
            });
            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: ['stocks'] });
            queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
        onError: (error: Error) => {
            toast.error('Lỗi điều chỉnh', {
                description: error.message,
            });
        },
    });
}

// ==========================================
// STOCK COUNT HOOKS (KIỂM KÊ)
// ==========================================

import {
    StockCount,
    CreateStockCountInput,
    UpdateStockCountItemInput,
} from '@/types/inventory';

async function fetchStockCounts(params: { page?: number; limit?: number; status?: string }) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.status) searchParams.set('status', params.status);

    const res = await fetch(`/api/stock-counts?${searchParams.toString()}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Lỗi tải danh sách kiểm kê');
    return data.data;
}

async function fetchStockCountById(id: string): Promise<StockCount> {
    const res = await fetch(`/api/stock-counts/${id}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Lỗi tải phiếu kiểm kê');
    return data.data;
}

async function createStockCountApi(input: CreateStockCountInput): Promise<StockCount> {
    const res = await fetch('/api/stock-counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Lỗi tạo phiếu kiểm kê');
    return data.data;
}

async function updateStockCountItemApi(input: UpdateStockCountItemInput) {
    const res = await fetch('/api/stock-count-items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Lỗi cập nhật');
    return data.data;
}

async function completeStockCountApi(id: string, autoAdjust: boolean): Promise<StockCount> {
    const res = await fetch(`/api/stock-counts/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_adjust: autoAdjust }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Lỗi hoàn thành kiểm kê');
    return data.data;
}

async function cancelStockCountApi(id: string): Promise<void> {
    const res = await fetch(`/api/stock-counts/${id}`, {
        method: 'DELETE',
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Lỗi hủy phiếu kiểm kê');
}

/**
 * Hook để lấy danh sách phiếu kiểm kê
 */
export function useStockCounts(params: { page?: number; limit?: number; status?: string } = {}) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['stock-counts', params],
        queryFn: () => fetchStockCounts(params),
        enabled: !!user,
        staleTime: 30 * 1000,
    });
}

/**
 * Hook để lấy chi tiết phiếu kiểm kê
 */
export function useStockCount(id: string | null) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['stock-count', id],
        queryFn: () => fetchStockCountById(id!),
        enabled: !!user && !!id,
        staleTime: 10 * 1000,
    });
}

/**
 * Hook để tạo phiếu kiểm kê
 */
export function useCreateStockCount() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createStockCountApi,
        onSuccess: (data) => {
            toast.success('Tạo phiếu kiểm kê thành công!', {
                description: `Mã: ${data.code}`,
            });
            queryClient.invalidateQueries({ queryKey: ['stock-counts'] });
        },
        onError: (error: Error) => {
            toast.error('Lỗi tạo phiếu kiểm kê', {
                description: error.message,
            });
        },
    });
}

/**
 * Hook để cập nhật số lượng thực tế
 */
export function useUpdateStockCountItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateStockCountItemApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock-count'] });
        },
        onError: (error: Error) => {
            toast.error('Lỗi cập nhật', {
                description: error.message,
            });
        },
    });
}

/**
 * Hook để hoàn thành kiểm kê
 */
export function useCompleteStockCount() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, autoAdjust }: { id: string; autoAdjust: boolean }) =>
            completeStockCountApi(id, autoAdjust),
        onSuccess: (data) => {
            toast.success('Hoàn thành kiểm kê!', {
                description: `Phiếu ${data.code} đã được xử lý`,
            });
            queryClient.invalidateQueries({ queryKey: ['stock-counts'] });
            queryClient.invalidateQueries({ queryKey: ['stock-count'] });
            queryClient.invalidateQueries({ queryKey: ['stocks'] });
            queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
        },
        onError: (error: Error) => {
            toast.error('Lỗi hoàn thành kiểm kê', {
                description: error.message,
            });
        },
    });
}

/**
 * Hook để hủy phiếu kiểm kê
 */
export function useCancelStockCount() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: cancelStockCountApi,
        onSuccess: () => {
            toast.success('Đã hủy phiếu kiểm kê');
            queryClient.invalidateQueries({ queryKey: ['stock-counts'] });
        },
        onError: (error: Error) => {
            toast.error('Lỗi hủy phiếu', {
                description: error.message,
            });
        },
    });
}

