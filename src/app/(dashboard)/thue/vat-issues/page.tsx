// src/app/(dashboard)/thue/vat-issues/page.tsx
// VAT Issues Page - Shows invoices with VAT problems

'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { VATIssuesReport, VATIssueItem } from '@/types/vat-validation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle,
    FileWarning,
    TrendingUp,
    TrendingDown,
    ExternalLink,
    ReceiptText
} from 'lucide-react';
import Link from 'next/link';

function getQuarterDates() {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const year = now.getFullYear();

    const startMonth = quarter * 3;
    const endMonth = startMonth + 2;

    const from = new Date(year, startMonth, 1);
    const to = new Date(year, endMonth + 1, 0);

    return {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
    };
}

function formatMoney(amount: number): string {
    if (amount >= 1000000000) {
        return `${(amount / 1000000000).toFixed(1)} tỷ`;
    }
    if (amount >= 1000000) {
        return `${(amount / 1000000).toFixed(1)} tr`;
    }
    return amount.toLocaleString('vi-VN') + 'đ';
}

export default function VATIssuesPage() {
    const defaultDates = useMemo(() => getQuarterDates(), []);
    const [fromDate, setFromDate] = useState(defaultDates.from);
    const [toDate, setToDate] = useState(defaultDates.to);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['vat-issues', fromDate, toDate],
        queryFn: async () => {
            const res = await fetch(
                `/api/tax/vat/issues?from_date=${fromDate}&to_date=${toDate}`
            );
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json.data as VATIssuesReport;
        },
    });

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <FileWarning className="h-7 w-7 text-amber-500" />
                        Kiểm tra VAT đầu vào
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Phát hiện hóa đơn có vấn đề về khấu trừ VAT
                    </p>
                </div>
            </div>

            {/* Date Range Filter */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="space-y-1.5">
                            <Label htmlFor="from_date">Từ ngày</Label>
                            <Input
                                id="from_date"
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="w-full md:w-40"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="to_date">Đến ngày</Label>
                            <Input
                                id="to_date"
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="w-full md:w-40"
                            />
                        </div>
                        <Button onClick={() => refetch()}>
                            Áp dụng
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Loading State */}
            {isLoading && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i}>
                            <CardContent className="p-4">
                                <Skeleton className="h-8 w-24 mb-2" />
                                <Skeleton className="h-4 w-32" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Error State */}
            {error && (
                <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
                    <CardContent className="p-4 text-red-600">
                        <AlertCircle className="h-5 w-5 inline mr-2" />
                        Lỗi: {error instanceof Error ? error.message : 'Không thể tải dữ liệu'}
                    </CardContent>
                </Card>
            )}

            {/* Summary Cards */}
            {data && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Total Invoices */}
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <ReceiptText className="h-4 w-4" />
                                    <span className="text-sm">Tổng HĐ</span>
                                </div>
                                <div className="text-2xl font-bold mt-1">
                                    {data.summary.total_invoices}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {formatMoney(data.summary.total_vat)} VAT
                                </div>
                            </CardContent>
                        </Card>

                        {/* Deductible */}
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-green-600">
                                    <TrendingUp className="h-4 w-4" />
                                    <span className="text-sm">Được khấu trừ</span>
                                </div>
                                <div className="text-2xl font-bold mt-1 text-green-600">
                                    {data.summary.deductible_count}
                                </div>
                                <div className="text-sm text-green-600/80">
                                    {formatMoney(data.summary.deductible_vat)}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Non-deductible */}
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-red-600">
                                    <TrendingDown className="h-4 w-4" />
                                    <span className="text-sm">Không khấu trừ</span>
                                </div>
                                <div className="text-2xl font-bold mt-1 text-red-600">
                                    {data.summary.non_deductible_count}
                                </div>
                                <div className="text-sm text-red-600/80">
                                    {formatMoney(data.summary.non_deductible_vat)}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Warnings */}
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-amber-600">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span className="text-sm">Cảnh báo</span>
                                </div>
                                <div className="text-2xl font-bold mt-1 text-amber-600">
                                    {data.summary.warning_count + data.summary.partial_count}
                                </div>
                                <div className="text-sm text-amber-600/80">
                                    {data.summary.partial_count} khấu trừ 1 phần
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Issues List */}
                    {data.issues.length === 0 ? (
                        <Card>
                            <CardContent className="p-8 text-center">
                                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                                <h3 className="text-lg font-medium">Không có vấn đề VAT</h3>
                                <p className="text-muted-foreground mt-1">
                                    Tất cả hóa đơn trong kỳ đều hợp lệ để khấu trừ VAT
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                    Hóa đơn cần kiểm tra ({data.issues.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y">
                                    {data.issues.map((issue) => (
                                        <IssueRow key={issue.transaction_id} issue={issue} />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}

function IssueRow({ issue }: { issue: VATIssueItem }) {
    return (
        <div className="p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{issue.invoice_number}</span>
                        <Badge
                            variant={issue.is_deductible ? (issue.is_partial ? 'outline' : 'outline') : 'destructive'}
                            className={
                                issue.is_deductible
                                    ? issue.is_partial
                                        ? 'text-amber-600 border-amber-300'
                                        : 'text-yellow-600 border-yellow-300'
                                    : ''
                            }
                        >
                            {issue.is_deductible
                                ? issue.is_partial
                                    ? 'Khấu trừ 1 phần'
                                    : 'Cảnh báo'
                                : 'Không khấu trừ'
                            }
                        </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                        {issue.supplier_name} • {issue.invoice_date}
                    </div>

                    {/* Errors */}
                    {issue.errors.length > 0 && (
                        <div className="mt-2 space-y-1">
                            {issue.errors.map((err, i) => (
                                <div key={i} className="text-sm text-red-600 flex items-start gap-1">
                                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                    <span>{err}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Warnings */}
                    {issue.warnings.length > 0 && (
                        <div className="mt-2 space-y-1">
                            {issue.warnings.map((warn, i) => (
                                <div key={i} className="text-sm text-amber-600 flex items-start gap-1">
                                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                    <span>{warn}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="text-right shrink-0">
                    <div className="font-medium">
                        {issue.vat_amount.toLocaleString('vi-VN')}đ
                    </div>
                    {issue.is_partial && (
                        <div className="text-sm text-green-600">
                            KT: {issue.deductible_amount.toLocaleString('vi-VN')}đ
                        </div>
                    )}
                    {issue.fix_link && (
                        <Link href={issue.fix_link}>
                            <Button variant="ghost" size="sm" className="mt-1">
                                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                Xem
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
