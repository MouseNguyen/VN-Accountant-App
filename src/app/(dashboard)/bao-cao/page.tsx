// src/app/(dashboard)/bao-cao/page.tsx
// Trang báo cáo tổng hợp - Reports Dashboard

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Package,
    Receipt,
    Calendar,
    Download,
    RefreshCcw,
    ChevronRight,
    DollarSign,
    ShoppingCart,
    Wallet,
    AlertTriangle,
    CheckCircle2,
    Clock,
    PieChart,
    FileBarChart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    useIncomeExpenseReport,
    useProfitLossReport,
    useInventoryReport,
    usePayableReport,
    useARSummary,
    downloadReportExcel,
} from '@/hooks/use-reports';
import { toast } from 'sonner';
import { useFarm } from '@/hooks/use-farm';

// Date range presets
const DATE_PRESETS = [
    { value: 'today', label: 'Hôm nay' },
    { value: 'yesterday', label: 'Hôm qua' },
    { value: 'last7days', label: '7 ngày qua' },
    { value: 'last30days', label: '30 ngày qua' },
    { value: 'thisMonth', label: 'Tháng này' },
    { value: 'lastMonth', label: 'Tháng trước' },
    { value: 'thisQuarter', label: 'Quý này' },
    { value: 'lastQuarter', label: 'Quý trước' },
    { value: 'thisYear', label: 'Năm nay' },
    { value: 'lastYear', label: 'Năm trước' },
    { value: 'all', label: 'Tất cả' },
];

function getQuarterDates(date: Date, offsetQuarters: number = 0): { start: Date; end: Date } {
    const quarter = Math.floor(date.getMonth() / 3) + offsetQuarters;
    const year = date.getFullYear() + Math.floor(quarter / 4);
    const adjustedQuarter = ((quarter % 4) + 4) % 4;
    const startMonth = adjustedQuarter * 3;
    const start = new Date(year, startMonth, 1);
    const end = new Date(year, startMonth + 3, 0);
    return { start, end };
}

function getDateRange(preset: string): { start_date: string; end_date: string } {
    const today = new Date();
    const formatDate = (d: Date) => format(d, 'yyyy-MM-dd');

    switch (preset) {
        case 'today':
            return { start_date: formatDate(today), end_date: formatDate(today) };
        case 'yesterday':
            const yesterday = subDays(today, 1);
            return { start_date: formatDate(yesterday), end_date: formatDate(yesterday) };
        case 'last7days':
            return { start_date: formatDate(subDays(today, 7)), end_date: formatDate(today) };
        case 'last30days':
            return { start_date: formatDate(subDays(today, 30)), end_date: formatDate(today) };
        case 'thisMonth':
            return {
                start_date: formatDate(startOfMonth(today)),
                end_date: formatDate(endOfMonth(today)),
            };
        case 'lastMonth':
            const lastMonth = subMonths(today, 1);
            return {
                start_date: formatDate(startOfMonth(lastMonth)),
                end_date: formatDate(endOfMonth(lastMonth)),
            };
        case 'thisQuarter': {
            const { start, end } = getQuarterDates(today, 0);
            return { start_date: formatDate(start), end_date: formatDate(end) };
        }
        case 'lastQuarter': {
            const { start, end } = getQuarterDates(today, -1);
            return { start_date: formatDate(start), end_date: formatDate(end) };
        }
        case 'thisYear':
            return {
                start_date: formatDate(new Date(today.getFullYear(), 0, 1)),
                end_date: formatDate(new Date(today.getFullYear(), 11, 31)),
            };
        case 'lastYear':
            return {
                start_date: formatDate(new Date(today.getFullYear() - 1, 0, 1)),
                end_date: formatDate(new Date(today.getFullYear() - 1, 11, 31)),
            };
        case 'all':
            // Very early date to include all data
            return {
                start_date: '2020-01-01',
                end_date: formatDate(today),
            };
        default:
            return { start_date: formatDate(subDays(today, 30)), end_date: formatDate(today) };
    }
}

export default function BaoCaoPage() {
    const searchParams = useSearchParams();
    const initialTab = searchParams.get('tab') || 'overview';
    const [activeTab, setActiveTab] = useState(initialTab);
    const [datePreset, setDatePreset] = useState('last30days');
    const { farm } = useFarm();

    const dateRange = useMemo(() => getDateRange(datePreset), [datePreset]);

    const farmId = farm?.id || '';

    // Reports queries
    const { data: incomeExpenseData, isLoading: loadingIncomeExpense, refetch: refetchIncomeExpense } =
        useIncomeExpenseReport(
            { farm_id: farmId, ...dateRange, group_by: 'day', include_details: false },
            { enabled: !!farmId }
        );

    const { data: profitLossData, isLoading: loadingProfitLoss, refetch: refetchProfitLoss } =
        useProfitLossReport(
            { farm_id: farmId, ...dateRange },
            { enabled: !!farmId }
        );

    const { data: inventoryData, isLoading: loadingInventory, refetch: refetchInventory } =
        useInventoryReport(
            { farm_id: farmId },
            { enabled: !!farmId }
        );

    const { data: payableData, isLoading: loadingPayable, refetch: refetchPayable } =
        usePayableReport({ enabled: !!farmId });

    const { data: arSummary, isLoading: loadingAR, refetch: refetchAR } =
        useARSummary({ enabled: !!farmId });

    const isLoading = loadingIncomeExpense || loadingProfitLoss || loadingInventory || loadingPayable || loadingAR;

    // Refresh all reports
    const handleRefresh = () => {
        refetchIncomeExpense();
        refetchProfitLoss();
        refetchInventory();
        refetchPayable();
        refetchAR();
        toast.success('Đã làm mới báo cáo');
    };

    // Export report
    const handleExport = async (reportType: 'income-expense' | 'profit-loss' | 'inventory' | 'payable') => {
        try {
            // Convert dateRange keys to from/to for API
            await downloadReportExcel(reportType, {
                from: dateRange.start_date,
                to: dateRange.end_date
            });
            toast.success('Đã xuất báo cáo');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Lỗi khi xuất báo cáo';
            toast.error(message);
        }
    };

    // Format money
    const formatMoney = (value: number | string | undefined) => {
        if (value === undefined || value === null) return '0đ';
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(num);
    };

    // Calculate profit margin
    const profitMargin = useMemo(() => {
        if (!profitLossData || !profitLossData.revenue || profitLossData.revenue === 0) return 0;
        return (profitLossData.net_profit / profitLossData.revenue) * 100;
    }, [profitLossData]);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <BarChart3 className="h-7 w-7 text-primary" />
                        Báo cáo
                    </h1>
                    <p className="text-muted-foreground">Phân tích hoạt động kinh doanh</p>
                </div>
                <div className="flex gap-2">
                    <Select value={datePreset} onValueChange={setDatePreset}>
                        <SelectTrigger className="w-40">
                            <Calendar className="h-4 w-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {DATE_PRESETS.map((preset) => (
                                <SelectItem key={preset.value} value={preset.value}>
                                    {preset.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
                        <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full max-w-3xl grid-cols-5">
                    <TabsTrigger value="overview" className="gap-2">
                        <PieChart className="h-4 w-4" />
                        Tổng quan
                    </TabsTrigger>
                    <TabsTrigger value="income-expense" className="gap-2">
                        <DollarSign className="h-4 w-4" />
                        Thu chi
                    </TabsTrigger>
                    <TabsTrigger value="inventory" className="gap-2">
                        <Package className="h-4 w-4" />
                        Tồn kho
                    </TabsTrigger>
                    <TabsTrigger value="payable" className="gap-2">
                        <Receipt className="h-4 w-4" />
                        Công nợ
                    </TabsTrigger>
                    <TabsTrigger value="tax" className="gap-2">
                        <FileBarChart className="h-4 w-4" />
                        Thuế
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-6 space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard
                            title="Doanh thu"
                            value={formatMoney(profitLossData?.revenue)}
                            icon={TrendingUp}
                            color="text-green-600"
                            bgColor="bg-green-50 dark:bg-green-900/20"
                            isLoading={loadingProfitLoss}
                        />
                        <MetricCard
                            title="Tổng chi"
                            value={formatMoney(incomeExpenseData?.total_expense)}
                            icon={TrendingDown}
                            color="text-red-600"
                            bgColor="bg-red-50 dark:bg-red-900/20"
                            isLoading={loadingIncomeExpense}
                        />
                        <MetricCard
                            title="Lợi nhuận"
                            value={formatMoney(incomeExpenseData?.net)}
                            icon={Wallet}
                            color={(incomeExpenseData?.net ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}
                            bgColor={(incomeExpenseData?.net ?? 0) >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}
                            badge={incomeExpenseData?.total_income && incomeExpenseData.total_income > 0
                                ? `${((incomeExpenseData.net / incomeExpenseData.total_income) * 100).toFixed(1)}%`
                                : undefined}
                            isLoading={loadingIncomeExpense}
                        />
                        <MetricCard
                            title="Tồn kho"
                            value={formatMoney(inventoryData?.total_value)}
                            icon={Package}
                            color="text-blue-600"
                            bgColor="bg-blue-50 dark:bg-blue-900/20"
                            badge={inventoryData?.low_stock_count ? `${inventoryData.low_stock_count} thấp` : undefined}
                            badgeColor="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800"
                            isLoading={loadingInventory}
                        />
                    </div>

                    {/* Sub-metrics */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Income/Expense Breakdown */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <DollarSign className="h-5 w-5 text-primary" />
                                    Thu chi theo loại
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loadingIncomeExpense ? (
                                    <div className="space-y-3">
                                        <Skeleton className="h-10 w-full" />
                                        <Skeleton className="h-10 w-full" />
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-green-600" />
                                                <span>Bán hàng</span>
                                            </div>
                                            <span className="font-bold text-green-600">
                                                {formatMoney(incomeExpenseData?.total_income)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <ShoppingCart className="h-4 w-4 text-red-600" />
                                                <div>
                                                    <span>Tổng chi</span>
                                                    <span className="text-xs text-muted-foreground ml-1">(Chi phí + Mua hàng)</span>
                                                </div>
                                            </div>
                                            <span className="font-bold text-red-600">
                                                {formatMoney(incomeExpenseData?.total_expense)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-t-2 border-blue-200">
                                            <div className="flex items-center gap-2">
                                                <Wallet className="h-4 w-4 text-blue-600" />
                                                <span className="font-medium">Chênh lệch</span>
                                            </div>
                                            <span className={`font-bold ${(incomeExpenseData?.net || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                {formatMoney(incomeExpenseData?.net)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Payable Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Receipt className="h-5 w-5 text-primary" />
                                    Tình hình công nợ
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loadingPayable || loadingAR ? (
                                    <div className="space-y-3">
                                        <Skeleton className="h-10 w-full" />
                                        <Skeleton className="h-10 w-full" />
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-green-600" />
                                                <span>Phải thu</span>
                                            </div>
                                            <span className="font-bold text-green-600">
                                                {formatMoney(arSummary?.total_receivable || 0)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <TrendingDown className="h-4 w-4 text-red-600" />
                                                <span>Phải trả</span>
                                            </div>
                                            <span className="font-bold text-red-600">
                                                {formatMoney(payableData?.total_payable || 0)}
                                            </span>
                                        </div>
                                        {(arSummary?.total_overdue || 0) > 0 && (
                                            <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200">
                                                <div className="flex items-center gap-2">
                                                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                                    <span className="text-yellow-800">Quá hạn</span>
                                                </div>
                                                <span className="font-bold text-yellow-700">
                                                    {formatMoney(arSummary?.total_overdue || 0)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Low Stock Warning */}
                    {inventoryData?.low_stock_items && inventoryData.low_stock_items.length > 0 && (
                        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20/50">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2 text-yellow-800">
                                    <AlertTriangle className="h-5 w-5" />
                                    Sản phẩm tồn kho thấp
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {inventoryData.low_stock_items.slice(0, 6).map((item) => (
                                        <div
                                            key={item.product_id}
                                            className="flex items-center justify-between p-3 bg-card rounded-lg border"
                                        >
                                            <div>
                                                <div className="font-medium">{item.product_name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    Tối thiểu: {item.min_stock} {item.base_unit}
                                                </div>
                                            </div>
                                            <Badge className="bg-red-100 text-red-800">
                                                {item.current_stock} {item.base_unit}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Income/Expense Tab */}
                <TabsContent value="income-expense" className="mt-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Báo cáo Thu Chi</CardTitle>
                                <CardDescription>
                                    {format(new Date(dateRange.start_date), 'dd/MM/yyyy', { locale: vi })} - {format(new Date(dateRange.end_date), 'dd/MM/yyyy', { locale: vi })}
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Link href="/giao-dich">
                                    <Button variant="outline">
                                        <ChevronRight className="h-4 w-4 mr-2" />
                                        Chi tiết
                                    </Button>
                                </Link>
                                <Button variant="outline" onClick={() => handleExport('income-expense')}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Xuất Excel
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loadingIncomeExpense ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-24 w-full" />
                                    <Skeleton className="h-64 w-full" />
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Summary */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                                            <div className="text-sm text-muted-foreground">Tổng thu</div>
                                            <div className="text-2xl font-bold text-green-600">
                                                {formatMoney(incomeExpenseData?.total_income)}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                                            <div className="text-sm text-muted-foreground">Tổng chi</div>
                                            <div className="text-2xl font-bold text-red-600">
                                                {formatMoney(incomeExpenseData?.total_expense)}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                                            <div className="text-sm text-muted-foreground">Chênh lệch</div>
                                            <div className={`text-2xl font-bold ${(incomeExpenseData?.net || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                {formatMoney(incomeExpenseData?.net)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* By Category */}
                                    {incomeExpenseData?.by_category && incomeExpenseData.by_category.length > 0 && (
                                        <div>
                                            <h4 className="font-medium mb-3">Theo danh mục</h4>
                                            <div className="space-y-2">
                                                {incomeExpenseData.by_category.map((cat, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded">
                                                        <span>{cat.category || 'Không phân loại'}</span>
                                                        <div className="flex gap-4">
                                                            <span className="text-green-600">+{formatMoney(cat.income)}</span>
                                                            <span className="text-red-600">-{formatMoney(cat.expense)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* By Payment Method */}
                                    {incomeExpenseData?.by_payment_method && incomeExpenseData.by_payment_method.length > 0 && (
                                        <div>
                                            <h4 className="font-medium mb-3">Theo phương thức thanh toán</h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {incomeExpenseData.by_payment_method.map((method, idx) => (
                                                    <div key={idx} className="p-3 bg-muted rounded text-center">
                                                        <div className="text-sm text-muted-foreground">
                                                            {method.payment_method === 'CASH' ? 'Tiền mặt' :
                                                                method.payment_method === 'BANK_TRANSFER' ? 'Chuyển khoản' :
                                                                    method.payment_method === 'CREDIT' ? 'Ghi nợ' : method.payment_method}
                                                        </div>
                                                        <div className="font-bold">{formatMoney(method.amount)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Inventory Tab */}
                <TabsContent value="inventory" className="mt-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Báo cáo Tồn kho</CardTitle>
                                <CardDescription>Tình hình tồn kho hiện tại</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="default" asChild>
                                    <a href="/bao-cao/kho">
                                        <ChevronRight className="h-4 w-4 mr-1" />
                                        Báo cáo chi tiết
                                    </a>
                                </Button>
                                <Button variant="outline" onClick={() => handleExport('inventory')}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Xuất Excel
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loadingInventory ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-24 w-full" />
                                    <Skeleton className="h-64 w-full" />
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Summary */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                                            <div className="text-sm text-muted-foreground">Tổng giá trị</div>
                                            <div className="text-2xl font-bold text-blue-600">
                                                {formatMoney(inventoryData?.total_value)}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-muted rounded-lg text-center">
                                            <div className="text-sm text-muted-foreground">Số sản phẩm</div>
                                            <div className="text-2xl font-bold text-foreground">
                                                {inventoryData?.total_products || 0}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
                                            <div className="text-sm text-muted-foreground">Tồn kho thấp</div>
                                            <div className="text-2xl font-bold text-yellow-600">
                                                {inventoryData?.low_stock_count || 0}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Items Table */}
                                    {inventoryData?.items && inventoryData.items.length > 0 && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-muted border-b">
                                                    <tr>
                                                        <th className="text-left p-3 font-medium text-muted-foreground">Sản phẩm</th>
                                                        <th className="text-right p-3 font-medium text-muted-foreground">Tồn kho</th>
                                                        <th className="text-right p-3 font-medium text-muted-foreground">Giá vốn TB</th>
                                                        <th className="text-right p-3 font-medium text-muted-foreground">Giá trị</th>
                                                        <th className="text-center p-3 font-medium text-muted-foreground">Trạng thái</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {inventoryData.items.map((item) => (
                                                        <tr key={item.product_id} className="hover:bg-muted">
                                                            <td className="p-3">
                                                                <div className="font-medium">{item.product_name}</div>
                                                                <div className="text-sm text-muted-foreground">{item.category || 'Không phân loại'}</div>
                                                            </td>
                                                            <td className="p-3 text-right">
                                                                {item.current_stock} {item.base_unit}
                                                            </td>
                                                            <td className="p-3 text-right">
                                                                {formatMoney(item.avg_cost)}
                                                            </td>
                                                            <td className="p-3 text-right font-medium">
                                                                {formatMoney(item.value)}
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                {item.current_stock <= (item.min_stock || 0) ? (
                                                                    <Badge className="bg-red-100 text-red-800">Thấp</Badge>
                                                                ) : (
                                                                    <Badge className="bg-green-100 text-green-800">Đủ</Badge>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Payable Tab */}
                <TabsContent value="payable" className="mt-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Báo cáo Công nợ</CardTitle>
                                <CardDescription>Phân tích tuổi nợ (Aging)</CardDescription>
                            </div>
                            <Button variant="outline" onClick={() => handleExport('payable')}>
                                <Download className="h-4 w-4 mr-2" />
                                Xuất Excel
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {loadingPayable || loadingAR ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-24 w-full" />
                                    <Skeleton className="h-64 w-full" />
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Summary */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                                            <div className="text-sm text-muted-foreground">Phải thu</div>
                                            <div className="text-xl font-bold text-green-600">
                                                {formatMoney(arSummary?.total_receivable || 0)}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                                            <div className="text-sm text-muted-foreground">Phải trả</div>
                                            <div className="text-xl font-bold text-red-600">
                                                {formatMoney(payableData?.total_payable || 0)}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
                                            <div className="text-sm text-muted-foreground">Tổng quá hạn</div>
                                            <div className="text-xl font-bold text-yellow-600">
                                                {formatMoney(arSummary?.total_overdue || 0)}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                                            <div className="text-sm text-muted-foreground">Số KH có nợ</div>
                                            <div className="text-xl font-bold text-blue-600">
                                                {arSummary?.total_customers_with_debt || 0}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Navigation */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t">
                                        <Link href="/cong-no/phai-thu">
                                            <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                                                <TrendingUp className="h-5 w-5 text-green-600" />
                                                <div className="text-left">
                                                    <div className="font-medium">Công nợ phải thu</div>
                                                    <div className="text-xs text-muted-foreground">Thu tiền khách hàng</div>
                                                </div>
                                                <ChevronRight className="h-4 w-4 ml-auto" />
                                            </Button>
                                        </Link>
                                        <Link href="/cong-no/phai-tra">
                                            <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                                                <TrendingDown className="h-5 w-5 text-red-600" />
                                                <div className="text-left">
                                                    <div className="font-medium">Công nợ phải trả</div>
                                                    <div className="text-xs text-muted-foreground">Trả tiền NCC</div>
                                                </div>
                                                <ChevronRight className="h-4 w-4 ml-auto" />
                                            </Button>
                                        </Link>
                                        <Link href="/cong-no/phai-tra/lich-thanh-toan">
                                            <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                                                <Calendar className="h-5 w-5 text-blue-600" />
                                                <div className="text-left">
                                                    <div className="font-medium">Lịch thanh toán</div>
                                                    <div className="text-xs text-muted-foreground">Payment Schedule</div>
                                                </div>
                                                <ChevronRight className="h-4 w-4 ml-auto" />
                                            </Button>
                                        </Link>
                                        <Link href="/bao-cao/cong-no">
                                            <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                                                <Clock className="h-5 w-5 text-yellow-600" />
                                                <div className="text-left">
                                                    <div className="font-medium">Báo cáo tuổi nợ</div>
                                                    <div className="text-xs text-muted-foreground">Aging Report</div>
                                                </div>
                                                <ChevronRight className="h-4 w-4 ml-auto" />
                                            </Button>
                                        </Link>
                                    </div>

                                    {/* Aging Analysis */}
                                    {payableData?.aging && (
                                        <div>
                                            <h4 className="font-medium mb-3">Phân tích tuổi nợ</h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                        Trong hạn
                                                    </div>
                                                    <div className="text-lg font-bold text-green-600">
                                                        {formatMoney(payableData.aging.current)}
                                                    </div>
                                                </div>
                                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                                                        <Clock className="h-4 w-4 text-yellow-600" />
                                                        1-30 ngày
                                                    </div>
                                                    <div className="text-lg font-bold text-yellow-600">
                                                        {formatMoney(payableData.aging.days_1_30)}
                                                    </div>
                                                </div>
                                                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                                                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                                                        31-60 ngày
                                                    </div>
                                                    <div className="text-lg font-bold text-orange-600">
                                                        {formatMoney(payableData.aging.days_31_60)}
                                                    </div>
                                                </div>
                                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                                                        <AlertTriangle className="h-4 w-4 text-red-600" />
                                                        &gt;60 ngày
                                                    </div>
                                                    <div className="text-lg font-bold text-red-600">
                                                        {formatMoney(payableData.aging.days_over_60)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Partners List */}
                                    {payableData?.partners && payableData.partners.length > 0 && (
                                        <div>
                                            <h4 className="font-medium mb-3">Chi tiết theo đối tác</h4>
                                            <div className="overflow-x-auto">
                                                <table className="w-full">
                                                    <thead className="bg-muted border-b">
                                                        <tr>
                                                            <th className="text-left p-3 font-medium text-muted-foreground">Đối tác</th>
                                                            <th className="text-left p-3 font-medium text-muted-foreground">Loại</th>
                                                            <th className="text-right p-3 font-medium text-muted-foreground">Số dư nợ</th>
                                                            <th className="text-right p-3 font-medium text-muted-foreground">Quá hạn</th>
                                                            <th className="text-center p-3 font-medium text-muted-foreground">Trạng thái</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y">
                                                        {payableData.partners.map((partner) => (
                                                            <tr key={partner.partner_id} className="hover:bg-muted">
                                                                <td className="p-3">
                                                                    <div className="font-medium">{partner.partner_name}</div>
                                                                    <div className="text-sm text-muted-foreground">{partner.partner_code}</div>
                                                                </td>
                                                                <td className="p-3">
                                                                    <Badge className={partner.partner_type === 'CUSTOMER' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}>
                                                                        {partner.partner_type === 'CUSTOMER' ? 'Khách hàng' : 'Nhà cung cấp'}
                                                                    </Badge>
                                                                </td>
                                                                <td className="p-3 text-right font-medium">
                                                                    {formatMoney(partner.balance)}
                                                                </td>
                                                                <td className="p-3 text-right text-red-600">
                                                                    {formatMoney(partner.overdue_balance)}
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    {partner.overdue_days > 0 ? (
                                                                        <Badge className="bg-red-100 text-red-800 gap-1">
                                                                            <AlertTriangle className="h-3 w-3" />
                                                                            {partner.overdue_days} ngày
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge className="bg-green-100 text-green-800">
                                                                            Trong hạn
                                                                        </Badge>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tax Tab */}
                <TabsContent value="tax" className="mt-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Báo cáo Thuế</CardTitle>
                                <CardDescription>Tổng hợp thuế GTGT, TNCN, TNDN</CardDescription>
                            </div>
                            <Button variant="default" asChild>
                                <a href="/bao-cao/thue">
                                    <ChevronRight className="h-4 w-4 mr-1" />
                                    Xem chi tiết
                                </a>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground">
                                <FileBarChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p className="text-lg font-medium">Báo cáo thuế chi tiết</p>
                                <p className="text-sm">Bấm "Xem chi tiết" để xem báo cáo thuế đầy đủ</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// Metric Card Component
interface MetricCardProps {
    title: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
    badge?: string;
    badgeColor?: string;
    isLoading?: boolean;
}

function MetricCard({
    title,
    value,
    icon: Icon,
    color,
    bgColor,
    badge,
    badgeColor = 'bg-muted text-foreground',
    isLoading,
}: MetricCardProps) {
    return (
        <Card className="overflow-hidden">
            <CardContent className="p-4">
                {isLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-8 w-32" />
                    </div>
                ) : (
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-sm text-muted-foreground">{title}</p>
                            <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
                            {badge && (
                                <Badge className={`mt-2 ${badgeColor}`}>{badge}</Badge>
                            )}
                        </div>
                        <div className={`p-2 rounded-lg ${bgColor}`}>
                            <Icon className={`h-5 w-5 ${color}`} />
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
