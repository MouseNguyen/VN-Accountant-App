// src/app/(dashboard)/thue/tndn/page.tsx
// CIT (Thuế TNDN) Calculation Page - Task 6

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { CITCalculationResult } from '@/types/cit';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Calculator,
    Download,
    AlertTriangle,
    Loader2,
    TrendingUp,
    TrendingDown,
    FileText,
    RefreshCw,
    CheckCircle2,
    Info
} from 'lucide-react';
import { toast } from 'sonner';

// ==========================================
// FORMAT HELPERS
// ==========================================

function formatMoney(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
}

function getCurrentQuarter(): string {
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    return `${now.getFullYear()}-Q${q}`;
}

function generatePeriodOptions(type: 'QUARTERLY' | 'ANNUAL') {
    const opts: { value: string; label: string }[] = [];
    const now = new Date();
    const year = now.getFullYear();

    if (type === 'QUARTERLY') {
        for (let y = year; y >= year - 1; y--) {
            for (let q = 4; q >= 1; q--) {
                opts.push({ value: `${y}-Q${q}`, label: `Quý ${q}/${y}` });
            }
        }
    } else {
        for (let y = year; y >= year - 2; y--) {
            opts.push({ value: `${y}`, label: `Năm ${y}` });
        }
    }
    return opts;
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function CITCalculationPage() {
    const queryClient = useQueryClient();
    const [periodType, setPeriodType] = useState<'QUARTERLY' | 'ANNUAL'>('QUARTERLY');
    const [period, setPeriod] = useState(getCurrentQuarter());

    // Fetch CIT calculation
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['cit-calculation', period],
        queryFn: async () => {
            const res = await apiClient.get<{ success: boolean; data: CITCalculationResult }>(`/tax/cit/${period}`);
            if (!res.data?.data) return null;
            return res.data.data;
        },
        enabled: !!period,
        retry: false,
    });

    // Calculate mutation
    const calculateMutation = useMutation({
        mutationFn: async () => {
            const res = await apiClient.post('/tax/cit/calculate', { period, period_type: periodType });
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cit-calculation', period] });
            toast.success('Đã tính thuế TNDN thành công!');
        },
        onError: (err: Error & { response?: { data?: { error?: string } } }) => {
            toast.error(err.response?.data?.error || err.message || 'Lỗi tính thuế');
        },
    });

    // Download XML
    const handleDownloadXML = () => {
        window.open(`/api/tax/cit/${period}/xml`, '_blank');
        toast.success('Đang tải file XML...');
    };

    // Handle period type change
    const handlePeriodTypeChange = (value: 'QUARTERLY' | 'ANNUAL') => {
        setPeriodType(value);
        // Set default period for new type
        if (value === 'QUARTERLY') {
            setPeriod(getCurrentQuarter());
        } else {
            setPeriod(new Date().getFullYear().toString());
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        💰 Thuế TNDN (CIT)
                    </h1>
                    <p className="text-muted-foreground">
                        Tính thuế thu nhập doanh nghiệp theo quý hoặc năm
                    </p>
                </div>
                <Badge variant="outline" className="text-sm">
                    Mẫu 03/TNDN
                </Badge>
            </div>

            {/* Period Selection Card */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex-1 min-w-[120px]">
                            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                                Loại kỳ
                            </label>
                            <Select value={periodType} onValueChange={handlePeriodTypeChange}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="QUARTERLY">Quý (Tạm tính)</SelectItem>
                                    <SelectItem value="ANNUAL">Năm (Quyết toán)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex-1 min-w-[150px]">
                            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                                Kỳ tính thuế
                            </label>
                            <Select value={period} onValueChange={setPeriod}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {generatePeriodOptions(periodType).map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex gap-2 pt-5">
                            <Button
                                onClick={() => calculateMutation.mutate()}
                                disabled={calculateMutation.isPending}
                            >
                                {calculateMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <Calculator className="w-4 h-4 mr-2" />
                                )}
                                Tính thuế
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => refetch()}>
                                <RefreshCw className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Loading State */}
            {isLoading && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-24" />
                        <Skeleton className="h-24" />
                    </div>
                    <Skeleton className="h-64" />
                </div>
            )}

            {/* No Data State */}
            {!isLoading && !data && (
                <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Chưa có dữ liệu</h3>
                        <p className="text-muted-foreground mb-4">
                            Chưa có tờ khai thuế TNDN cho kỳ {period}
                        </p>
                        <Button onClick={() => calculateMutation.mutate()}>
                            <Calculator className="w-4 h-4 mr-2" />
                            Tính thuế ngay
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Result Display */}
            {data && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-muted-foreground">Lợi nhuận kế toán</div>
                                        <div className={`text-2xl font-bold ${data.accounting_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatMoney(data.accounting_profit)}
                                        </div>
                                    </div>
                                    {data.accounting_profit >= 0 ? (
                                        <TrendingUp className="w-8 h-8 text-green-500" />
                                    ) : (
                                        <TrendingDown className="w-8 h-8 text-red-500" />
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-red-50 dark:bg-red-950/20 border-red-200">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-muted-foreground">Thuế TNDN phải nộp</div>
                                        <div className="text-2xl font-bold text-red-600">
                                            {formatMoney(data.cit_amount)}
                                        </div>
                                    </div>
                                    <Badge variant="destructive" className="text-lg px-3 py-1">
                                        {data.tax_rate}%
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Detailed Breakdown */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Chi tiết tính thuế TNDN
                            </CardTitle>
                            <CardDescription>
                                Kỳ: {period} | Trạng thái:
                                <Badge variant="outline" className="ml-2">
                                    {data.status === 'CALCULATED' ? 'Đã tính' : data.status}
                                </Badge>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            {/* Revenue Section */}
                            <div className="flex justify-between py-3 border-b">
                                <span className="font-medium">I. Doanh thu bán hàng</span>
                                <span className="font-medium text-green-600">
                                    {formatMoney(data.total_revenue)}
                                </span>
                            </div>
                            <div className="flex justify-between py-3 border-b">
                                <span className="font-medium">II. Thu nhập khác</span>
                                <span className="font-medium">
                                    {formatMoney(data.other_income)}
                                </span>
                            </div>
                            <div className="flex justify-between py-3 border-b">
                                <span className="font-medium">III. Chi phí</span>
                                <span className="font-medium text-red-600">
                                    - {formatMoney(data.total_expenses)}
                                </span>
                            </div>
                            <div className="flex justify-between py-3 border-b bg-muted/50 px-2 rounded">
                                <span className="font-semibold">= Lợi nhuận kế toán trước thuế</span>
                                <span className={`font-semibold ${data.accounting_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatMoney(data.accounting_profit)}
                                </span>
                            </div>

                            {/* Add-backs Section */}
                            {data.add_backs > 0 && (
                                <>
                                    <div className="flex justify-between py-3 border-b items-center">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                            <span className="font-medium">IV. Điều chỉnh tăng</span>
                                        </div>
                                        <span className="font-medium text-yellow-600">
                                            + {formatMoney(data.add_backs)}
                                        </span>
                                    </div>

                                    {data.adjustments
                                        .filter(a => a.adjustment_type === 'ADD_BACK')
                                        .map(adj => (
                                            <div key={adj.id} className="flex justify-between py-2 pl-8 text-sm text-muted-foreground border-b border-dashed">
                                                <span className="flex items-center gap-2">
                                                    <Info className="w-3 h-3" />
                                                    {adj.description}
                                                </span>
                                                <span>{formatMoney(adj.amount)}</span>
                                            </div>
                                        ))
                                    }
                                </>
                            )}

                            {/* Deductions */}
                            {data.deductions > 0 && (
                                <div className="flex justify-between py-3 border-b">
                                    <span className="font-medium">V. Điều chỉnh giảm</span>
                                    <span className="font-medium text-green-600">
                                        - {formatMoney(data.deductions)}
                                    </span>
                                </div>
                            )}

                            {/* Taxable Income */}
                            <div className="flex justify-between py-3 border-b bg-blue-50 dark:bg-blue-950/20 px-2 rounded">
                                <span className="font-semibold">VI. Thu nhập chịu thuế</span>
                                <span className="font-semibold text-blue-600">
                                    {formatMoney(data.taxable_income)}
                                </span>
                            </div>

                            {/* Tax Rate */}
                            <div className="flex justify-between py-3 border-b">
                                <span className="font-medium">VII. Thuế suất</span>
                                <span className="font-medium">{data.tax_rate}%</span>
                            </div>

                            {/* Final CIT Amount */}
                            <div className="flex justify-between py-4 bg-red-50 dark:bg-red-950/20 px-2 rounded mt-2">
                                <span className="font-bold text-lg">VIII. THUẾ TNDN PHẢI NỘP</span>
                                <span className="font-bold text-lg text-red-600">
                                    {formatMoney(data.cit_amount)}
                                </span>
                            </div>

                            {/* Loss carried */}
                            {data.loss_carried > 0 && (
                                <div className="flex justify-between py-3 text-muted-foreground">
                                    <span>Lỗ được chuyển kỳ sau</span>
                                    <span>{formatMoney(data.loss_carried)}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button
                            variant="default"
                            onClick={handleDownloadXML}
                            className="flex-1"
                            disabled={!data}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Xuất XML 03/TNDN
                        </Button>
                        <Button variant="outline" className="flex-1" disabled>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Nộp tờ khai (Sắp có)
                        </Button>
                    </div>

                    {/* Info Note */}
                    <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
                        <CardContent className="p-4 flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-medium text-blue-700 dark:text-blue-400">Lưu ý</p>
                                <p className="text-blue-600 dark:text-blue-300">
                                    File XML được tạo theo mẫu 03/TNDN chuẩn Tổng cục Thuế.
                                    Vui lòng kiểm tra lại thông tin trước khi nộp.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
