// src/components/tax/vat-warning-badge.tsx
// VAT Warning Badge - Shows VAT deduction status on invoice

'use client';

import { useQuery } from '@tanstack/react-query';
import { VATValidationResult } from '@/types/vat-validation';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface VATWarningBadgeProps {
    invoiceData: {
        invoice_number?: string;
        invoice_date: string;
        supplier_tax_code?: string;
        supplier_name?: string;
        total_amount: number;
        vat_amount: number;
        payment_method: string;
        usage_purpose?: string;
        is_vehicle?: boolean;
        vehicle_type?: string;
        vehicle_seats?: number;
    };
    showDetails?: boolean;
}

export function VATWarningBadge({ invoiceData, showDetails = true }: VATWarningBadgeProps) {
    const { data, isLoading, error } = useQuery({
        queryKey: ['vat-validation', invoiceData],
        queryFn: async () => {
            const goodsValue = invoiceData.total_amount - invoiceData.vat_amount;
            const vatRate = invoiceData.vat_amount > 0
                ? (invoiceData.vat_amount / goodsValue) * 100
                : 0;

            const res = await fetch('/api/tax/vat/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...invoiceData,
                    goods_value: goodsValue,
                    vat_rate: vatRate,
                    skip_mst_lookup: true, // Skip for real-time preview
                }),
            });

            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json.data as VATValidationResult;
        },
        enabled: invoiceData.total_amount > 0,
        staleTime: 30000, // Cache for 30s
    });

    if (isLoading) {
        return (
            <Badge variant="outline" className="text-muted-foreground">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Đang kiểm tra...
            </Badge>
        );
    }

    if (error || !data) {
        return null;
    }

    // Fully deductible, no warnings
    if (data.is_deductible && !data.is_partial && data.warnings.length === 0) {
        if (!showDetails) return null;
        return (
            <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30">
                <CheckCircle className="w-3 h-3 mr-1" />
                Được khấu trừ
            </Badge>
        );
    }

    // Partial deduction
    if (data.is_partial) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 cursor-help">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Khấu trừ {Math.round((data.deduction_ratio || 0) * 100)}%
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                        <div className="text-sm space-y-1">
                            <p className="font-medium">⚠️ Khấu trừ một phần</p>
                            <p>Được khấu trừ: {data.deductible_amount.toLocaleString('vi-VN')}đ</p>
                            <p>Không khấu trừ: {data.non_deductible_amount.toLocaleString('vi-VN')}đ</p>
                            {data.warnings.map((w, i) => (
                                <p key={i} className="text-amber-600">{w.message}</p>
                            ))}
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    // Deductible with warnings
    if (data.is_deductible && data.warnings.length > 0) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 cursor-help">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {data.warnings.length} cảnh báo
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                        <ul className="text-sm space-y-1">
                            {data.warnings.map((w, i) => (
                                <li key={i} className="text-yellow-600">⚠️ {w.message}</li>
                            ))}
                        </ul>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    // Not deductible
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Badge variant="destructive" className="cursor-help">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Không khấu trừ
                    </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                    <div className="text-sm space-y-1">
                        <p className="font-medium text-red-600">❌ Không được khấu trừ VAT</p>
                        {data.errors.map((e, i) => (
                            <div key={i}>
                                <p className="text-red-500">{e.message}</p>
                                {e.fix_suggestion && (
                                    <p className="text-muted-foreground text-xs">💡 {e.fix_suggestion}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
