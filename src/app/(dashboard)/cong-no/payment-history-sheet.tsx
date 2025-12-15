// src/app/(dashboard)/cong-no/payment-history-sheet.tsx
// Sheet hiển thị lịch sử thanh toán

'use client';

import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    History,
    Receipt,
    Wallet,
    Building2,
    Calendar,
    ChevronRight,
} from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePaymentHistory } from '@/hooks/use-payables';

// Payment method icons
const PAYMENT_METHOD_ICONS = {
    CASH: Wallet,
    BANK_TRANSFER: Building2,
};

const PAYMENT_METHOD_LABELS = {
    CASH: 'Tiền mặt',
    BANK_TRANSFER: 'Chuyển khoản',
};

interface PaymentHistorySheetProps {
    open: boolean;
    onClose: () => void;
    partnerId: string;
    partnerName: string;
}

export function PaymentHistorySheet({
    open,
    onClose,
    partnerId,
    partnerName,
}: PaymentHistorySheetProps) {
    const { data: historyData, isLoading } = usePaymentHistory(
        { partner_id: partnerId, limit: 50 },
        // Only fetch when sheet is open
    );

    const payments = historyData?.items || [];

    // Format money
    const formatMoney = (value: number | string) => {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(num);
    };

    // Format date
    const formatDate = (date: string | Date) => {
        return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: vi });
    };

    return (
        <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <History className="h-5 w-5 text-primary" />
                        Lịch sử thanh toán
                    </SheetTitle>
                    <SheetDescription>{partnerName}</SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-4">
                    {isLoading ? (
                        // Loading skeleton
                        Array.from({ length: 3 }).map((_, i) => (
                            <Card key={i}>
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <Skeleton className="h-5 w-32" />
                                        <Skeleton className="h-6 w-24" />
                                    </div>
                                    <Skeleton className="h-4 w-48 mb-2" />
                                    <Skeleton className="h-4 w-32" />
                                </CardContent>
                            </Card>
                        ))
                    ) : payments.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-4xl mb-4">📭</div>
                            <div className="text-muted-foreground">Chưa có lịch sử thanh toán</div>
                        </div>
                    ) : (
                        payments.map((payment) => {
                            const MethodIcon =
                                PAYMENT_METHOD_ICONS[payment.payment_method as keyof typeof PAYMENT_METHOD_ICONS] || Receipt;

                            return (
                                <Card key={payment.id} className="overflow-hidden">
                                    <CardContent className="p-4">
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-primary/10 rounded-lg">
                                                    <MethodIcon className="h-4 w-4 text-primary" />
                                                </div>
                                                <div>
                                                    <div className="font-medium">
                                                        {PAYMENT_METHOD_LABELS[payment.payment_method as keyof typeof PAYMENT_METHOD_LABELS] || payment.payment_method}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {formatDate(payment.payment_date)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-green-600">
                                                    {formatMoney(payment.amount)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Allocations */}
                                        {payment.allocations && payment.allocations.length > 0 && (
                                            <div className="border-t pt-3 mt-3">
                                                <div className="text-xs text-muted-foreground mb-2">
                                                    Phân bổ cho {payment.allocations.length} hóa đơn:
                                                </div>
                                                <div className="space-y-2">
                                                    {payment.allocations.slice(0, 3).map((alloc, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="flex items-center justify-between text-sm bg-muted rounded px-3 py-2"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Receipt className="h-3 w-3 text-muted-foreground" />
                                                                <span className="font-mono text-xs">
                                                                    {alloc.transaction_code}
                                                                </span>
                                                            </div>
                                                            <span className="text-muted-foreground">
                                                                {formatMoney(alloc.amount)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {payment.allocations.length > 3 && (
                                                        <div className="text-xs text-muted-foreground text-center">
                                                            +{payment.allocations.length - 3} hóa đơn khác
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Notes */}
                                        {payment.note && (
                                            <div className="border-t pt-3 mt-3">
                                                <div className="text-sm text-muted-foreground italic">
                                                    &quot;{payment.note}&quot;
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
