// src/app/(dashboard)/cong-no/phai-tra/lich-thanh-toan/page.tsx
// Trang Lịch thanh toán NCC

'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    ArrowLeft,
    Calendar,
    AlertTriangle,
    Clock,
    CalendarDays,
    CalendarClock,
    BadgeAlert,
    ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePaymentSchedule } from '@/hooks/use-ap';
import type { PaymentScheduleItem } from '@/types/ap';

// Format money
function formatMoney(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(value);
}

// Priority badge
function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
    const config = {
        high: { label: 'Khẩn cấp', variant: 'destructive' as const, icon: BadgeAlert },
        medium: { label: 'Sớm', variant: 'secondary' as const, icon: Clock },
        low: { label: 'Bình thường', variant: 'outline' as const, icon: Calendar },
    };

    const { label, variant, icon: Icon } = config[priority];

    return (
        <Badge variant={variant} className="text-xs">
            <Icon className="w-3 h-3 mr-1" />
            {label}
        </Badge>
    );
}

// Invoice item component
function InvoiceItem({ item }: { item: PaymentScheduleItem }) {
    return (
        <div className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="font-medium">{item.invoice_code}</span>
                        <PriorityBadge priority={item.priority} />
                    </div>
                    <p className="text-sm text-muted-foreground">{item.vendor_name}</p>
                    {item.due_date && (
                        <p className="text-xs text-muted-foreground">
                            Hạn: {format(new Date(item.due_date), 'dd/MM/yyyy', { locale: vi })}
                            {item.days_until_due < 0 && (
                                <span className="text-red-500 ml-1">
                                    (quá {Math.abs(item.days_until_due)} ngày)
                                </span>
                            )}
                            {item.days_until_due >= 0 && item.days_until_due <= 3 && (
                                <span className="text-orange-500 ml-1">
                                    (còn {item.days_until_due} ngày)
                                </span>
                            )}
                        </p>
                    )}
                </div>
                <div className="text-right">
                    <p className="font-bold text-red-600">{formatMoney(item.balance)}</p>
                    <p className="text-xs text-muted-foreground">
                        / {formatMoney(item.amount)}
                    </p>
                </div>
            </div>
        </div>
    );
}

// Schedule section
function ScheduleSection({
    title,
    icon: Icon,
    items,
    amount,
    variant = 'default',
}: {
    title: string;
    icon: React.ElementType;
    items: PaymentScheduleItem[];
    amount: number;
    variant?: 'danger' | 'warning' | 'default';
}) {
    const colors = {
        danger: 'border-red-500 bg-red-50 dark:bg-red-900/10',
        warning: 'border-orange-500 bg-orange-50 dark:bg-orange-900/10',
        default: '',
    };

    if (items.length === 0) return null;

    return (
        <Card className={colors[variant]}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${variant === 'danger' ? 'text-red-500' : variant === 'warning' ? 'text-orange-500' : ''}`} />
                        {title}
                        <Badge variant="secondary">{items.length}</Badge>
                    </CardTitle>
                    <span className={`font-bold ${variant === 'danger' ? 'text-red-600' : ''}`}>
                        {formatMoney(amount)}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                {items.map((item) => (
                    <InvoiceItem key={item.invoice_id} item={item} />
                ))}
            </CardContent>
        </Card>
    );
}

export default function LichThanhToanPage() {
    const { data: schedule, isLoading } = usePaymentSchedule();

    if (isLoading) {
        return (
            <div className="p-4 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }

    // Safe access to summary with defaults
    const summary = schedule?.summary || {
        overdue_amount: 0,
        this_week_amount: 0,
        next_week_amount: 0,
        this_month_amount: 0,
    };

    const totalDue =
        (summary.overdue_amount || 0) +
        (summary.this_week_amount || 0) +
        (summary.next_week_amount || 0) +
        (summary.this_month_amount || 0);

    return (
        <div className="p-4 pb-20 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/bao-cao?tab=payable" className="p-2 hover:bg-muted rounded-lg">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold">Lịch thanh toán</h1>
                    <p className="text-sm text-muted-foreground">
                        Tổng cần thanh toán: <span className="font-bold text-red-600">{formatMoney(totalDue)}</span>
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
                <Card className={summary.overdue_amount ? 'border-red-500' : ''}>
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <span className="text-xs">Quá hạn</span>
                        </div>
                        <p className="text-lg font-bold text-red-600">
                            {formatMoney(summary.overdue_amount || 0)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Calendar className="w-4 h-4 text-orange-500" />
                            <span className="text-xs">Tuần này</span>
                        </div>
                        <p className="text-lg font-bold">
                            {formatMoney(summary.this_week_amount || 0)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <CalendarDays className="w-4 h-4" />
                            <span className="text-xs">Tuần sau</span>
                        </div>
                        <p className="text-lg font-bold">
                            {formatMoney(summary.next_week_amount || 0)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <CalendarClock className="w-4 h-4" />
                            <span className="text-xs">Tháng này</span>
                        </div>
                        <p className="text-lg font-bold">
                            {formatMoney(summary.this_month_amount || 0)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Schedule Sections */}
            <div className="space-y-4">
                <ScheduleSection
                    title="Quá hạn"
                    icon={AlertTriangle}
                    items={schedule?.overdue || []}
                    amount={summary.overdue_amount || 0}
                    variant="danger"
                />

                <ScheduleSection
                    title="Tuần này"
                    icon={Calendar}
                    items={schedule?.this_week || []}
                    amount={summary.this_week_amount || 0}
                    variant="warning"
                />

                <ScheduleSection
                    title="Tuần sau"
                    icon={CalendarDays}
                    items={schedule?.next_week || []}
                    amount={summary.next_week_amount || 0}
                />

                <ScheduleSection
                    title="Tháng này"
                    icon={CalendarClock}
                    items={schedule?.this_month || []}
                    amount={summary.this_month_amount || 0}
                />

                {schedule?.later && schedule.later.length > 0 && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Sau này
                                <Badge variant="secondary">{schedule.later.length}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                {schedule.later.length} hóa đơn với tổng {formatMoney(
                                    schedule.later.reduce((sum, i) => sum + i.balance, 0)
                                )}
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Empty State */}
            {!schedule?.overdue?.length &&
                !schedule?.this_week?.length &&
                !schedule?.next_week?.length &&
                !schedule?.this_month?.length && (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="font-medium">Không có hóa đơn cần thanh toán</p>
                            <p className="text-sm">Tất cả công nợ đã được thanh toán!</p>
                        </CardContent>
                    </Card>
                )}

            {/* Action Button */}
            <Link href="/cong-no/phai-tra/tra-tien">
                <Button className="w-full h-12">
                    <ChevronRight className="w-4 h-4 mr-2" />
                    Thanh toán ngay
                </Button>
            </Link>
        </div>
    );
}
