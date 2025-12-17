// src/app/(dashboard)/thue/tncn/page.tsx
// PIT (Thuế TNCN) Calculation Page - Task 7

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { PITCalculationResult, PITBatchResult } from '@/types/pit';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Calculator,
    Users,
    Loader2,
    TrendingUp,
    FileText,
    RefreshCw,
    CheckCircle2,
    User,
    Percent,
} from 'lucide-react';
import { toast } from 'sonner';

// ==========================================
// HELPERS
// ==========================================

function formatMoney(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
}

function getCurrentPeriod(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${month}`;
}

function generatePeriodOptions() {
    const opts: { value: string; label: string }[] = [];
    const now = new Date();
    const year = now.getFullYear();

    for (let m = 12; m >= 1; m--) {
        opts.push({
            value: `${year}-${String(m).padStart(2, '0')}`,
            label: `Tháng ${m}/${year}`,
        });
    }
    for (let m = 12; m >= 1; m--) {
        opts.push({
            value: `${year - 1}-${String(m).padStart(2, '0')}`,
            label: `Tháng ${m}/${year - 1}`,
        });
    }
    return opts;
}

function getTaxMethodBadge(method: string) {
    switch (method) {
        case 'PROGRESSIVE':
            return <Badge variant="default">Lũy tiến</Badge>;
        case 'FLAT_10':
            return <Badge variant="secondary">10%</Badge>;
        case 'FLAT_20':
            return <Badge variant="destructive">20%</Badge>;
        case 'EXEMPT':
            return <Badge variant="outline">Miễn</Badge>;
        default:
            return <Badge>{method}</Badge>;
    }
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function PITCalculationPage() {
    const queryClient = useQueryClient();
    const [period, setPeriod] = useState(getCurrentPeriod());

    // Fetch PIT calculations for period
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['pit-calculations', period],
        queryFn: async () => {
            const res = await apiClient.get<{ success: boolean; data: PITBatchResult }>(`/tax/pit/${period}`);
            return res.data?.data || null;
        },
        enabled: !!period,
        retry: false,
    });

    // Batch calculate mutation
    const calculateMutation = useMutation({
        mutationFn: async () => {
            const res = await apiClient.post<{ data: PITBatchResult }>('/tax/pit/calculate', { period });
            return res;
        },
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['pit-calculations', period] });
            const count = (res.data as any)?.total_employees || 0;
            toast.success(`Đã tính thuế TNCN cho ${count} nhân viên!`);
        },
        onError: (err: Error & { response?: { data?: { error?: string } } }) => {
            toast.error(err.response?.data?.error || err.message || 'Lỗi tính thuế');
        },
    });

    return (
        <div className="p-6 space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        👤 Thuế TNCN (PIT)
                    </h1>
                    <p className="text-muted-foreground">
                        Tính thuế thu nhập cá nhân cho nhân viên theo tháng
                    </p>
                </div>
                <Badge variant="outline" className="text-sm">
                    Biểu thuế lũy tiến 7 bậc
                </Badge>
            </div>

            {/* Period Selection */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                                Kỳ lương
                            </label>
                            <Select value={period} onValueChange={setPeriod}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {generatePeriodOptions().map(opt => (
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
                                Tính thuế tất cả NV
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => refetch()}>
                                <RefreshCw className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Loading */}
            {isLoading && (
                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <Skeleton className="h-24" />
                        <Skeleton className="h-24" />
                        <Skeleton className="h-24" />
                    </div>
                    <Skeleton className="h-64" />
                </div>
            )}

            {/* No Data */}
            {!isLoading && (!data || data.calculations?.length === 0) && (
                <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                        <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Chưa có dữ liệu</h3>
                        <p className="text-muted-foreground mb-4">
                            Chưa có tính toán thuế TNCN cho kỳ {period}
                        </p>
                        <Button onClick={() => calculateMutation.mutate()}>
                            <Calculator className="w-4 h-4 mr-2" />
                            Tính thuế ngay
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Results */}
            {data && data.calculations && data.calculations.length > 0 && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-muted-foreground">Tổng nhân viên</div>
                                        <div className="text-2xl font-bold">
                                            {data.total_employees}
                                        </div>
                                    </div>
                                    <Users className="w-8 h-8 text-blue-500" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-muted-foreground">Tổng thu nhập</div>
                                        <div className="text-2xl font-bold text-green-600">
                                            {formatMoney(data.total_gross || 0)}
                                        </div>
                                    </div>
                                    <TrendingUp className="w-8 h-8 text-green-500" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-red-50 dark:bg-red-950/20 border-red-200">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-muted-foreground">Tổng thuế TNCN</div>
                                        <div className="text-2xl font-bold text-red-600">
                                            {formatMoney(data.total_pit)}
                                        </div>
                                    </div>
                                    <Percent className="w-8 h-8 text-red-500" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Summary by Method */}
                    {data.summary && (
                        <div className="flex gap-2 flex-wrap">
                            <Badge variant="default">
                                Lũy tiến: {data.summary.progressive}
                            </Badge>
                            <Badge variant="secondary">
                                10%: {data.summary.flat_10}
                            </Badge>
                            <Badge variant="destructive">
                                20%: {data.summary.flat_20}
                            </Badge>
                            <Badge variant="outline">
                                Miễn: {data.summary.exempt}
                            </Badge>
                        </div>
                    )}

                    {/* Employee List */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Chi tiết thuế TNCN theo nhân viên
                            </CardTitle>
                            <CardDescription>
                                Kỳ: {period}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-2">Nhân viên</th>
                                            <th className="text-right py-2">Thu nhập</th>
                                            <th className="text-right py-2">Giảm trừ</th>
                                            <th className="text-right py-2">TNTT</th>
                                            <th className="text-right py-2">Thuế</th>
                                            <th className="text-center py-2">Phương pháp</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.calculations.map((calc) => (
                                            <tr key={calc.id} className="border-b hover:bg-muted/50">
                                                <td className="py-3">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-4 h-4 text-muted-foreground" />
                                                        <div>
                                                            <div className="font-medium">{calc.employee_name}</div>
                                                            {calc.employee_code && (
                                                                <div className="text-xs text-muted-foreground">
                                                                    {calc.employee_code}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="text-right py-3">
                                                    {formatMoney(calc.gross_income)}
                                                </td>
                                                <td className="text-right py-3 text-muted-foreground">
                                                    {formatMoney(calc.total_deduction)}
                                                </td>
                                                <td className="text-right py-3">
                                                    {formatMoney(calc.taxable_income)}
                                                </td>
                                                <td className="text-right py-3 font-medium text-red-600">
                                                    {formatMoney(calc.pit_amount)}
                                                </td>
                                                <td className="text-center py-3">
                                                    {getTaxMethodBadge(calc.tax_method)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="font-bold bg-muted/50">
                                            <td className="py-3">TỔNG CỘNG</td>
                                            <td className="text-right py-3 text-green-600">
                                                {formatMoney(data.total_gross || 0)}
                                            </td>
                                            <td className="text-right py-3">-</td>
                                            <td className="text-right py-3">-</td>
                                            <td className="text-right py-3 text-red-600">
                                                {formatMoney(data.total_pit)}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
