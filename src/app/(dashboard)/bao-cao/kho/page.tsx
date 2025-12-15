// src/app/(dashboard)/bao-cao/kho/page.tsx
// Trang Báo cáo Kho

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { formatMoney, formatNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
    ArrowLeft,
    Download,
    Package,
    Clock,
    DollarSign,
    AlertTriangle,
    TrendingDown,
    ArrowRight,
} from 'lucide-react';
import type {
    StockMovementReport,
    StockAgingReport,
    StockValuationReport
} from '@/types/stock-reports';

export default function StockReportsPage() {
    const [dateFrom, setDateFrom] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().split('T')[0];
    });
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

    return (
        <div className="min-h-screen pb-24">
            {/* Header */}
            <header className="border-b bg-background sticky top-0 z-10">
                <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4">
                    <Link href="/bao-cao">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold">📊 Báo cáo Kho</h1>
                        <p className="text-sm text-muted-foreground">Nhập xuất tồn, Tuổi tồn, Giá trị</p>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
                {/* Date Range */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Từ</span>
                    <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-40"
                    />
                    <span className="text-sm text-muted-foreground">đến</span>
                    <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-40"
                    />
                </div>

                <Tabs defaultValue="nxt" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="nxt" className="text-sm">
                            <Package className="w-4 h-4 mr-1" />
                            Nhập Xuất Tồn
                        </TabsTrigger>
                        <TabsTrigger value="aging" className="text-sm">
                            <Clock className="w-4 h-4 mr-1" />
                            Tuổi Tồn
                        </TabsTrigger>
                        <TabsTrigger value="value" className="text-sm">
                            <DollarSign className="w-4 h-4 mr-1" />
                            Giá Trị
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="nxt" className="mt-4">
                        <StockMovementReportTab dateFrom={dateFrom} dateTo={dateTo} />
                    </TabsContent>

                    <TabsContent value="aging" className="mt-4">
                        <StockAgingReportTab />
                    </TabsContent>

                    <TabsContent value="value" className="mt-4">
                        <StockValuationReportTab />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}

// ==========================================
// TAB 1: NHẬP XUẤT TỒN
// ==========================================

function StockMovementReportTab({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
    const { data, isLoading, error } = useQuery({
        queryKey: ['stock-movement-report', dateFrom, dateTo],
        queryFn: async () => {
            const res = await fetch(`/api/reports/stock/movements?date_from=${dateFrom}&date_to=${dateTo}`);
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        },
        enabled: !!dateFrom && !!dateTo,
    });

    const report: StockMovementReport | null = data?.data;

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                </div>
                <Skeleton className="h-64" />
            </div>
        );
    }

    if (error || !report) {
        return (
            <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                    Không có dữ liệu hoặc lỗi tải báo cáo
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Nhập trong kỳ</div>
                        <div className="text-xl font-bold text-green-600">
                            {formatMoney(report.summary.total_in_value)}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Xuất trong kỳ</div>
                        <div className="text-xl font-bold text-red-600">
                            {formatMoney(report.summary.total_out_value)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Results count */}
            <p className="text-sm text-muted-foreground">
                {report.items.length} sản phẩm có biến động
            </p>

            {/* Table */}
            {report.items.length === 0 ? (
                <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                        Không có sản phẩm nào có biến động trong kỳ
                    </CardContent>
                </Card>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted">
                            <tr>
                                <th className="p-3 text-left font-medium">Sản phẩm</th>
                                <th className="p-3 text-right font-medium">Đầu kỳ</th>
                                <th className="p-3 text-right font-medium text-green-600">Nhập</th>
                                <th className="p-3 text-right font-medium text-red-600">Xuất</th>
                                <th className="p-3 text-right font-medium">Cuối kỳ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.items.map((item) => (
                                <tr key={item.product_id} className="border-b hover:bg-muted/50">
                                    <td className="p-3">
                                        <Link href={`/kho/${item.product_id}`} className="hover:underline">
                                            <div className="font-medium">{item.product_name}</div>
                                            <div className="text-xs text-muted-foreground">{item.product_code}</div>
                                        </Link>
                                    </td>
                                    <td className="p-3 text-right tabular-nums">
                                        {formatNumber(item.opening_qty)}
                                    </td>
                                    <td className="p-3 text-right text-green-600 tabular-nums">
                                        +{formatNumber(item.in_qty)}
                                    </td>
                                    <td className="p-3 text-right text-red-600 tabular-nums">
                                        -{formatNumber(item.out_qty)}
                                    </td>
                                    <td className="p-3 text-right font-medium tabular-nums">
                                        {formatNumber(item.closing_qty)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-muted font-medium">
                            <tr>
                                <td className="p-3">TỔNG GIÁ TRỊ</td>
                                <td className="p-3 text-right tabular-nums">
                                    {formatMoney(report.summary.total_opening_value)}
                                </td>
                                <td className="p-3 text-right text-green-600 tabular-nums">
                                    {formatMoney(report.summary.total_in_value)}
                                </td>
                                <td className="p-3 text-right text-red-600 tabular-nums">
                                    {formatMoney(report.summary.total_out_value)}
                                </td>
                                <td className="p-3 text-right tabular-nums">
                                    {formatMoney(report.summary.total_closing_value)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}

            {/* Export button */}
            <Button variant="outline" className="w-full" disabled>
                <Download className="w-4 h-4 mr-2" />
                Xuất Excel (Sắp có)
            </Button>
        </div>
    );
}

// ==========================================
// TAB 2: TUỔI TỒN KHO
// ==========================================

function StockAgingReportTab() {
    const { data, isLoading } = useQuery({
        queryKey: ['stock-aging-report'],
        queryFn: async () => {
            const res = await fetch('/api/reports/stock/aging');
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        },
    });

    const report: StockAgingReport | null = data?.data;

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                </div>
                <Skeleton className="h-64" />
            </div>
        );
    }

    if (!report) return null;

    return (
        <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
                <Card className="border-l-4 border-l-yellow-500">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm text-muted-foreground">Chậm luân chuyển</span>
                        </div>
                        <div className="text-xl font-bold text-yellow-600">
                            {report.summary.slow_moving_count} SP
                        </div>
                        <div className="text-xs text-muted-foreground">&gt;60 ngày không giao dịch</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <span className="text-sm text-muted-foreground">Hàng chết</span>
                        </div>
                        <div className="text-xl font-bold text-red-600">
                            {report.summary.dead_stock_count} SP
                        </div>
                        <div className="text-xs text-muted-foreground">&gt;90 ngày không giao dịch</div>
                    </CardContent>
                </Card>
            </div>

            {/* Items list */}
            {report.items.length === 0 ? (
                <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                        🎉 Không có hàng tồn chậm luân chuyển
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {report.items.map((item) => {
                        const isDeadStock = item.days_since_last_movement > 90;
                        const isSlowMoving = item.days_since_last_movement > 60;

                        return (
                            <Card
                                key={item.product_id}
                                className={isDeadStock ? 'border-red-500/50' : isSlowMoving ? 'border-yellow-500/50' : ''}
                            >
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center gap-4">
                                        <div className="flex-1 min-w-0">
                                            <Link href={`/kho/${item.product_id}`} className="hover:underline">
                                                <div className="font-medium truncate">{item.product_name}</div>
                                            </Link>
                                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                <Clock className="w-3 h-3" />
                                                {item.days_since_last_movement} ngày không giao dịch
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold">{formatNumber(item.total_qty)} {item.unit}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {formatMoney(item.total_value)}
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ==========================================
// TAB 3: GIÁ TRỊ TỒN KHO
// ==========================================

function StockValuationReportTab() {
    const { data, isLoading } = useQuery({
        queryKey: ['stock-valuation-report'],
        queryFn: async () => {
            const res = await fetch('/api/reports/stock/inventory');
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        },
    });

    const report: StockValuationReport | null = data?.data;

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-48" />
            </div>
        );
    }

    if (!report) return null;

    return (
        <div className="space-y-4">
            {/* Total Value */}
            <Card className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Tổng giá trị tồn kho</div>
                    <div className="text-3xl font-bold text-primary">
                        {formatMoney(report.summary.total_value)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                        {report.summary.total_products} sản phẩm · {formatNumber(report.summary.total_quantity)} đơn vị
                    </div>
                </CardContent>
            </Card>

            {/* By Category */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Theo danh mục</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {report.by_category.map((cat) => (
                        <div
                            key={cat.category}
                            className="flex justify-between items-center p-3 bg-muted rounded-lg"
                        >
                            <span className="font-medium">{cat.category}</span>
                            <div className="text-right">
                                <span className="font-bold">{formatMoney(cat.total_value)}</span>
                                <span className="text-sm text-muted-foreground ml-2">
                                    ({cat.percentage.toFixed(1)}%)
                                </span>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Top Items */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Top sản phẩm giá trị cao</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {report.items.slice(0, 10).map((item, index) => (
                        <Link
                            key={item.product_id}
                            href={`/kho/${item.product_id}`}
                            className="flex justify-between items-center p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-muted-foreground w-6 text-center">{index + 1}</span>
                                <div>
                                    <div className="font-medium">{item.product_name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {formatNumber(item.quantity)} {item.unit} × {formatMoney(item.avg_cost)}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold">{formatMoney(item.total_value)}</div>
                                <div className="text-xs text-muted-foreground">
                                    {item.value_percentage.toFixed(1)}%
                                </div>
                            </div>
                        </Link>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
