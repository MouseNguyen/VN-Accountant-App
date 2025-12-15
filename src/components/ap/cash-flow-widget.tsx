// src/components/ap/cash-flow-widget.tsx
// Widget dự báo dòng tiền

'use client';

import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCashFlowForecast } from '@/hooks/use-ap';

// Format money
function formatMoney(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(value);
}

interface CashFlowWidgetProps {
    days?: number;
    className?: string;
}

export function CashFlowWidget({ days = 14, className = '' }: CashFlowWidgetProps) {
    const { data: forecast, isLoading, error } = useCashFlowForecast(days);

    if (isLoading) {
        return (
            <Card className={className}>
                <CardHeader className="pb-2">
                    <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error || !forecast) {
        return (
            <Card className={className}>
                <CardContent className="p-4 text-center text-muted-foreground">
                    <p className="text-sm">Không thể tải dự báo dòng tiền</p>
                </CardContent>
            </Card>
        );
    }

    const hasWarning = forecast.summary.days_with_negative_balance > 0;

    return (
        <Card className={`${className} ${hasWarning ? 'border-red-500' : ''}`}>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    💹 Dự báo dòng tiền
                    {hasWarning && <AlertTriangle className="w-4 h-4 text-red-500" />}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Số dư hiện tại:</span>
                    <span className="font-bold">{formatMoney(forecast.current_balance)}</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-green-500" />
                        Dự kiến thu:
                    </span>
                    <span className="text-green-600">+{formatMoney(forecast.summary.total_expected_income)}</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                        <TrendingDown className="w-3 h-3 text-red-500" />
                        Dự kiến chi:
                    </span>
                    <span className="text-red-600">-{formatMoney(forecast.summary.total_expected_expense)}</span>
                </div>

                <hr />

                <div className="flex justify-between">
                    <span className="text-muted-foreground">Số dư thấp nhất:</span>
                    <span className={`font-bold ${forecast.summary.min_balance < 0 ? 'text-red-600' : ''}`}>
                        {formatMoney(forecast.summary.min_balance)}
                    </span>
                </div>

                {hasWarning && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-red-700 dark:text-red-300 text-sm">
                        ⚠️ Có {forecast.summary.days_with_negative_balance} ngày số dư âm trong {days} ngày tới
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Detailed Cash Flow component with daily breakdown
export function CashFlowChart({ days = 14 }: { days?: number }) {
    const { data: forecast, isLoading } = useCashFlowForecast(days);

    if (isLoading) {
        return <Skeleton className="h-40 w-full" />;
    }

    if (!forecast) return null;

    // Find max value for scaling
    const maxValue = Math.max(
        ...forecast.daily_forecast.map((d) => Math.max(d.closing_balance, d.expected_income, d.expected_expense)),
        1
    );

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded" /> Thu
                </span>
                <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-500 rounded" /> Chi
                </span>
                <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-500 rounded" /> Số dư
                </span>
            </div>

            <div className="flex gap-1 h-32 items-end">
                {forecast.daily_forecast.slice(0, 14).map((day, index) => {
                    const incomeHeight = (day.expected_income / maxValue) * 100;
                    const expenseHeight = (day.expected_expense / maxValue) * 100;
                    const balanceHeight = Math.max(0, (day.closing_balance / maxValue) * 100);

                    return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full flex gap-0.5 h-24 items-end">
                                {day.expected_income > 0 && (
                                    <div
                                        className="flex-1 bg-green-500 rounded-t"
                                        style={{ height: `${incomeHeight}%` }}
                                    />
                                )}
                                {day.expected_expense > 0 && (
                                    <div
                                        className="flex-1 bg-red-500 rounded-t"
                                        style={{ height: `${expenseHeight}%` }}
                                    />
                                )}
                                {day.expected_income === 0 && day.expected_expense === 0 && (
                                    <div className="flex-1 bg-muted rounded-t" style={{ height: '2px' }} />
                                )}
                            </div>
                            <span
                                className={`text-[10px] ${day.is_negative ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}
                            >
                                {new Date(day.date).getDate()}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default CashFlowWidget;
