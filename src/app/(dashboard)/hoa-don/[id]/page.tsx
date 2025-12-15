// src/app/(dashboard)/hoa-don/[id]/page.tsx

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Invoice } from '@/types/invoice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/utils';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Check,
    RefreshCw,
    Trash2,
    AlertCircle,
    Calendar,
    Building2,
    Hash,
    FileText,
    Loader2,
} from 'lucide-react';
import Link from 'next/link';

export default function InvoiceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const invoiceId = params.id as string;

    const { data: invoice, isLoading, refetch } = useQuery({
        queryKey: ['invoice', invoiceId],
        queryFn: async () => {
            const res = await apiClient.get<Invoice>(`/invoices/${invoiceId}`);
            if (!res.success || !res.data) {
                throw new Error('Không tìm thấy hóa đơn');
            }
            return res.data;
        },
    });

    const retryMutation = useMutation({
        mutationFn: async () => {
            const res = await apiClient.post(`/invoices/${invoiceId}/retry`, {});
            if (!res.success) {
                throw new Error(res.error?.message || 'Lỗi retry');
            }
            return res.data;
        },
        onSuccess: () => {
            toast.success('Đang xử lý lại OCR...');
            refetch();
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const res = await apiClient.delete(`/invoices/${invoiceId}`);
            if (!res.success) {
                throw new Error(res.error?.message || 'Lỗi xóa');
            }
        },
        onSuccess: () => {
            toast.success('Đã xóa hóa đơn');
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            router.push('/hoa-don');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">Đang xử lý</span>;
            case 'PROCESSED':
                return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">Chờ xác nhận</span>;
            case 'CONFIRMED':
                return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Đã xác nhận</span>;
            case 'FAILED':
                return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Thất bại</span>;
            default:
                return null;
        }
    };

    if (isLoading) {
        return (
            <div className="p-4 space-y-4">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="p-4 text-center py-12">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Không tìm thấy hóa đơn</p>
                <Link href="/hoa-don">
                    <Button variant="outline" className="mt-4">Quay lại</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="p-4 pb-24 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Link href="/hoa-don" className="p-2 hover:bg-muted rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-xl font-bold">Chi tiết hóa đơn</h1>
                </div>
                {getStatusBadge(invoice.status)}
            </div>

            {/* Error Message */}
            {invoice.error_message && (
                <Card className="mb-4 border-red-500 bg-red-50">
                    <CardContent className="p-4 text-red-700">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-medium">Lỗi: {invoice.error_message}</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Invoice Info */}
            <Card className="mb-4">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Thông tin hóa đơn
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Số hóa đơn:</span>
                        <span className="font-medium">{invoice.invoice_number || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Ngày:</span>
                        <span className="font-medium">
                            {invoice.invoice_date
                                ? new Date(invoice.invoice_date).toLocaleDateString('vi-VN')
                                : '—'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Nhà cung cấp:</span>
                        <span className="font-medium text-right max-w-[200px] truncate">
                            {invoice.supplier_name || '—'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">MST:</span>
                        <span className="font-mono">{invoice.supplier_tax_code || '—'}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between text-lg">
                        <span className="font-medium">Tổng tiền:</span>
                        <span className="font-bold text-primary">
                            {invoice.total_amount ? formatMoney(Number(invoice.total_amount)) : '—'}
                        </span>
                    </div>
                    {invoice.tax_amount && Number(invoice.tax_amount) > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Trong đó VAT:</span>
                            <span>{formatMoney(Number(invoice.tax_amount))}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Meta */}
            <Card className="mb-4">
                <CardContent className="p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Tạo lúc:</span>
                        <span>{new Date(invoice.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Độ tin cậy OCR:</span>
                        <span>{invoice.ocr_confidence ? `${Number(invoice.ocr_confidence).toFixed(0)}%` : '—'}</span>
                    </div>
                    {invoice.confirmed_at && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Xác nhận lúc:</span>
                            <span>{new Date(invoice.confirmed_at).toLocaleString('vi-VN')}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-3">
                {invoice.status === 'PROCESSED' && (
                    <Link href={`/hoa-don/${invoiceId}/confirm`}>
                        <Button className="w-full" size="lg">
                            <Check className="w-5 h-5 mr-2" />
                            Xác nhận & Tạo giao dịch
                        </Button>
                    </Link>
                )}

                {invoice.status === 'FAILED' && invoice.retry_count < 3 && (
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => retryMutation.mutate()}
                        disabled={retryMutation.isPending}
                    >
                        {retryMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Thử lại OCR ({invoice.retry_count}/3)
                    </Button>
                )}

                {invoice.status !== 'CONFIRMED' && (
                    <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => {
                            if (confirm('Bạn có chắc muốn xóa hóa đơn này?')) {
                                deleteMutation.mutate();
                            }
                        }}
                        disabled={deleteMutation.isPending}
                    >
                        {deleteMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Trash2 className="w-4 h-4 mr-2" />
                        )}
                        Xóa hóa đơn
                    </Button>
                )}
            </div>
        </div>
    );
}
