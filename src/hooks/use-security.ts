// src/hooks/use-security.ts
// React Query hooks for Security & Audit features

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
    AuditLog,
    AuditLogListResponse,
    AuditLogListParams,
    PeriodLock,
    PeriodLockStatus,
    LockPeriodInput,
    UserSession,
    SessionListResponse,
} from '@/types/security';

// ==========================================
// QUERY KEYS
// ==========================================

export const securityKeys = {
    all: ['security'] as const,
    auditLogs: (params?: AuditLogListParams) => [...securityKeys.all, 'audit-logs', params] as const,
    auditVerify: () => [...securityKeys.all, 'audit-verify'] as const,
    periodLocks: () => [...securityKeys.all, 'period-locks'] as const,
    periodLockStatus: () => [...securityKeys.all, 'period-lock-status'] as const,
    sessions: () => [...securityKeys.all, 'sessions'] as const,
};

// ==========================================
// AUDIT LOGS
// ==========================================

export function useAuditLogs(params: AuditLogListParams = {}) {
    return useQuery({
        queryKey: securityKeys.auditLogs(params),
        queryFn: async (): Promise<AuditLogListResponse> => {
            const searchParams = new URLSearchParams();
            if (params.page) searchParams.set('page', String(params.page));
            if (params.limit) searchParams.set('limit', String(params.limit));
            if (params.user_id) searchParams.set('user_id', params.user_id);
            if (params.action) searchParams.set('action', params.action);
            if (params.entity_type) searchParams.set('entity_type', params.entity_type);
            if (params.date_from) searchParams.set('date_from', params.date_from);
            if (params.date_to) searchParams.set('date_to', params.date_to);
            if (params.search) searchParams.set('search', params.search);

            const res = await apiClient.get<AuditLogListResponse>(`/audit-logs?${searchParams.toString()}`);
            if (!res.success || !res.data) throw new Error('Failed to fetch audit logs');
            return res.data;
        },
    });
}

export function useVerifyAuditLogs() {
    return useQuery({
        queryKey: securityKeys.auditVerify(),
        queryFn: async () => {
            const res = await apiClient.get<{ is_valid: boolean; issues: Array<{ log_id: string; issue: string }>; checked_count: number }>('/audit-logs/verify');
            if (!res.success || !res.data) throw new Error('Failed to verify');
            return res.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

// ==========================================
// PERIOD LOCKS
// ==========================================

export function usePeriodLocks() {
    return useQuery({
        queryKey: securityKeys.periodLocks(),
        queryFn: async (): Promise<PeriodLock[]> => {
            const res = await apiClient.get<PeriodLock[]>('/period-lock');
            if (!res.success || !res.data) throw new Error('Failed to fetch locks');
            return res.data;
        },
    });
}

export function usePeriodLockStatus() {
    return useQuery({
        queryKey: securityKeys.periodLockStatus(),
        queryFn: async (): Promise<PeriodLockStatus> => {
            const res = await apiClient.get<PeriodLockStatus>('/period-lock/status');
            if (!res.success || !res.data) throw new Error('Failed to fetch status');
            return res.data;
        },
    });
}

export function useLockPeriod() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: LockPeriodInput) => {
            const res = await apiClient.post<PeriodLock>('/period-lock', input);
            if (!res.success) throw new Error((res.error as any)?.message || 'Lock failed');
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: securityKeys.periodLocks() });
            queryClient.invalidateQueries({ queryKey: securityKeys.periodLockStatus() });
        },
    });
}

export function useUnlockPeriod() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ lockId, reason }: { lockId: string; reason: string }) => {
            const res = await apiClient.post<PeriodLock>(`/period-lock/${lockId}/unlock`, { reason });
            if (!res.success) throw new Error((res.error as any)?.message || 'Unlock failed');
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: securityKeys.periodLocks() });
            queryClient.invalidateQueries({ queryKey: securityKeys.periodLockStatus() });
        },
    });
}

// ==========================================
// SESSIONS
// ==========================================

export function useSessions() {
    return useQuery({
        queryKey: securityKeys.sessions(),
        queryFn: async (): Promise<SessionListResponse> => {
            const res = await apiClient.get<SessionListResponse>('/auth/sessions');
            if (!res.success || !res.data) throw new Error('Failed to fetch sessions');
            return res.data;
        },
    });
}

export function useRevokeSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (sessionId: string) => {
            const res = await apiClient.delete(`/auth/sessions/${sessionId}`);
            if (!res.success) throw new Error((res.error as any)?.message || 'Revoke failed');
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: securityKeys.sessions() });
        },
    });
}

export function useRevokeAllSessions() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const res = await apiClient.delete<{ message: string }>('/auth/sessions');
            if (!res.success) throw new Error((res.error as any)?.message || 'Revoke all failed');
            return res.data || { message: 'Đã đăng xuất các phiên khác' };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: securityKeys.sessions() });
        },
    });
}
