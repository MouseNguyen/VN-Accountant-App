'use client';

// src/app/(dashboard)/financial/page.tsx
// Financial Dashboard Page - Phase 4 Tasks 7-8-9

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KPICard, formatCurrency, formatCompact } from '@/components/dashboard/kpi-card';
import {
    RevenueTrendChart,
    ARAgingPieChart,
    TopCustomersChart,
    CashForecastChart,
} from '@/components/dashboard/trend-chart';
import {
    useCashForecast,
    useFinancialKPIs,
    useChartData,
} from '@/hooks/use-financial-reports';
import { exportToPDF, formatDateForPDF } from '@/lib/pdf-export';
import { useToast } from '@/hooks/use-toast';
import {
    DollarSign,
    TrendingUp,
    Wallet,
    Users,
    FileText,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    Download,
    Loader2,
} from 'lucide-react';

export default function FinancialDashboardPage() {
    const { data: kpis, isLoading: kpisLoading } = useFinancialKPIs();
    const { data: forecast, isLoading: forecastLoading } = useCashForecast(30);
    const { data: chartData, isLoading: chartsLoading } = useChartData('all');
    const [isExporting, setIsExporting] = useState(false);
    const { toast } = useToast();

    const isLoading = kpisLoading || forecastLoading || chartsLoading;

    const handleExportPDF = async () => {
        setIsExporting(true);
        try {
            await exportToPDF('financial-report', {
                filename: `Bao_cao_tai_chinh_${new Date().toISOString().split('T')[0]}.pdf`,
                orientation: 'portrait',
            });
            toast({ title: 'Xuất PDF thành công!' });
        } catch (error) {
            toast({ title: 'Lỗi xuất PDF', variant: 'destructive' });
        } finally {
            setIsExporting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6" id="financial-report">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold">Báo cáo Tài chính</h1>
                    <p className="text-muted-foreground">
                        Tổng quan tình hình tài chính doanh nghiệp - {formatDateForPDF()}
                    </p>
                </div>
                <Button
                    variant="outline"
                    className="gap-2"
                    onClick={handleExportPDF}
                    disabled={isExporting}
                >
                    {isExporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Download className="h-4 w-4" />
                    )}
                    Xuất PDF
                </Button>
            </div>

            {/* KPI Cards Row 1 - Revenue & Expenses */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard
                    title="Doanh thu tháng này"
                    value={formatCompact(kpis?.revenue_mtd || 0)}
                    subtitle={`Năm: ${formatCompact(kpis?.revenue_ytd || 0)}`}
                    trend={kpis?.revenue_growth_pct}
                    icon={<TrendingUp className="h-4 w-4 text-green-600" />}
                    variant="success"
                />
                <KPICard
                    title="Chi phí tháng này"
                    value={formatCompact(kpis?.expenses_mtd || 0)}
                    subtitle={`Năm: ${formatCompact(kpis?.expenses_ytd || 0)}`}
                    icon={<ArrowDownRight className="h-4 w-4 text-red-600" />}
                />
                <KPICard
                    title="Công nợ phải thu"
                    value={formatCompact(kpis?.ar_outstanding || 0)}
                    subtitle={`${kpis?.ar_invoice_count || 0} hóa đơn`}
                    icon={<ArrowUpRight className="h-4 w-4 text-blue-600" />}
                    variant={kpis?.ar_outstanding && kpis.ar_outstanding > 0 ? 'warning' : 'default'}
                />
                <KPICard
                    title="Công nợ phải trả"
                    value={formatCompact(kpis?.ap_outstanding || 0)}
                    subtitle={`${kpis?.ap_invoice_count || 0} hóa đơn`}
                    icon={<ArrowDownRight className="h-4 w-4 text-orange-600" />}
                />
            </div>

            {/* KPI Cards Row 2 - Cash & Ratios */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard
                    title="Tiền mặt"
                    value={formatCompact(kpis?.total_cash || 0)}
                    icon={<Wallet className="h-4 w-4 text-primary" />}
                    variant="success"
                />
                <KPICard
                    title="DSO"
                    value={`${kpis?.dso?.toFixed(1) || 0} ngày`}
                    subtitle="Kỳ thu hồi nợ TB"
                    icon={<Calendar className="h-4 w-4 text-blue-600" />}
                />
                <KPICard
                    title="DPO"
                    value={`${kpis?.dpo?.toFixed(1) || 0} ngày`}
                    subtitle="Kỳ thanh toán TB"
                    icon={<Calendar className="h-4 w-4 text-orange-600" />}
                />
                <KPICard
                    title="Biên LN gộp"
                    value={`${kpis?.gross_profit_margin?.toFixed(1) || 0}%`}
                    icon={<DollarSign className="h-4 w-4 text-green-600" />}
                    variant={kpis?.gross_profit_margin && kpis.gross_profit_margin > 20 ? 'success' : 'warning'}
                />
            </div>

            {/* Cash Flow Forecast */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Dự báo Dòng tiền 30 ngày
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-muted rounded-lg">
                            <div className="text-sm text-muted-foreground">Số dư hiện tại</div>
                            <div className="text-xl font-bold text-green-600">
                                {formatCompact(forecast?.total_opening || 0)}
                            </div>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                            <div className="text-sm text-muted-foreground">Dự kiến thu</div>
                            <div className="text-xl font-bold text-blue-600">
                                +{formatCompact(forecast?.total_expected_receipts || 0)}
                            </div>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                            <div className="text-sm text-muted-foreground">Dự kiến chi</div>
                            <div className="text-xl font-bold text-red-600">
                                -{formatCompact(forecast?.total_expected_payments || 0)}
                            </div>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                            <div className="text-sm text-muted-foreground">Số dư cuối kỳ</div>
                            <div className={`text-xl font-bold ${(forecast?.total_closing || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCompact(forecast?.total_closing || 0)}
                            </div>
                        </div>
                    </div>

                    {/* Forecast Table Preview */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="text-left p-2">Ngày</th>
                                    <th className="text-right p-2">Số dư đầu</th>
                                    <th className="text-right p-2">Thu dự kiến</th>
                                    <th className="text-right p-2">Chi dự kiến</th>
                                    <th className="text-right p-2">Số dư cuối</th>
                                </tr>
                            </thead>
                            <tbody>
                                {forecast?.daily_forecast?.slice(0, 7).map((day, idx) => (
                                    <tr key={idx} className="border-b hover:bg-muted/50">
                                        <td className="p-2">{day.date}</td>
                                        <td className="text-right p-2">{formatCompact(day.opening_balance)}</td>
                                        <td className="text-right p-2 text-green-600">
                                            {day.expected_receipts > 0 ? `+${formatCompact(day.expected_receipts)}` : '-'}
                                        </td>
                                        <td className="text-right p-2 text-red-600">
                                            {day.expected_payments > 0 ? `-${formatCompact(day.expected_payments)}` : '-'}
                                        </td>
                                        <td className={`text-right p-2 font-medium ${day.closing_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCompact(day.closing_balance)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* AR Aging & Top Customers */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* AR Aging Pie */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tuổi nợ phải thu (AR Aging)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {chartData?.ar_aging_pie && chartData.ar_aging_pie.length > 0 ? (
                            <ARAgingPieChart data={chartData.ar_aging_pie} />
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                Không có dữ liệu công nợ
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top Customers */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Top 10 Khách hàng
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {chartData?.top_customers?.map((customer, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between">
                                            <span className="truncate max-w-[150px]">{customer.customer_name}</span>
                                            <span className="font-medium">{formatCompact(customer.revenue)}</span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-2 mt-1">
                                            <div
                                                className="h-2 rounded-full bg-primary"
                                                style={{ width: `${customer.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-sm text-muted-foreground w-12 text-right">
                                        {customer.percentage.toFixed(1)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Revenue Trend Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Xu hướng Doanh thu & Chi phí (12 tháng)</CardTitle>
                </CardHeader>
                <CardContent>
                    {chartData?.revenue_trend && chartData.revenue_trend.length > 0 ? (
                        <RevenueTrendChart data={chartData.revenue_trend} />
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            Không có dữ liệu xu hướng
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Top Customers Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Top 10 Khách hàng (Biểu đồ)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {chartData?.top_customers && chartData.top_customers.length > 0 ? (
                        <TopCustomersChart data={chartData.top_customers} />
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            Không có dữ liệu khách hàng
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
