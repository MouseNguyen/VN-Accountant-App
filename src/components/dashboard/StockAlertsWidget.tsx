// src/components/dashboard/StockAlertsWidget.tsx
// Widget cảnh báo kho cho Dashboard

'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, TrendingDown, ArrowUpCircle } from 'lucide-react';
import Link from 'next/link';
import type { StockAlert } from '@/types/stock-reports';

export function StockAlertsWidget() {
    const { data, isLoading } = useQuery({
        queryKey: ['stock-alerts'],
        queryFn: async () => {
            const res = await fetch('/api/alerts/stock');
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        },
        refetchInterval: 5 * 60 * 1000,  // 5 phút
        staleTime: 60 * 1000,  // 1 phút
    });

    const alerts: StockAlert[] = data?.items?.slice(0, 5) || [];
    const counts = data?.counts;

    if (isLoading) {
        return (
            <Card className="border-yellow-500/50 animate-pulse">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        Cảnh báo kho
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-24" />
            </Card>
        );
    }

    if (!alerts.length) {
        return (
            <Card className="border-green-500/50">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Package className="w-5 h-5 text-green-500" />
                        Kho hàng
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">✅ Không có cảnh báo kho</p>
                </CardContent>
            </Card>
        );
    }

    const getAlertIcon = (type: string) => {
        switch (type) {
            case 'OUT_OF_STOCK':
                return <Package className="w-4 h-4 text-red-500" />;
            case 'LOW_STOCK':
                return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
            case 'OVER_STOCK':
                return <ArrowUpCircle className="w-4 h-4 text-blue-500" />;
            case 'SLOW_MOVING':
                return <TrendingDown className="w-4 h-4 text-muted-foreground" />;
            default:
                return <AlertTriangle className="w-4 h-4" />;
        }
    };

    const getSeverityBg = (severity: string) => {
        switch (severity) {
            case 'error': return 'bg-red-50 hover:bg-red-100 dark:bg-red-950/30';
            case 'warning': return 'bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-950/30';
            default: return 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30';
        }
    };

    return (
        <Card className="border-yellow-500/50">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    Cảnh báo kho
                    {counts?.total > 0 && (
                        <Badge variant="destructive">{counts.total}</Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {alerts.map((alert) => (
                    <Link
                        key={alert.id}
                        href={`/kho/${alert.product_id}`}
                        className="block"
                    >
                        <div className={`
              flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors
              ${getSeverityBg(alert.severity)}
            `}>
                            {getAlertIcon(alert.type)}

                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                    {alert.product_name}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                    {alert.message}
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}

                {counts && counts.total > 5 && (
                    <Link
                        href="/kho?filter=alert"
                        className="block text-center text-sm text-primary hover:underline pt-2"
                    >
                        Xem tất cả {counts.total} cảnh báo →
                    </Link>
                )}
            </CardContent>
        </Card>
    );
}
