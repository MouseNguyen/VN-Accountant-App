// src/app/(dashboard)/ar-invoices/page.tsx
// AR Invoice List Page - Phase 4 Task 2

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    FileText,
    Plus,
    Search,
    Filter,
    Eye,
    Edit,
    Trash2,
    Send,
    CheckCircle2,
    Clock,
    AlertTriangle,
    XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { useARInvoices, useDeleteARInvoice } from '@/hooks/use-ar-invoices';
import type { ARInvoice } from '@/types/ar-invoice';

// Status configurations
const STATUS_CONFIG = {
    DRAFT: {
        label: 'Nháp',
        color: 'bg-gray-100 text-gray-800',
        icon: FileText,
    },
    POSTED: {
        label: 'Đã ghi sổ',
        color: 'bg-blue-100 text-blue-800',
        icon: Send,
    },
    PARTIALLY_PAID: {
        label: 'Thanh toán một phần',
        color: 'bg-yellow-100 text-yellow-800',
        icon: Clock,
    },
    PAID: {
        label: 'Đã thanh toán',
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle2,
    },
    OVERDUE: {
        label: 'Quá hạn',
        color: 'bg-red-100 text-red-800',
        icon: AlertTriangle,
    },
    VOID: {
        label: 'Đã hủy',
        color: 'bg-slate-100 text-slate-800',
        icon: XCircle,
    },
};

export default function ARInvoicesPage() {
    const router = useRouter();
    const { toast } = useToast();

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [page, setPage] = useState(1);

    // Delete dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<ARInvoice | null>(null);

    // Queries
    const farmId = typeof window !== 'undefined'
        ? localStorage.getItem('farmId') || 'test-farm-001'
        : 'test-farm-001';

    const { data, isLoading, refetch } = useARInvoices(farmId, {
        page,
        limit: 20,
        status: statusFilter !== 'all' ? statusFilter as any : undefined,
        search: search || undefined,
    });

    const deleteInvoice = useDeleteARInvoice();

    const invoices = data?.items || [];
    const summary = data?.summary;

    // Format money
    const formatMoney = (value: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(value);
    };

    // Handle delete
    const handleDeleteClick = (invoice: ARInvoice) => {
        if (invoice.status !== 'DRAFT') {
            toast({
                title: 'Không thể xóa',
                description: 'Chỉ có thể xóa hóa đơn nháp',
                variant: 'destructive',
            });
            return;
        }
        setInvoiceToDelete(invoice);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!invoiceToDelete) return;

        try {
            await deleteInvoice.mutateAsync({
                farmId,
                id: invoiceToDelete.id,
            });
            toast({
                title: 'Đã xóa',
                description: `Hóa đơn ${invoiceToDelete.invoice_number} đã được xóa`,
            });
            refetch();
        } catch (error: any) {
            toast({
                title: 'Lỗi',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setDeleteDialogOpen(false);
            setInvoiceToDelete(null);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Hóa đơn bán hàng</h1>
                    <p className="text-muted-foreground">Quản lý hóa đơn AR Invoice</p>
                </div>
                <Link href="/ar-invoices/new">
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Tạo hóa đơn
                    </Button>
                </Link>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Tổng hóa đơn</div>
                        <div className="text-2xl font-bold">{summary?.total_invoices || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Tổng giá trị</div>
                        <div className="text-2xl font-bold text-blue-600">
                            {formatMoney(summary?.total_amount || 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Đã thu</div>
                        <div className="text-2xl font-bold text-green-600">
                            {formatMoney(summary?.total_paid || 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Còn nợ</div>
                        <div className="text-2xl font-bold text-red-600">
                            {formatMoney(summary?.total_outstanding || 0)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm theo số hóa đơn, mô tả..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue placeholder="Trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                                <SelectItem value="DRAFT">Nháp</SelectItem>
                                <SelectItem value="POSTED">Đã ghi sổ</SelectItem>
                                <SelectItem value="PARTIALLY_PAID">Thanh toán một phần</SelectItem>
                                <SelectItem value="PAID">Đã thanh toán</SelectItem>
                                <SelectItem value="OVERDUE">Quá hạn</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Invoice List */}
            <Card>
                <CardHeader className="border-b">
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Danh sách hóa đơn
                        <Badge variant="secondary">{invoices.length}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">Chưa có hóa đơn nào</p>
                            <Link href="/ar-invoices/new">
                                <Button className="mt-4">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Tạo hóa đơn đầu tiên
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted border-b">
                                    <tr>
                                        <th className="text-left p-3 font-medium text-muted-foreground">Số HĐ</th>
                                        <th className="text-left p-3 font-medium text-muted-foreground">Ngày</th>
                                        <th className="text-left p-3 font-medium text-muted-foreground">Khách hàng</th>
                                        <th className="text-left p-3 font-medium text-muted-foreground">Trạng thái</th>
                                        <th className="text-right p-3 font-medium text-muted-foreground">Tổng tiền</th>
                                        <th className="text-right p-3 font-medium text-muted-foreground">Còn nợ</th>
                                        <th className="w-32 p-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {invoices.map((invoice) => {
                                        const statusConfig = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.DRAFT;
                                        const StatusIcon = statusConfig.icon;

                                        return (
                                            <tr key={invoice.id} className="hover:bg-muted/50">
                                                <td className="p-3">
                                                    <span className="font-mono font-medium">
                                                        {invoice.invoice_number}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-muted-foreground">
                                                    {invoice.invoice_date}
                                                </td>
                                                <td className="p-3">
                                                    {invoice.customer_name || '-'}
                                                </td>
                                                <td className="p-3">
                                                    <Badge className={`${statusConfig.color} gap-1`}>
                                                        <StatusIcon className="h-3 w-3" />
                                                        {statusConfig.label}
                                                    </Badge>
                                                </td>
                                                <td className="p-3 text-right font-medium">
                                                    {formatMoney(invoice.total_amount)}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <span className={invoice.balance > 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                                                        {formatMoney(invoice.balance)}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex justify-end gap-1">
                                                        <Link href={`/ar-invoices/${invoice.id}`}>
                                                            <Button variant="ghost" size="icon">
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                        {invoice.status === 'DRAFT' && (
                                                            <>
                                                                <Link href={`/ar-invoices/${invoice.id}/edit`}>
                                                                    <Button variant="ghost" size="icon">
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                </Link>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="text-red-600"
                                                                    onClick={() => handleDeleteClick(invoice)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa hóa đơn</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn xóa hóa đơn{' '}
                            <strong>{invoiceToDelete?.invoice_number}</strong>?
                            Hành động này không thể hoàn tác.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Xóa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
