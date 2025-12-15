// src/hooks/use-attendances.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
    AttendanceListParams,
    AttendanceListResponse,
    Attendance,
    CreateAttendanceInput,
    BulkAttendanceInput
} from '@/types/attendance';

const attendanceKeys = {
    all: ['attendances'] as const,
    lists: () => [...attendanceKeys.all, 'list'] as const,
    list: (params: AttendanceListParams) => [...attendanceKeys.lists(), params] as const,
};

async function fetchAttendances(params: AttendanceListParams): Promise<AttendanceListResponse> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
    });

    const res = await fetch(`/api/attendances?${searchParams}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || 'Lỗi lấy danh sách');
    return json.data;
}

async function createAttendanceApi(input: CreateAttendanceInput): Promise<Attendance> {
    const res = await fetch('/api/attendances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || 'Lỗi chấm công');
    return json.data;
}

async function updateAttendanceApi({ id, ...input }: Partial<CreateAttendanceInput> & { id: string }): Promise<Attendance> {
    const res = await fetch(`/api/attendances/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || 'Lỗi cập nhật');
    return json.data;
}

async function deleteAttendanceApi(id: string): Promise<void> {
    const res = await fetch(`/api/attendances/${id}`, { method: 'DELETE' });
    if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Lỗi xóa');
    }
}

async function bulkCreateAttendanceApi(input: BulkAttendanceInput) {
    const res = await fetch('/api/attendances/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || 'Lỗi chấm công');
    return json.data;
}

export function useAttendances(params: AttendanceListParams = {}) {
    return useQuery({
        queryKey: attendanceKeys.list(params),
        queryFn: () => fetchAttendances(params),
    });
}

export function useCreateAttendance() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createAttendanceApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() });
        },
    });
}

export function useUpdateAttendance() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateAttendanceApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() });
        },
    });
}

export function useDeleteAttendance() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteAttendanceApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() });
        },
    });
}

export function useBulkCreateAttendance() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: bulkCreateAttendanceApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() });
        },
    });
}
