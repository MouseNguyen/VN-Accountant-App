'use client';

// src/app/(dashboard)/cong-no/phai-thu/[arId]/page.tsx
// Trang chi tiết công nợ

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Calendar,
    Clock,
    DollarSign,
    User,
    FileText,
    AlertTriangle,
    CheckCircle2,
    CreditCard,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/decimal';
import type { ARTransaction } from '@/types/ar';

async function fetchARTransaction(id: string): Promise<ARTransaction> {
    const res = await fetch(`/api/ar-transactions?limit=1`);
    const data = await res.json();
    // For detail, we need specific endpoint - using list as fallback
    const item = data.data?.items?.find((i: ARTransaction) => i.id === id);
    if (!item) throw new Error('Không tìm thấy công nợ');
    return item;
}

export default function ARDetailPage() {
    const params = useParams();
    const router = useRouter();
    const arId = params.arId as string;

    const { data: ar, isLoading, error } = useQuery({
        queryKey: ['ar-transaction', arId],
        queryFn: () => fetchARTransaction(arId),
        enabled: !!arId,
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-muted-foreground">Đang tải...</div>
            </div>
        );
    }

    if (error || !ar) {
        return (
            <div className="min-h-screen bg-background p-4">
                <div className="text-center py-8">
                    <p className="text-destructive mb-4">Không tìm thấy công nợ</p>
                    <Link href="/cong-no/phai-thu">
                        <Button variant="outline">Quay lại</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const statusConfig: Record<string, { color: string; label: string; icon: any }> = {
        UNPAID: { color: 'bg-yellow-500/10 text-yellow-600', label: 'Chưa thu', icon: Clock },
        PARTIAL: { color: 'bg-blue-500/10 text-blue-600', label: 'Thu một phần', icon: CreditCard },
        PAID: { color: 'bg-green-500/10 text-green-600', label: 'Đã thu đủ', icon: CheckCircle2 },
        OVERDUE: { color: 'bg-red-500/10 text-red-600', label: 'Quá hạn', icon: AlertTriangle },
        CANCELLED: { color: 'bg-gray-500/10 text-gray-600', label: 'Đã hủy', icon: FileText },
    };

    const status = statusConfig[ar.status] || statusConfig.UNPAID;
    const StatusIcon = status.icon;
    const progress = ar.amount > 0 ? (ar.paid_amount / ar.amount) * 100 : 0;

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-card border-b">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-lg font-bold">{ar.code}</h1>
                            <p className="text-xs text-muted-foreground">Chi tiết công nợ</p>
                        </div>
                    </div>
                    {ar.balance > 0 && (
                        <Link href={`/cong-no/phai-thu/thu-tien?customer_id=${ar.customer_id}`}>
                            <Button size="sm">
                                <DollarSign className="h-4 w-4 mr-1" />
                                Thu tiền
                            </Button>
                        </Link>
                    )}
                </div>
            </header>

            {/* Content */}
            <main className="p-4 max-w-2xl mx-auto space-y-4">
                {/* Status Card */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Badge variant="outline" className={`${status.color} text-sm px-3 py-1`}>
                                <StatusIcon className="h-4 w-4 mr-1" />
                                {status.label}
                            </Badge>
                            {ar.days_overdue > 0 && (
                                <span className="text-sm text-destructive font-medium">
                                    Quá hạn {ar.days_overdue} ngày
                                </span>
                            )}
                        </div>

                        {/* Amount Summary */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Tổng tiền</span>
                                <span className="font-bold text-xl">{formatMoney(ar.amount)}</span>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-1">
                                <div className="h-3 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all"
                                        style={{ width: `${Math.min(progress, 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Đã thu: {formatMoney(ar.paid_amount)}</span>
                                    <span>{progress.toFixed(0)}%</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t">
                                <span className="text-muted-foreground">Còn lại</span>
                                <span className="font-bold text-2xl text-primary">
                                    {formatMoney(ar.balance)}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Customer Info */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Khách hàng
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="font-medium text-lg">{ar.customer?.name}</div>
                        <div className="text-sm text-muted-foreground">{ar.customer?.code}</div>
                        {ar.customer?.phone && (
                            <div className="text-sm text-muted-foreground mt-1">
                                📞 {ar.customer.phone}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Transaction Info */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Thông tin giao dịch
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Loại</span>
                            <span className="font-medium">
                                {ar.type === 'INVOICE' ? 'Hóa đơn bán hàng' : ar.type}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Ngày giao dịch
                            </span>
                            <span className="font-medium">{ar.trans_date}</span>
                        </div>
                        {ar.due_date && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Hạn thanh toán
                                </span>
                                <span
                                    className={`font-medium ${ar.days_overdue > 0 ? 'text-destructive' : ''}`}
                                >
                                    {ar.due_date}
                                </span>
                            </div>
                        )}
                        {ar.description && (
                            <div className="pt-2 border-t">
                                <span className="text-muted-foreground text-sm">Mô tả:</span>
                                <p className="mt-1">{ar.description}</p>
                            </div>
                        )}
                        {ar.notes && (
                            <div className="pt-2 border-t">
                                <span className="text-muted-foreground text-sm">Ghi chú:</span>
                                <p className="mt-1 text-sm">{ar.notes}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                {ar.balance > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                        <Link href={`/cong-no/phai-thu/thu-tien?customer_id=${ar.customer_id}`}>
                            <Button className="w-full h-12" variant="default">
                                <DollarSign className="h-4 w-4 mr-2" />
                                Thu tiền
                            </Button>
                        </Link>
                        <Button className="w-full h-12" variant="outline" disabled>
                            📤 Gửi nhắc nhở
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}
