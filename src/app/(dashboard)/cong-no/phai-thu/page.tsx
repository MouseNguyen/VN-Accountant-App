'use client';

// src/app/(dashboard)/cong-no/phai-thu/page.tsx
// Trang danh sách công nợ phải thu

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
    ArrowLeft,
    DollarSign,
    Clock,
    AlertTriangle,
    Search,
    RefreshCw,
    TrendingUp,
    ChevronRight,
    FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/decimal';
import type { ARTransaction, ARListResponse } from '@/types/ar';

async function fetchARTransactions(params: Record<string, string>): Promise<ARListResponse> {
    const searchParams = new URLSearchParams();
    // Filter for INCOME transactions (AR) - don't filter by payment_status in API (invalid format)
    searchParams.set('trans_type', 'INCOME');
    if (params.search) searchParams.set('search', params.search);

    const res = await fetch(`/api/transactions?${searchParams.toString()}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || 'Lỗi tải danh sách');

    const data = json.data;

    // Map Transaction to ARTransaction format
    const allItems = (data?.items || data || []).map((t: any) => ({
        id: t.id,
        customer_id: t.partner_id,
        customer: t.partner ? {
            id: t.partner.id,
            code: t.partner.code,
            name: t.partner.name,
            phone: t.partner.phone,
        } : undefined,
        code: t.code || t.trans_number,
        type: 'INVOICE',
        trans_date: t.trans_date,
        due_date: t.due_date,
        amount: Number(t.total_amount || 0),
        paid_amount: Number(t.paid_amount || 0),
        balance: Number(t.total_amount || 0) - Number(t.paid_amount || 0),
        days_overdue: calculateDaysOverdue(t.due_date),
        status: t.payment_status === 'PAID' ? 'PAID' :
            calculateDaysOverdue(t.due_date) > 0 ? 'OVERDUE' :
                Number(t.paid_amount) > 0 ? 'PARTIAL' : 'UNPAID',
        payment_status: t.payment_status,
        description: t.description,
    }));

    // Filter only unpaid items (PENDING, PARTIAL, or UNPAID)
    let items = allItems.filter((i: any) =>
        i.payment_status === 'PENDING' ||
        i.payment_status === 'PARTIAL' ||
        i.payment_status === 'UNPAID'
    );

    // Apply additional filter based on params
    if (params.status === 'OVERDUE') {
        items = items.filter((i: any) => i.days_overdue > 0);
    }

    return {
        items,
        total: items.length,
        page: 1,
        limit: 20,
        hasMore: items.length >= 20,
        summary: {
            total_receivable: items.reduce((sum: number, i: any) => sum + i.balance, 0),
            total_overdue: items.filter((i: any) => i.days_overdue > 0).reduce((sum: number, i: any) => sum + i.balance, 0),
            total_paid_this_month: 0,
        },
    };
}

// Helper to calculate days overdue
function calculateDaysOverdue(dueDate: string | null | undefined): number {
    if (!dueDate) return 0;
    const due = new Date(dueDate);
    const today = new Date();
    const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
}

export default function ARListPage() {
    const [filter, setFilter] = useState<'all' | 'unpaid' | 'overdue'>('all');
    const [search, setSearch] = useState('');

    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['ar-transactions', filter, search],
        queryFn: () => {
            const params: Record<string, string> = {};
            if (search) params.search = search;
            if (filter === 'unpaid') params.status = 'UNPAID';
            if (filter === 'overdue') {
                params.status = 'OVERDUE';
                params.overdue_only = 'true';
            }
            return fetchARTransactions(params);
        },
    });

    const items = data?.items || [];
    const summary = data?.summary;

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-card border-b">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <Link href="/bao-cao?tab=payable">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-lg font-bold">💰 Công nợ phải thu</h1>
                            <p className="text-xs text-muted-foreground">
                                {data?.total || 0} khoản công nợ
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => refetch()}
                            disabled={isRefetching}
                        >
                            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                        </Button>
                        <Link href="/cong-no/phai-thu/thu-tien">
                            <Button size="sm">
                                <DollarSign className="h-4 w-4 mr-1" />
                                Thu tiền
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="p-4 space-y-4 max-w-4xl mx-auto">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                <TrendingUp className="h-4 w-4" />
                                Tổng phải thu
                            </div>
                            <div className="text-xl font-bold text-primary">
                                {formatMoney(summary?.total_receivable || 0)}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-destructive/50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                                Quá hạn
                            </div>
                            <div className="text-xl font-bold text-destructive">
                                {formatMoney(summary?.total_overdue || 0)}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Collected this month */}
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4 flex justify-between items-center">
                        <span className="text-sm">Đã thu tháng này</span>
                        <span className="font-bold text-primary">
                            {formatMoney(summary?.total_paid_this_month || 0)}
                        </span>
                    </CardContent>
                </Card>

                {/* Filter Tabs */}
                <div className="flex gap-2">
                    {[
                        { key: 'all', label: 'Tất cả', icon: FileText },
                        { key: 'unpaid', label: 'Chưa thu', icon: Clock },
                        { key: 'overdue', label: 'Quá hạn', icon: AlertTriangle },
                    ].map((tab) => (
                        <Button
                            key={tab.key}
                            variant={filter === tab.key ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter(tab.key as typeof filter)}
                            className="flex-1"
                        >
                            <tab.icon className="h-4 w-4 mr-1" />
                            {tab.label}
                        </Button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm theo khách hàng, mã..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* List */}
                <div className="space-y-2">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Đang tải...
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Không có công nợ nào
                        </div>
                    ) : (
                        items.map((ar) => <ARCard key={ar.id} ar={ar} />)
                    )}
                </div>
            </main>
        </div>
    );
}

function ARCard({ ar }: { ar: ARTransaction }) {
    const statusConfig: Record<string, { color: string; label: string }> = {
        UNPAID: { color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', label: 'Chưa thu' },
        PARTIAL: { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', label: 'Thu một phần' },
        PAID: { color: 'bg-green-500/10 text-green-600 border-green-500/20', label: 'Đã thu' },
        OVERDUE: { color: 'bg-red-500/10 text-red-600 border-red-500/20', label: 'Quá hạn' },
        CANCELLED: { color: 'bg-muted/500/10 text-muted-foreground border-border', label: 'Đã hủy' },
    };

    const status = statusConfig[ar.status] || statusConfig.UNPAID;

    return (
        <Link href={`/cong-no/phai-thu/${ar.id}`}>
            <Card className="hover:border-primary/50 cursor-pointer transition-colors">
                <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{ar.customer?.name}</div>
                            <div className="text-sm text-muted-foreground">{ar.code}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <span>{ar.trans_date}</span>
                                {ar.due_date && (
                                    <>
                                        <span>•</span>
                                        <span>Hạn: {ar.due_date}</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                            <div>
                                <div className="font-bold text-lg">{formatMoney(ar.balance)}</div>
                                <Badge variant="outline" className={status.color}>
                                    {status.label}
                                </Badge>
                                {ar.days_overdue > 0 && (
                                    <div className="text-xs text-destructive mt-1">
                                        Quá hạn {ar.days_overdue} ngày
                                    </div>
                                )}
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
