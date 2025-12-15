// src/hooks/use-dashboard.ts

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { DashboardData, QuickAction } from '@/types/dashboard';

interface DashboardApiResponse {
    data: DashboardData;
    quick_actions: QuickAction[];
    last_updated: string;
}

export function useDashboard(chartPeriod: 'week' | 'month' = 'week') {
    return useQuery({
        queryKey: ['dashboard', chartPeriod],
        queryFn: async (): Promise<DashboardApiResponse> => {
            const res = await apiClient.get<DashboardApiResponse>('/dashboard', {
                chart_period: chartPeriod,
            });
            if (!res.success || !res.data) {
                throw new Error('Không thể tải dashboard');
            }
            // res.data is DashboardApiResponse which contains { data: DashboardData, quick_actions, last_updated }
            return res.data;
        },
        staleTime: 60 * 1000, // 1 phút
        refetchInterval: 5 * 60 * 1000, // Auto refresh mỗi 5 phút
    });
}

export function useDashboardRefresh() {
    const queryClient = useQueryClient();

    return {
        refresh: async () => {
            await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            return queryClient.refetchQueries({ queryKey: ['dashboard'] });
        },
    };
}
