// src/hooks/use-workers.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { WorkerListParams, WorkerListResponse, Worker, CreateWorkerInput, UpdateWorkerInput } from '@/types/worker';

const workerKeys = {
    all: ['workers'] as const,
    lists: () => [...workerKeys.all, 'list'] as const,
    list: (params: WorkerListParams) => [...workerKeys.lists(), params] as const,
    details: () => [...workerKeys.all, 'detail'] as const,
    detail: (id: string) => [...workerKeys.details(), id] as const,
    active: () => [...workerKeys.all, 'active'] as const,
};

async function fetchWorkers(params: WorkerListParams): Promise<WorkerListResponse> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
    });

    const res = await fetch(`/api/workers?${searchParams}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || 'Lỗi lấy danh sách');
    return json.data;
}

async function fetchWorker(id: string): Promise<Worker> {
    const res = await fetch(`/api/workers/${id}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || 'Không tìm thấy');
    return json.data;
}

async function fetchActiveWorkers() {
    const res = await fetch('/api/workers/active');
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message);
    return json.data;
}

async function createWorkerApi(input: CreateWorkerInput): Promise<Worker> {
    const res = await fetch('/api/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || 'Lỗi tạo nhân viên');
    return json.data;
}

async function updateWorkerApi({ id, ...input }: UpdateWorkerInput & { id: string }): Promise<Worker> {
    const res = await fetch(`/api/workers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || 'Lỗi cập nhật');
    return json.data;
}

async function deleteWorkerApi(id: string): Promise<void> {
    const res = await fetch(`/api/workers/${id}`, { method: 'DELETE' });
    if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Lỗi xóa');
    }
}

export function useWorkers(params: WorkerListParams = {}) {
    return useQuery({
        queryKey: workerKeys.list(params),
        queryFn: () => fetchWorkers(params),
    });
}

export function useWorker(id: string) {
    return useQuery({
        queryKey: workerKeys.detail(id),
        queryFn: () => fetchWorker(id),
        enabled: !!id,
    });
}

export function useActiveWorkers() {
    return useQuery({
        queryKey: workerKeys.active(),
        queryFn: fetchActiveWorkers,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useCreateWorker() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createWorkerApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: workerKeys.lists() });
            queryClient.invalidateQueries({ queryKey: workerKeys.active() });
        },
    });
}

export function useUpdateWorker() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateWorkerApi,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: workerKeys.lists() });
            queryClient.invalidateQueries({ queryKey: workerKeys.detail(data.id) });
            queryClient.invalidateQueries({ queryKey: workerKeys.active() });
        },
    });
}

export function useDeleteWorker() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteWorkerApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: workerKeys.lists() });
            queryClient.invalidateQueries({ queryKey: workerKeys.active() });
        },
    });
}
