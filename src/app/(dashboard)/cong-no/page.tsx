// src/app/(dashboard)/cong-no/page.tsx
// Trang quản lý công nợ - Payables Management

'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    Receipt,
    CreditCard,
    AlertTriangle,
    Clock,
    TrendingUp,
    TrendingDown,
    Filter,
    History,
    ChevronRight,
    CheckCircle2,
    XCircle,
    FileText,
    Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/shared/search-input';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadMoreButton } from '@/components/shared/load-more-button';
import { usePayables, usePaymentHistory } from '@/hooks/use-payables';
import { PaymentDialog } from './payment-dialog';
import { PaymentHistorySheet } from './payment-history-sheet';
import type { PartnerPayable } from '@/types/payable';

// Status configurations
const STATUS_CONFIG = {
    CURRENT: {
        label: 'Trong hạn',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle2,
    },
    OVERDUE: {
        label: 'Quá hạn',
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: XCircle,
    },
    WARNING: {
        label: 'Sắp đến hạn',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: AlertTriangle,
    },
};

export default function CongNoPage() {
    // Tab state
    const [activeTab, setActiveTab] = useState<'receivable' | 'payable'>('receivable');

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'current' | 'overdue' | 'warning'>('all');

    // Dialogs
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [selectedPartner, setSelectedPartner] = useState<PartnerPayable | null>(null);
    const [historySheetOpen, setHistorySheetOpen] = useState(false);

    // Query
    const { data: payablesData, isLoading } = usePayables({
        partner_type: activeTab === 'receivable' ? 'CUSTOMER' : 'VENDOR',
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: 50,
    });

    const payables = payablesData?.items || [];
    const summary = payablesData?.summary;

    // Handlers
    const handleSearch = useCallback((value: string) => {
        setSearch(value);
    }, []);

    const handlePayment = useCallback((partner: PartnerPayable) => {
        setSelectedPartner(partner);
        setPaymentDialogOpen(true);
    }, []);

    const handleViewHistory = useCallback((partner: PartnerPayable) => {
        setSelectedPartner(partner);
        setHistorySheetOpen(true);
    }, []);

    const formatMoney = (value: number | string) => {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(num);
    };

    // Summary cards
    const summaryCards = useMemo(() => [
        {
            title: activeTab === 'receivable' ? 'Tổng phải thu' : 'Tổng phải trả',
            value: summary?.total_balance || 0,
            icon: activeTab === 'receivable' ? TrendingUp : TrendingDown,
            color: activeTab === 'receivable' ? 'text-green-600' : 'text-red-600',
            bgColor: activeTab === 'receivable' ? 'bg-green-50' : 'bg-red-50',
        },
        {
            title: 'Quá hạn',
            value: summary?.total_overdue || 0,
            icon: AlertTriangle,
            color: 'text-red-600',
            bgColor: 'bg-red-50',
        },
        {
            title: 'Trong hạn',
            value: summary?.total_current || 0,
            icon: Clock,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
        },
        {
            title: 'Đối tác có nợ',
            value: summary?.partner_count || 0,
            icon: Receipt,
            color: 'text-primary',
            bgColor: 'bg-purple-50',
            isCount: true,
        },
    ], [activeTab, summary]);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Công nợ</h1>
                    <p className="text-muted-foreground">Quản lý phải thu và phải trả</p>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'receivable' | 'payable')}>
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="receivable" className="gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Phải thu
                    </TabsTrigger>
                    <TabsTrigger value="payable" className="gap-2">
                        <TrendingDown className="h-4 w-4" />
                        Phải trả
                    </TabsTrigger>
                </TabsList>

                {/* Quick Links */}
                <div className="flex flex-wrap gap-2 mt-4">
                    <Link href="/cong-no/phai-thu">
                        <Button variant="outline" size="sm">
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Công nợ phải thu
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </Link>
                    <Link href="/cong-no/phai-tra">
                        <Button variant="outline" size="sm">
                            <TrendingDown className="w-4 h-4 mr-2" />
                            Công nợ phải trả
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </Link>
                    <Link href="/cong-no/phai-tra/lich-thanh-toan">
                        <Button variant="outline" size="sm">
                            <Calendar className="w-4 h-4 mr-2" />
                            Lịch thanh toán
                        </Button>
                    </Link>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                    {summaryCards.map((card, index) => {
                        const Icon = card.icon;
                        return (
                            <Card key={index} className="overflow-hidden">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${card.bgColor}`}>
                                            <Icon className={`h-5 w-5 ${card.color}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-muted-foreground truncate">{card.title}</p>
                                            <p className={`text-lg font-bold ${card.color}`}>
                                                {card.isCount
                                                    ? card.value
                                                    : formatMoney(card.value)}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Filters */}
                <Card className="mt-6">
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <SearchInput
                                    placeholder="Tìm theo tên, mã đối tác..."
                                    onSearch={handleSearch}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant={statusFilter === 'all' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setStatusFilter('all')}
                                >
                                    Tất cả
                                </Button>
                                <Button
                                    variant={statusFilter === 'overdue' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setStatusFilter('overdue')}
                                    className={statusFilter === 'overdue' ? '' : 'text-red-600'}
                                >
                                    <AlertTriangle className="h-4 w-4 mr-1" />
                                    Quá hạn
                                </Button>
                                <Button
                                    variant={statusFilter === 'warning' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setStatusFilter('warning')}
                                    className={statusFilter === 'warning' ? '' : 'text-yellow-600'}
                                >
                                    <Clock className="h-4 w-4 mr-1" />
                                    Sắp hạn
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Payables List */}
                <TabsContent value="receivable" className="mt-0">
                    <PayablesList
                        payables={payables}
                        isLoading={isLoading}
                        type="receivable"
                        onPayment={handlePayment}
                        onViewHistory={handleViewHistory}
                        formatMoney={formatMoney}
                    />
                </TabsContent>

                <TabsContent value="payable" className="mt-0">
                    <PayablesList
                        payables={payables}
                        isLoading={isLoading}
                        type="payable"
                        onPayment={handlePayment}
                        onViewHistory={handleViewHistory}
                        formatMoney={formatMoney}
                    />
                </TabsContent>
            </Tabs>

            {/* Payment Dialog */}
            {selectedPartner && (
                <PaymentDialog
                    open={paymentDialogOpen}
                    onClose={() => {
                        setPaymentDialogOpen(false);
                        setSelectedPartner(null);
                    }}
                    partner={selectedPartner}
                />
            )}

            {/* Payment History Sheet */}
            {selectedPartner && (
                <PaymentHistorySheet
                    open={historySheetOpen}
                    onClose={() => {
                        setHistorySheetOpen(false);
                        setSelectedPartner(null);
                    }}
                    partnerId={selectedPartner.partner_id}
                    partnerName={selectedPartner.partner_name}
                />
            )}
        </div>
    );
}

// Payables List Component
interface PayablesListProps {
    payables: PartnerPayable[];
    isLoading: boolean;
    type: 'receivable' | 'payable';
    onPayment: (partner: PartnerPayable) => void;
    onViewHistory: (partner: PartnerPayable) => void;
    formatMoney: (value: number | string) => string;
}

function PayablesList({
    payables,
    isLoading,
    type,
    onPayment,
    onViewHistory,
    formatMoney,
}: PayablesListProps) {
    if (isLoading) {
        return (
            <Card className="mt-6">
                <CardContent className="py-12">
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (payables.length === 0) {
        return (
            <Card className="mt-6">
                <CardContent className="py-12">
                    <EmptyState
                        icon="💰"
                        title={type === 'receivable' ? 'Không có công nợ phải thu' : 'Không có công nợ phải trả'}
                        description="Tất cả các giao dịch đã được thanh toán"
                    />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="mt-6">
            <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Danh sách công nợ
                    <Badge variant="secondary">{payables.length}</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted border-b">
                            <tr>
                                <th className="text-left p-3 font-medium text-muted-foreground">Đối tác</th>
                                <th className="text-left p-3 font-medium text-muted-foreground">Trạng thái</th>
                                <th className="text-right p-3 font-medium text-muted-foreground">Số dư nợ</th>
                                <th className="text-right p-3 font-medium text-muted-foreground">Quá hạn</th>
                                <th className="text-center p-3 font-medium text-muted-foreground">Hóa đơn</th>
                                <th className="w-48 p-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {payables.map((payable) => {
                                const status = payable.overdue_days > 0
                                    ? 'OVERDUE'
                                    : payable.overdue_days >= -7
                                        ? 'WARNING'
                                        : 'CURRENT';
                                const statusConfig = STATUS_CONFIG[status];
                                const StatusIcon = statusConfig.icon;

                                return (
                                    <tr key={payable.partner_id} className="hover:bg-muted transition-colors">
                                        <td className="p-3">
                                            <div>
                                                <div className="font-medium">{payable.partner_name}</div>
                                                <div className="text-sm text-muted-foreground">{payable.partner_code}</div>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <Badge className={`${statusConfig.color} gap-1`}>
                                                <StatusIcon className="h-3 w-3" />
                                                {statusConfig.label}
                                            </Badge>
                                            {payable.overdue_days > 0 && (
                                                <div className="text-xs text-red-600 mt-1">
                                                    {payable.overdue_days} ngày
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3 text-right">
                                            <span className={`font-bold ${type === 'receivable' ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatMoney(payable.balance)}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right">
                                            <span className="text-red-600 font-medium">
                                                {formatMoney(payable.overdue_balance)}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className="text-muted-foreground">{payable.unpaid_invoice_count}</span>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onViewHistory(payable)}
                                                >
                                                    <History className="h-4 w-4 mr-1" />
                                                    Lịch sử
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => onPayment(payable)}
                                                >
                                                    <CreditCard className="h-4 w-4 mr-1" />
                                                    Thanh toán
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y">
                    {payables.map((payable) => {
                        const status = payable.overdue_days > 0
                            ? 'OVERDUE'
                            : payable.overdue_days >= -7
                                ? 'WARNING'
                                : 'CURRENT';
                        const statusConfig = STATUS_CONFIG[status];
                        const StatusIcon = statusConfig.icon;

                        return (
                            <div key={payable.partner_id} className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <div className="font-medium">{payable.partner_name}</div>
                                        <div className="text-sm text-muted-foreground">{payable.partner_code}</div>
                                    </div>
                                    <Badge className={`${statusConfig.color} gap-1`}>
                                        <StatusIcon className="h-3 w-3" />
                                        {statusConfig.label}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm text-muted-foreground">Số dư nợ</span>
                                    <span className={`font-bold ${type === 'receivable' ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatMoney(payable.balance)}
                                    </span>
                                </div>
                                {payable.overdue_balance > 0 && (
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm text-muted-foreground">Quá hạn</span>
                                        <span className="text-red-600 font-medium">
                                            {formatMoney(payable.overdue_balance)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => onViewHistory(payable)}
                                    >
                                        <History className="h-4 w-4 mr-1" />
                                        Lịch sử
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => onPayment(payable)}
                                    >
                                        <CreditCard className="h-4 w-4 mr-1" />
                                        Thanh toán
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
