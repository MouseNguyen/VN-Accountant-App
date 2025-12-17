// src/app/(dashboard)/giao-dich/page.tsx
// Trang quản lý giao dịch

'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Download, Filter, ArrowUpRight, ArrowDownRight, TrendingUp, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchInput } from '@/components/shared/search-input';
import { LoadMoreButton } from '@/components/shared/load-more-button';
import { EmptyState } from '@/components/shared/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useTransactions } from '@/hooks/use-transactions';
import { TransactionType, PaymentStatus } from '@prisma/client';
import {
    TRANSACTION_TYPE_LABELS,
    PAYMENT_STATUS_LABELS,
    PAYMENT_STATUS_COLORS,
    type Transaction,
} from '@/types/transaction';
import { TransactionFormDialog } from './transaction-form-dialog';
import { PaymentDialog } from './payment-dialog';

// ==========================================
// CONSTANTS
// ==========================================

const TRANS_TYPE_OPTIONS = [
    { value: 'all', label: 'Tất cả loại' },
    { value: 'SALE', label: 'Bán hàng' },
    { value: 'INCOME', label: 'Thu tiền' },
    { value: 'CASH_IN', label: 'Thu tiền mặt' },
    { value: 'PURCHASE', label: 'Mua hàng' },
    { value: 'EXPENSE', label: 'Chi tiêu' },
    { value: 'CASH_OUT', label: 'Chi tiền mặt' },
];

const PAYMENT_STATUS_OPTIONS = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'PENDING', label: 'Chưa thanh toán' },
    { value: 'PARTIAL', label: 'Thanh toán một phần' },
    { value: 'PAID', label: 'Đã thanh toán' },
];

// Helper: Check if transaction is income type (includes SALE, INCOME, CASH_IN)
const isIncomeType = (type: string): boolean => {
    return ['SALE', 'INCOME', 'CASH_IN'].includes(type);
};

// ==========================================
// COMPONENT
// ==========================================

export default function GiaoDichPage() {
    // Filters state
    const [search, setSearch] = useState('');
    const [transType, setTransType] = useState<TransactionType | 'all'>('all');
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | 'all'>('all');

    // Dialog states
    const [formOpen, setFormOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [paymentTransaction, setPaymentTransaction] = useState<Transaction | null>(null);
    const [deleteTransaction, setDeleteTransaction] = useState<Transaction | null>(null);

    // Query with filters
    const {
        transactions,
        total,
        summary,
        isLoading,
        isError,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
        deleteTransaction: deleteTransactionMutation,
        isDeleting,
    } = useTransactions({
        search: search || undefined,
        trans_type: transType !== 'all' ? transType : undefined,
        payment_status: paymentStatus !== 'all' ? paymentStatus : undefined,
        limit: 20,
    });

    // Handlers
    const handleCreate = useCallback(() => {
        setEditingTransaction(null);
        setFormOpen(true);
    }, []);

    const handleEdit = useCallback((transaction: Transaction) => {
        setEditingTransaction(transaction);
        setFormOpen(true);
    }, []);

    const handlePayment = useCallback((transaction: Transaction) => {
        setPaymentTransaction(transaction);
    }, []);

    const handleDelete = useCallback((transaction: Transaction) => {
        setDeleteTransaction(transaction);
    }, []);

    const confirmDelete = async () => {
        if (!deleteTransaction) return;
        await deleteTransactionMutation(deleteTransaction.id);
        setDeleteTransaction(null);
    };

    const handleExport = async () => {
        window.open('/api/transactions/export', '_blank');
    };

    // Formatters
    const formatMoney = (value: number) =>
        new Intl.NumberFormat('vi-VN').format(value) + 'đ';

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    // ==========================================
    // RENDER
    // ==========================================

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard" className="p-2 hover:bg-muted rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Giao dịch</h1>
                        <p className="text-sm text-muted-foreground">
                            Quản lý thu chi, thanh toán
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Xuất Excel
                    </Button>
                    <Button size="sm" onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        Tạo giao dịch
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng thu</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {isLoading ? (
                                <Skeleton className="h-8 w-32" />
                            ) : (
                                formatMoney(summary.total_income)
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng chi</CardTitle>
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {isLoading ? (
                                <Skeleton className="h-8 w-32" />
                            ) : (
                                formatMoney(summary.total_expense)
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Lãi ròng</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div
                            className={`text-2xl font-bold ${summary.net >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}
                        >
                            {isLoading ? (
                                <Skeleton className="h-8 w-32" />
                            ) : (
                                formatMoney(summary.net)
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px] max-w-sm">
                    <SearchInput
                        defaultValue={search}
                        onSearch={setSearch}
                        placeholder="Tìm theo mã, mô tả, đối tác..."
                    />
                </div>

                <div className="flex gap-2">
                    <Select
                        value={transType}
                        onValueChange={(v) => setTransType(v as TransactionType | 'all')}
                    >
                        <SelectTrigger className="w-[160px]">
                            <Filter className="mr-2 h-4 w-4" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {TRANS_TYPE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={paymentStatus}
                        onValueChange={(v) => setPaymentStatus(v as PaymentStatus | 'all')}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PAYMENT_STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Total count */}
            {!isLoading && (
                <div className="text-sm text-muted-foreground">
                    Tìm thấy {total} giao dịch
                </div>
            )}

            {/* Transaction List */}
            <div className="space-y-3">
                {isLoading ? (
                    // Loading skeleton
                    Array.from({ length: 5 }).map((_, i) => (
                        <Card key={i} className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                    <Skeleton className="h-5 w-32" />
                                    <Skeleton className="h-4 w-48" />
                                </div>
                                <Skeleton className="h-8 w-24" />
                            </div>
                        </Card>
                    ))
                ) : isError ? (
                    <EmptyState
                        icon={<Filter className="h-12 w-12" />}
                        title="Không thể tải dữ liệu"
                        description="Đã có lỗi xảy ra. Vui lòng thử lại."
                    />
                ) : transactions.length === 0 ? (
                    <EmptyState
                        icon={<Plus className="h-12 w-12" />}
                        title="Chưa có giao dịch"
                        description="Bắt đầu tạo giao dịch thu chi đầu tiên"
                        action={
                            <Button onClick={handleCreate}>
                                <Plus className="mr-2 h-4 w-4" />
                                Tạo giao dịch
                            </Button>
                        }
                    />
                ) : (
                    transactions.map((transaction) => (
                        <Card
                            key={transaction.id}
                            className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                            onClick={() => handleEdit(transaction)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {/* Icon */}
                                    <div
                                        className={`p-2 rounded-full ${isIncomeType(transaction.trans_type)
                                            ? 'bg-green-100'
                                            : 'bg-red-100'
                                            }`}
                                    >
                                        {isIncomeType(transaction.trans_type) ? (
                                            <ArrowUpRight className="h-5 w-5 text-green-600" />
                                        ) : (
                                            <ArrowDownRight className="h-5 w-5 text-red-600" />
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{transaction.code}</span>
                                            <Badge variant="outline" className="text-xs">
                                                {TRANSACTION_TYPE_LABELS[transaction.trans_type]}
                                            </Badge>
                                            <Badge
                                                className={`text-xs ${PAYMENT_STATUS_COLORS[transaction.payment_status]
                                                    }`}
                                            >
                                                {PAYMENT_STATUS_LABELS[transaction.payment_status]}
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {formatDate(transaction.trans_date)}
                                            {transaction.partner && (
                                                <span> • {transaction.partner.name}</span>
                                            )}
                                            {transaction.description && (
                                                <span> • {transaction.description}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Amount & Actions */}
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div
                                            className={`font-bold ${isIncomeType(transaction.trans_type)
                                                ? 'text-green-600'
                                                : 'text-red-600'
                                                }`}
                                        >
                                            {isIncomeType(transaction.trans_type) ? '+' : '-'}
                                            {formatMoney(transaction.total_amount)}
                                        </div>
                                        {transaction.payment_status !== 'PAID' && (
                                            <div className="text-xs text-muted-foreground">
                                                Còn nợ: {formatMoney(transaction.total_amount - transaction.paid_amount)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                        {transaction.payment_status !== 'PAID' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handlePayment(transaction)}
                                            >
                                                Thanh toán
                                            </Button>
                                        )}
                                        {transaction.payment_status !== 'PAID' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(transaction)}
                                            >
                                                Xóa
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Load More */}
            {hasNextPage && (
                <LoadMoreButton
                    hasMore={hasNextPage}
                    onClick={() => fetchNextPage()}
                    isLoading={isFetchingNextPage}
                    loadedCount={transactions.length}
                    totalCount={total}
                />
            )}

            {/* Dialogs */}
            <TransactionFormDialog
                open={formOpen}
                onClose={() => setFormOpen(false)}
                transaction={editingTransaction}
            />

            <PaymentDialog
                open={!!paymentTransaction}
                onClose={() => setPaymentTransaction(null)}
                transaction={paymentTransaction}
            />

            <ConfirmDialog
                open={!!deleteTransaction}
                onOpenChange={(open) => !open && setDeleteTransaction(null)}
                title="Xóa giao dịch?"
                description={`Bạn có chắc muốn xóa giao dịch "${deleteTransaction?.code}"? Tồn kho và công nợ sẽ được hoàn trả.`}
                confirmText="Xóa"
                onConfirm={confirmDelete}
                isLoading={isDeleting}
                variant="destructive"
            />
        </div>
    );
}
