// src/hooks/use-tax-report.ts

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { TaxReportData, ConfirmTaxPaymentInput, ConfirmTaxPaymentResponse } from '@/types/tax-report';
import { toast } from 'sonner';

export function useTaxReport(quarter: number, year: number) {
    return useQuery({
        queryKey: ['tax-report', quarter, year],
        queryFn: async () => {
            const res = await apiClient.get<TaxReportData>('/reports/tax-summary', {
                quarter: String(quarter),
                year: String(year),
            });
            if (!res.success || !res.data) {
                throw new Error('Không thể tải báo cáo thuế');
            }
            return res.data;
        },
        enabled: !!quarter && !!year,
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 2,
    });
}

export function useConfirmTaxPayment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: ConfirmTaxPaymentInput) => {
            const res = await apiClient.post<ConfirmTaxPaymentResponse>(
                '/reports/tax-summary/confirm',
                input
            );
            if (!res.success) {
                throw new Error(res.error?.message || 'Lỗi xác nhận');
            }
            return res.data!;
        },
        onSuccess: (_data, variables) => {
            toast.success(`Đã xác nhận nộp ${variables.tax_type} Quý ${variables.quarter}/${variables.year}`);
            // Invalidate tax report cache
            queryClient.invalidateQueries({ queryKey: ['tax-report', variables.quarter, variables.year] });
            // Invalidate dashboard (vì có expense mới)
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            // Invalidate transactions list
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Lỗi xác nhận nộp thuế');
        },
    });
}
