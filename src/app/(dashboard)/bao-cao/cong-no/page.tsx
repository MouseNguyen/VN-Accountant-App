'use client';

// src/app/(dashboard)/bao-cao/cong-no/page.tsx
// Báo cáo tuổi nợ (Aging Report)

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
    ArrowLeft,
    RefreshCw,
    TrendingUp,
    Clock,
    AlertTriangle,
    ChevronRight,
    Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/decimal';
import type { ARAgingReport, ARAgingItem } from '@/types/ar';

async function fetchAgingReport(): Promise<ARAgingReport> {
    const res = await fetch('/api/ar/aging');
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Lỗi tải báo cáo');
    return data.data;
}

export default function AgingReportPage() {
    const { data: report, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['ar-aging-report'],
        queryFn: fetchAgingReport,
    });

    const totals = report?.totals;

    // Calculate percentages for chart
    const chartData = totals
        ? [
            { label: 'Chưa hạn', value: totals.current, color: 'bg-green-50 dark:bg-green-900/200' },
            { label: '1-30 ngày', value: totals.days_1_30, color: 'bg-yellow-50 dark:bg-yellow-900/200' },
            { label: '31-60 ngày', value: totals.days_31_60, color: 'bg-orange-500' },
            { label: '61-90 ngày', value: totals.days_61_90, color: 'bg-red-400' },
            { label: '>90 ngày', value: totals.over_90, color: 'bg-red-600' },
        ]
        : [];

    const totalBalance = totals?.total_balance || 0;

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-card border-b">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <Link href="/bao-cao?tab=payable">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-lg font-bold">📊 Báo cáo tuổi nợ</h1>
                            <p className="text-xs text-muted-foreground">
                                Tính đến {report?.as_of_date || 'hôm nay'}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => refetch()}
                        disabled={isRefetching}
                    >
                        <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </header>

            {/* Content */}
            <main className="p-4 max-w-4xl mx-auto space-y-4">
                {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
                ) : (
                    <>
                        {/* Total Summary */}
                        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="h-5 w-5 text-primary" />
                                    <span className="text-sm text-muted-foreground">
                                        Tổng công nợ phải thu
                                    </span>
                                </div>
                                <div className="text-3xl font-bold text-primary">
                                    {formatMoney(totalBalance)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {report?.items.length || 0} khách hàng có nợ
                                </p>
                            </CardContent>
                        </Card>

                        {/* Visual Chart - Horizontal Bar */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Phân bổ theo tuổi nợ
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {/* Stacked Bar */}
                                <div className="h-8 rounded-lg overflow-hidden flex mb-4">
                                    {chartData.map((item, index) => {
                                        const percentage =
                                            totalBalance > 0 ? (item.value / totalBalance) * 100 : 0;
                                        if (percentage === 0) return null;
                                        return (
                                            <div
                                                key={index}
                                                className={`${item.color} transition-all`}
                                                style={{ width: `${percentage}%` }}
                                                title={`${item.label}: ${formatMoney(item.value)}`}
                                            />
                                        );
                                    })}
                                    {totalBalance === 0 && (
                                        <div className="w-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                            Không có dữ liệu
                                        </div>
                                    )}
                                </div>

                                {/* Legend */}
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                    {chartData.map((item, index) => {
                                        const percentage =
                                            totalBalance > 0 ? (item.value / totalBalance) * 100 : 0;
                                        return (
                                            <div key={index} className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className={`w-3 h-3 rounded-sm ${item.color}`}
                                                    />
                                                    <span className="text-xs text-muted-foreground">
                                                        {item.label}
                                                    </span>
                                                </div>
                                                <div className="font-bold text-sm">
                                                    {formatMoney(item.value)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {percentage.toFixed(1)}%
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Customer List */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Chi tiết theo khách hàng
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {report?.items.length === 0 ? (
                                    <div className="p-6 text-center text-muted-foreground">
                                        Không có khách hàng nào có công nợ
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {report?.items.map((item) => (
                                            <CustomerAgingRow key={item.customer_id} item={item} />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Generated info */}
                        <p className="text-xs text-center text-muted-foreground">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            Cập nhật lúc:{' '}
                            {report?.generated_at
                                ? new Date(report.generated_at).toLocaleString('vi-VN')
                                : '-'}
                        </p>
                    </>
                )}
            </main>
        </div>
    );
}

function CustomerAgingRow({ item }: { item: ARAgingItem }) {
    const hasOverdue = item.days_1_30 > 0 || item.days_31_60 > 0 || item.days_61_90 > 0 || item.over_90 > 0;
    const overdue90 = item.over_90 > 0;

    return (
        <Link href={`/cong-no/phai-thu`}>
            <div className="p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="flex items-start justify-between mb-2">
                    <div>
                        <div className="font-medium flex items-center gap-2">
                            {item.customer_name}
                            {overdue90 && (
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                            )}
                        </div>
                        <div className="text-sm text-muted-foreground">{item.customer_code}</div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                        <div>
                            <div className="font-bold">{formatMoney(item.total_balance)}</div>
                            {hasOverdue && (
                                <div className="text-xs text-destructive">Có nợ quá hạn</div>
                            )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                </div>

                {/* Mini bars */}
                <div className="flex gap-1 h-2 rounded overflow-hidden">
                    {item.current > 0 && (
                        <div
                            className="bg-green-50 dark:bg-green-900/200"
                            style={{
                                width: `${(item.current / item.total_balance) * 100}%`,
                            }}
                        />
                    )}
                    {item.days_1_30 > 0 && (
                        <div
                            className="bg-yellow-50 dark:bg-yellow-900/200"
                            style={{
                                width: `${(item.days_1_30 / item.total_balance) * 100}%`,
                            }}
                        />
                    )}
                    {item.days_31_60 > 0 && (
                        <div
                            className="bg-orange-500"
                            style={{
                                width: `${(item.days_31_60 / item.total_balance) * 100}%`,
                            }}
                        />
                    )}
                    {item.days_61_90 > 0 && (
                        <div
                            className="bg-red-400"
                            style={{
                                width: `${(item.days_61_90 / item.total_balance) * 100}%`,
                            }}
                        />
                    )}
                    {item.over_90 > 0 && (
                        <div
                            className="bg-red-600"
                            style={{
                                width: `${(item.over_90 / item.total_balance) * 100}%`,
                            }}
                        />
                    )}
                </div>
            </div>
        </Link>
    );
}
