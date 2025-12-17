// src/components/dashboard/kpi-card.tsx
// KPI Card Component - Phase 4 Task 8

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: number; // percentage, positive = up, negative = down
    icon?: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'danger';
    className?: string;
}

export function KPICard({
    title,
    value,
    subtitle,
    trend,
    icon,
    variant = 'default',
    className,
}: KPICardProps) {
    const variantStyles = {
        default: 'bg-card',
        success: 'bg-green-50 dark:bg-green-950/20',
        warning: 'bg-yellow-50 dark:bg-yellow-950/20',
        danger: 'bg-red-50 dark:bg-red-950/20',
    };

    const trendColor = trend && trend > 0
        ? 'text-green-600'
        : trend && trend < 0
            ? 'text-red-600'
            : 'text-gray-500';

    const TrendIcon = trend && trend > 0
        ? TrendingUp
        : trend && trend < 0
            ? TrendingDown
            : Minus;

    return (
        <Card className={cn(variantStyles[variant], className)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-bold">{value}</div>
                    {trend !== undefined && (
                        <div className={cn('flex items-center text-sm', trendColor)}>
                            <TrendIcon className="h-4 w-4 mr-1" />
                            {Math.abs(trend).toFixed(1)}%
                        </div>
                    )}
                </div>
                {subtitle && (
                    <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
                )}
            </CardContent>
        </Card>
    );
}

// Format number as currency
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(value);
}

// Format number with suffix (K, M, B)
export function formatCompact(value: number): string {
    if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
    if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
    if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
    return value.toFixed(0);
}
