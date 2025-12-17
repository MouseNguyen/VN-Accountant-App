// src/hooks/use-financial-reports.ts
// React Query hooks for Financial Reports - Phase 4 Tasks 7-8-9

import { useQuery } from '@tanstack/react-query';
import type {
    CashFlowForecast,
    FinancialKPIs,
    RevenueTrend,
    ARAgingPieData,
    TopCustomer,
} from '@/services/financial-reports.service';

// ==========================================
// FETCH FUNCTIONS
// ==========================================

async function fetchCashForecast(days: number = 30): Promise<CashFlowForecast> {
    const res = await fetch(`/api/reports/cash-forecast?days=${days}`);
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || 'Failed to fetch forecast');
    }
    const json = await res.json();
    return json.data;
}

async function fetchFinancialKPIs(): Promise<FinancialKPIs> {
    const res = await fetch('/api/reports/financial-kpis');
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || 'Failed to fetch KPIs');
    }
    const json = await res.json();
    return json.data;
}

interface ChartData {
    revenue_trend?: RevenueTrend[];
    ar_aging_pie?: ARAgingPieData[];
    top_customers?: TopCustomer[];
}

async function fetchChartData(type: string = 'all'): Promise<ChartData> {
    const res = await fetch(`/api/reports/charts?type=${type}`);
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || 'Failed to fetch charts');
    }
    const json = await res.json();
    return json.data;
}

// ==========================================
// HOOKS
// ==========================================

export function useCashForecast(days: number = 30) {
    return useQuery({
        queryKey: ['cash-forecast', days],
        queryFn: () => fetchCashForecast(days),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useFinancialKPIs() {
    return useQuery({
        queryKey: ['financial-kpis'],
        queryFn: fetchFinancialKPIs,
        staleTime: 5 * 60 * 1000,
    });
}

export function useChartData(type: string = 'all') {
    return useQuery({
        queryKey: ['chart-data', type],
        queryFn: () => fetchChartData(type),
        staleTime: 5 * 60 * 1000,
    });
}

export function useRevenueTrend() {
    return useQuery({
        queryKey: ['revenue-trend'],
        queryFn: async () => {
            const data = await fetchChartData('revenue_trend');
            return data.revenue_trend || [];
        },
        staleTime: 5 * 60 * 1000,
    });
}

export function useARAgingPie() {
    return useQuery({
        queryKey: ['ar-aging-pie'],
        queryFn: async () => {
            const data = await fetchChartData('ar_aging_pie');
            return data.ar_aging_pie || [];
        },
        staleTime: 5 * 60 * 1000,
    });
}

export function useTopCustomers(limit: number = 10) {
    return useQuery({
        queryKey: ['top-customers', limit],
        queryFn: async () => {
            const res = await fetch(`/api/reports/charts?type=top_customers&limit=${limit}`);
            if (!res.ok) throw new Error('Failed to fetch top customers');
            const json = await res.json();
            return json.data.top_customers || [];
        },
        staleTime: 5 * 60 * 1000,
    });
}
