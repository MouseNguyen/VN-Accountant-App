// src/app/(dashboard)/thue/page.tsx
// Tax Compliance Dashboard Page - Task 8

'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle,
    Calendar,
    Clock,
    ArrowRight,
    FileText,
    TrendingUp,
    Users,
    Receipt,
    RefreshCw,
    Loader2,
} from 'lucide-react';
import Link from 'next/link';

// ==========================================
// TYPES
// ==========================================

interface TaxComplianceDashboard {
    compliance_score: number;
    status: 'GOOD' | 'WARNING' | 'CRITICAL';
    alerts: TaxAlert[];
    upcoming_deadlines: TaxDeadlineItem[];
    overdue_items: TaxDeadlineItem[];
    vat_issues_count: number;
    non_deductible_vat: number;
    stats: {
        vat_this_quarter: number;
        cit_this_quarter: number;
        pit_this_month: number;
    };
}

interface TaxAlert {
    id: string;
    type: string;
    severity: 'info' | 'warning' | 'error';
    title: string;
    message: string;
    action_link?: string;
    action_label?: string;
}

interface TaxDeadlineItem {
    id: string;
    tax_type: string;
    period: string;
    due_date: string;
    days_remaining: number;
    status: string;
    amount?: number;
}

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

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function getTaxTypeName(type: string): string {
    switch (type) {
        case 'VAT': return 'VAT (GTGT)';
        case 'CIT': return 'TNDN';
        case 'PIT': return 'TNCN';
        case 'LICENSE': return 'Môn bài';
        default: return type;
    }
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function TaxCompliancePage() {
    const { data, isLoading, refetch, isFetching, error } = useQuery({
        queryKey: ['tax-compliance'],
        queryFn: async () => {
            console.log('Fetching tax compliance...');
            const res = await apiClient.get<TaxComplianceDashboard>('/tax/compliance');
            console.log('Response:', res);

            if (!res.success) {
                throw new Error(res.error?.message || 'Failed to load');
            }
            return res.data || null;
        },
        retry: false,
    });

    if (isLoading) {
        return (
            <div className="p-6 space-y-4 max-w-4xl mx-auto">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-32" />
                <div className="grid grid-cols-3 gap-4">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                </div>
                <Skeleton className="h-64" />
            </div>
        );
    }

    if (error || !data) {
        const errorMessage = error?.message || 'Không thể tải dữ liệu';
        const isAuthError = errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('Request failed');

        return (
            <div className="p-6 max-w-4xl mx-auto">
                <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">
                            {isAuthError ? 'Vui lòng đăng nhập' : 'Không có dữ liệu'}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                            {isAuthError
                                ? 'Bạn cần đăng nhập để xem trang này'
                                : 'Không thể tải dữ liệu tuân thủ thuế'}
                        </p>
                        {isAuthError ? (
                            <Link href="/dang-nhap">
                                <Button>Đăng nhập</Button>
                            </Link>
                        ) : (
                            <Button onClick={() => refetch()}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Thử lại
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    const StatusIcon = data.status === 'GOOD' ? CheckCircle :
        data.status === 'WARNING' ? AlertTriangle : AlertCircle;

    const statusColor = data.status === 'GOOD' ? 'text-green-600' :
        data.status === 'WARNING' ? 'text-yellow-600' : 'text-red-600';

    const statusBgColor = data.status === 'GOOD' ? 'bg-green-50 dark:bg-green-950/20' :
        data.status === 'WARNING' ? 'bg-yellow-50 dark:bg-yellow-950/20' : 'bg-red-50 dark:bg-red-950/20';

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        📊 Tuân thủ Thuế
                    </h1>
                    <p className="text-muted-foreground">
                        Tổng quan tình hình thuế và các hạn nộp sắp tới
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                    {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
            </div>

            {/* Compliance Score Card */}
            <Card className={statusBgColor}>
                <CardContent className="p-6">
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <StatusIcon className={`w-16 h-16 ${statusColor}`} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`text-4xl font-bold ${statusColor}`}>
                                    {data.compliance_score}%
                                </span>
                                <Badge variant={
                                    data.status === 'GOOD' ? 'default' :
                                        data.status === 'WARNING' ? 'secondary' : 'destructive'
                                }>
                                    {data.status === 'GOOD' ? '✓ Tốt' :
                                        data.status === 'WARNING' ? '⚠ Cần chú ý' : '⛔ Cảnh báo'}
                                </Badge>
                            </div>
                            <Progress
                                value={data.compliance_score}
                                className="h-3"
                            />
                            <p className="text-sm text-muted-foreground mt-2">
                                {data.overdue_items.length > 0 && `${data.overdue_items.length} khoản quá hạn • `}
                                {data.upcoming_deadlines.filter(d => d.days_remaining <= 7).length} sắp đến hạn
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Alerts */}
            {data.alerts.length > 0 && (
                <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-yellow-600" />
                            Cần hành động ({data.alerts.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {data.alerts.map(alert => (
                            <div
                                key={alert.id}
                                className={`flex justify-between items-center p-3 bg-white dark:bg-gray-900 rounded-lg border ${alert.severity === 'error' ? 'border-red-300' :
                                    alert.severity === 'warning' ? 'border-yellow-300' : 'border-gray-200'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    {alert.severity === 'error' ? (
                                        <AlertCircle className="w-5 h-5 text-red-500" />
                                    ) : (
                                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                                    )}
                                    <div>
                                        <div className="font-medium">{alert.title}</div>
                                        <div className="text-sm text-muted-foreground">{alert.message}</div>
                                    </div>
                                </div>
                                {alert.action_link && (
                                    <Link href={alert.action_link}>
                                        <Button size="sm" variant={alert.severity === 'error' ? 'destructive' : 'outline'}>
                                            {alert.action_label}
                                            <ArrowRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-muted-foreground">VAT Quý này</div>
                                <div className="text-xl font-bold text-blue-600">
                                    {formatMoney(data.stats.vat_this_quarter)}
                                </div>
                            </div>
                            <Receipt className="w-8 h-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-muted-foreground">TNDN Quý này</div>
                                <div className="text-xl font-bold text-green-600">
                                    {formatMoney(data.stats.cit_this_quarter)}
                                </div>
                            </div>
                            <TrendingUp className="w-8 h-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-muted-foreground">TNCN Tháng này</div>
                                <div className="text-xl font-bold text-purple-600">
                                    {formatMoney(data.stats.pit_this_month)}
                                </div>
                            </div>
                            <Users className="w-8 h-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Upcoming Deadlines */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Lịch nộp thuế sắp tới
                    </CardTitle>
                    <CardDescription>
                        Các kỳ thuế cần nộp trong 60 ngày tới
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {data.upcoming_deadlines.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                            <p>Không có hạn nộp thuế nào trong 60 ngày tới</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {data.upcoming_deadlines.slice(0, 8).map(item => (
                                <div
                                    key={item.id}
                                    className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                            <div className="font-medium">
                                                {getTaxTypeName(item.tax_type)} - {item.period}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                Hạn: {formatDate(item.due_date)}
                                                {item.amount && ` • ${formatMoney(item.amount)}`}
                                            </div>
                                        </div>
                                    </div>
                                    <Badge
                                        variant={
                                            item.days_remaining <= 3 ? 'destructive' :
                                                item.days_remaining <= 7 ? 'secondary' : 'outline'
                                        }
                                    >
                                        <Clock className="w-3 h-3 mr-1" />
                                        {item.days_remaining} ngày
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Link href="/thue/vat-issues">
                    <Card className="hover:border-primary cursor-pointer transition-colors">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl mb-1">🔍</div>
                            <div className="text-sm font-medium">Kiểm tra VAT</div>
                            {data.vat_issues_count > 0 && (
                                <Badge variant="destructive" className="mt-1">
                                    {data.vat_issues_count} vấn đề
                                </Badge>
                            )}
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/thue/tndn">
                    <Card className="hover:border-primary cursor-pointer transition-colors">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl mb-1">💰</div>
                            <div className="text-sm font-medium">Thuế TNDN</div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/thue/tncn">
                    <Card className="hover:border-primary cursor-pointer transition-colors">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl mb-1">👤</div>
                            <div className="text-sm font-medium">Thuế TNCN</div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/thue/to-khai">
                    <Card className="hover:border-primary cursor-pointer transition-colors">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl mb-1">📋</div>
                            <div className="text-sm font-medium">Tờ khai VAT</div>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
