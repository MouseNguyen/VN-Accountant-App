// src/hooks/use-payrolls.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
    PayrollListParams,
    PayrollListResponse,
    Payroll,
    CreatePayrollInput,
    UpdatePayrollItemInput,
    PayrollPaymentInput
} from '@/types/payroll';

const payrollKeys = {
    all: ['payrolls'] as const,
    lists: () => [...payrollKeys.all, 'list'] as const,
    list: (params: PayrollListParams) => [...payrollKeys.lists(), params] as const,
    details: () => [...payrollKeys.all, 'detail'] as const,
    detail: (id: string) => [...payrollKeys.details(), id] as const,
};

async function fetchPayrolls(params: PayrollListParams): Promise<PayrollListResponse> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
    });

    const res = await fetch(`/api/payrolls?${searchParams}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || 'Lỗi lấy danh sách');
    return json.data;
}

async function fetchPayroll(id: string): Promise<Payroll> {
    const res = await fetch(`/api/payrolls/${id}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || 'Không tìm thấy');
    return json.data;
}

async function createPayrollApi(input: CreatePayrollInput): Promise<Payroll> {
    const res = await fetch('/api/payrolls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || 'Lỗi tạo bảng lương');
    return json.data;
}

async function confirmPayrollApi(id: string): Promise<Payroll> {
    const res = await fetch(`/api/payrolls/${id}/confirm`, { method: 'POST' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || 'Lỗi xác nhận');
    return json.data;
}

async function payPayrollApi({ id, ...input }: PayrollPaymentInput & { id: string }): Promise<Payroll> {
    const res = await fetch(`/api/payrolls/${id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || 'Lỗi chi trả');
    return json.data;
}

async function deletePayrollApi(id: string): Promise<void> {
    const res = await fetch(`/api/payrolls/${id}`, { method: 'DELETE' });
    if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Lỗi xóa');
    }
}

async function updatePayrollItemApi({ itemId, ...input }: UpdatePayrollItemInput & { itemId: string }): Promise<Payroll> {
    const res = await fetch(`/api/payrolls/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || 'Lỗi cập nhật');
    return json.data;
}

export function usePayrolls(params: PayrollListParams = {}) {
    return useQuery({
        queryKey: payrollKeys.list(params),
        queryFn: () => fetchPayrolls(params),
    });
}

export function usePayroll(id: string) {
    return useQuery({
        queryKey: payrollKeys.detail(id),
        queryFn: () => fetchPayroll(id),
        enabled: !!id,
    });
}

export function useCreatePayroll() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createPayrollApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: payrollKeys.lists() });
        },
    });
}

export function useConfirmPayroll() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: confirmPayrollApi,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: payrollKeys.lists() });
            queryClient.invalidateQueries({ queryKey: payrollKeys.detail(data.id) });
        },
    });
}

export function usePayPayroll() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: payPayrollApi,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: payrollKeys.lists() });
            queryClient.invalidateQueries({ queryKey: payrollKeys.detail(data.id) });
        },
    });
}

export function useDeletePayroll() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deletePayrollApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: payrollKeys.lists() });
        },
    });
}

export function useUpdatePayrollItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updatePayrollItemApi,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: payrollKeys.lists() });
            queryClient.invalidateQueries({ queryKey: payrollKeys.detail(data.id) });
        },
    });
}
