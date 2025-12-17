// src/app/(dashboard)/bao-cao/tai-chinh/page.tsx
// Financial Statements Dashboard - Balance Sheet & Income Statement
// Task 11 Phase 3

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, FileSpreadsheet, CheckCircle2, XCircle, TrendingUp, TrendingDown } from 'lucide-react';
import type { BalanceSheet, IncomeStatement } from '@/services/financial-statement.service';

// ==========================================
// COMPONENT
// ==========================================

export default function FinancialStatementsPage() {
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear.toString());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
    const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null);

    // Generate year options (last 5 years)
    const yearOptions = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

    // Fetch data
    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/reports/financial-statements?year=${selectedYear}`);
                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error || 'Failed to fetch data');
                }

                setBalanceSheet(result.data.balance_sheet);
                setIncomeStatement(result.data.income_statement);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [selectedYear]);

    // Export handlers
    const handleExportBalanceSheet = () => {
        window.open(`/api/reports/balance-sheet/excel?date=${selectedYear}-12-31`, '_blank');
    };

    const handleExportIncomeStatement = () => {
        window.open(`/api/reports/income-statement/excel?from=${selectedYear}-01-01&to=${selectedYear}-12-31`, '_blank');
    };

    return (
        <div className="container mx-auto p-4 space-y-6 pb-24">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold">📊 Báo cáo tài chính</h1>
                    <p className="text-muted-foreground">
                        Bảng cân đối kế toán và Báo cáo kết quả kinh doanh
                    </p>
                </div>

                <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Chọn năm" />
                    </SelectTrigger>
                    <SelectContent>
                        {yearOptions.map((year) => (
                            <SelectItem key={year} value={year}>
                                Năm {year}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Error Alert */}
            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Loading State */}
            {loading ? (
                <div className="grid gap-6 md:grid-cols-2">
                    <Skeleton className="h-[400px]" />
                    <Skeleton className="h-[400px]" />
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Balance Sheet Card */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div>
                                <CardTitle className="text-lg">Bảng cân đối kế toán</CardTitle>
                                <CardDescription>
                                    Tại ngày 31/12/{selectedYear}
                                </CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportBalanceSheet}
                            >
                                <FileSpreadsheet className="h-4 w-4 mr-2" />
                                Xuất Excel
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {balanceSheet && (
                                <>
                                    {/* Assets Section */}
                                    <div className="space-y-2">
                                        <h3 className="font-semibold text-green-600">TÀI SẢN</h3>
                                        <div className="pl-4 space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span>{balanceSheet.assets.current.label}</span>
                                                <span className="font-medium">
                                                    {formatMoney(balanceSheet.assets.current.amount)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>{balanceSheet.assets.fixed.label}</span>
                                                <span className="font-medium">
                                                    {formatMoney(balanceSheet.assets.fixed.amount)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between font-bold border-t pt-1">
                                            <span>Tổng tài sản</span>
                                            <span className="text-green-600">
                                                {formatMoney(balanceSheet.total_assets)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Liabilities & Equity Section */}
                                    <div className="space-y-2">
                                        <h3 className="font-semibold text-blue-600">NGUỒN VỐN</h3>
                                        <div className="pl-4 space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span>{balanceSheet.liabilities.current.label}</span>
                                                <span className="font-medium">
                                                    {formatMoney(balanceSheet.liabilities.current.amount)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Vốn chủ sở hữu</span>
                                                <span className="font-medium">
                                                    {formatMoney(balanceSheet.equity.total)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between font-bold border-t pt-1">
                                            <span>Tổng nguồn vốn</span>
                                            <span className="text-blue-600">
                                                {formatMoney(balanceSheet.total_liabilities_equity)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Balance Check */}
                                    <div className={`flex items-center gap-2 p-2 rounded-lg ${balanceSheet.is_balanced
                                            ? 'bg-green-50 text-green-700'
                                            : 'bg-red-50 text-red-700'
                                        }`}>
                                        {balanceSheet.is_balanced ? (
                                            <>
                                                <CheckCircle2 className="h-5 w-5" />
                                                <span className="font-medium">✅ CÂN ĐỐI</span>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="h-5 w-5" />
                                                <span className="font-medium">❌ KHÔNG CÂN ĐỐI</span>
                                            </>
                                        )}
                                    </div>

                                    {/* YoY Comparison */}
                                    {balanceSheet.comparison && (
                                        <div className="text-sm text-muted-foreground">
                                            So với năm trước: {' '}
                                            <span className={
                                                balanceSheet.comparison.assets_change_percent >= 0
                                                    ? 'text-green-600'
                                                    : 'text-red-600'
                                            }>
                                                {balanceSheet.comparison.assets_change_percent >= 0 ? '+' : ''}
                                                {balanceSheet.comparison.assets_change_percent.toFixed(1)}%
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Income Statement Card */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div>
                                <CardTitle className="text-lg">Báo cáo kết quả kinh doanh</CardTitle>
                                <CardDescription>
                                    Từ 01/01/{selectedYear} đến 31/12/{selectedYear}
                                </CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportIncomeStatement}
                            >
                                <FileSpreadsheet className="h-4 w-4 mr-2" />
                                Xuất Excel
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {incomeStatement && (
                                <>
                                    {/* Revenue */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span>Doanh thu</span>
                                            <span className="font-medium text-green-600">
                                                {formatMoney(incomeStatement.revenue.total)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span>Giá vốn hàng bán</span>
                                            <span className="font-medium text-red-600">
                                                -{formatMoney(incomeStatement.cost_of_goods_sold)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Gross Profit */}
                                    <div className="flex justify-between border-t pt-2">
                                        <span className="font-semibold">Lợi nhuận gộp</span>
                                        <span className={`font-bold ${incomeStatement.gross_profit >= 0
                                                ? 'text-green-600'
                                                : 'text-red-600'
                                            }`}>
                                            {formatMoney(incomeStatement.gross_profit)}
                                        </span>
                                    </div>

                                    {/* Operating Expenses */}
                                    <div className="flex justify-between text-sm">
                                        <span>Chi phí hoạt động</span>
                                        <span className="font-medium text-red-600">
                                            -{formatMoney(incomeStatement.operating_expenses.total)}
                                        </span>
                                    </div>

                                    {/* Operating Income */}
                                    <div className="flex justify-between border-t pt-2">
                                        <span className="font-semibold">Lợi nhuận hoạt động</span>
                                        <span className={`font-bold ${incomeStatement.operating_income >= 0
                                                ? 'text-green-600'
                                                : 'text-red-600'
                                            }`}>
                                            {formatMoney(incomeStatement.operating_income)}
                                        </span>
                                    </div>

                                    {/* Tax */}
                                    <div className="flex justify-between text-sm">
                                        <span>Thuế TNDN</span>
                                        <span className="font-medium text-red-600">
                                            -{formatMoney(incomeStatement.tax)}
                                        </span>
                                    </div>

                                    {/* Net Profit */}
                                    <div className="flex justify-between border-t pt-2 bg-slate-50 p-2 rounded-lg">
                                        <span className="font-bold">LỢI NHUẬN SAU THUẾ</span>
                                        <span className={`font-bold text-lg ${incomeStatement.net_profit >= 0
                                                ? 'text-green-600'
                                                : 'text-red-600'
                                            }`}>
                                            {formatMoney(incomeStatement.net_profit)}
                                        </span>
                                    </div>

                                    {/* Ratios */}
                                    <div className="grid grid-cols-3 gap-2 text-xs text-center">
                                        <div className="p-2 bg-slate-50 rounded">
                                            <div className="text-muted-foreground">Biên lợi nhuận gộp</div>
                                            <div className="font-semibold">{incomeStatement.ratios.gross_margin.toFixed(1)}%</div>
                                        </div>
                                        <div className="p-2 bg-slate-50 rounded">
                                            <div className="text-muted-foreground">Biên hoạt động</div>
                                            <div className="font-semibold">{incomeStatement.ratios.operating_margin.toFixed(1)}%</div>
                                        </div>
                                        <div className="p-2 bg-slate-50 rounded">
                                            <div className="text-muted-foreground">Biên lợi nhuận ròng</div>
                                            <div className="font-semibold">{incomeStatement.ratios.net_margin.toFixed(1)}%</div>
                                        </div>
                                    </div>

                                    {/* YoY Comparison */}
                                    {incomeStatement.comparison && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            So với kỳ trước: {' '}
                                            {incomeStatement.comparison.change_percent >= 0 ? (
                                                <TrendingUp className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <TrendingDown className="h-4 w-4 text-red-600" />
                                            )}
                                            <span className={
                                                incomeStatement.comparison.change_percent >= 0
                                                    ? 'text-green-600'
                                                    : 'text-red-600'
                                            }>
                                                {incomeStatement.comparison.change_percent >= 0 ? '+' : ''}
                                                {incomeStatement.comparison.change_percent.toFixed(1)}%
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function formatMoney(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
}
