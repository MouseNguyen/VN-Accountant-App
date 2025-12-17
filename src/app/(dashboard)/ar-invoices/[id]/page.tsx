// src/app/(dashboard)/ar-invoices/[id]/page.tsx
// View AR Invoice Page - Phase 4 Task 2

'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Edit,
    Trash2,
    Send,
    Printer,
    FileText,
    User,
    Calendar,
    Clock,
    CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useARInvoice, useDeleteARInvoice } from '@/hooks/use-ar-invoices';

// Status configurations
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Nháp', color: 'bg-gray-100 text-gray-800' },
    POSTED: { label: 'Đã ghi sổ', color: 'bg-blue-100 text-blue-800' },
    PARTIALLY_PAID: { label: 'Thanh toán một phần', color: 'bg-yellow-100 text-yellow-800' },
    PAID: { label: 'Đã thanh toán', color: 'bg-green-100 text-green-800' },
    OVERDUE: { label: 'Quá hạn', color: 'bg-red-100 text-red-800' },
    VOID: { label: 'Đã hủy', color: 'bg-slate-100 text-slate-800' },
};

export default function ViewARInvoicePage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const invoiceId = params.id as string;

    const farmId = typeof window !== 'undefined'
        ? localStorage.getItem('farmId') || 'test-farm-001'
        : 'test-farm-001';

    const { data: invoice, isLoading } = useARInvoice(farmId, invoiceId);
    const deleteInvoice = useDeleteARInvoice();

    // Format money
    const formatMoney = (value: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(value);
    };

    // Handle delete
    const handleDelete = async () => {
        if (!invoice) return;

        if (invoice.status !== 'DRAFT') {
            toast({
                title: 'Không thể xóa',
                description: 'Chỉ có thể xóa hóa đơn nháp',
                variant: 'destructive',
            });
            return;
        }

        if (!confirm(`Xác nhận xóa hóa đơn ${invoice.invoice_number}?`)) return;

        try {
            await deleteInvoice.mutateAsync({ farmId, id: invoiceId });
            toast({
                title: 'Đã xóa',
                description: `Hóa đơn ${invoice.invoice_number} đã được xóa`,
            });
            router.push('/ar-invoices');
        } catch (error: any) {
            toast({
                title: 'Lỗi',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    if (isLoading) {
        return (
            <div className="p-6 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="p-6 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Không tìm thấy hóa đơn</p>
                <Link href="/ar-invoices">
                    <Button className="mt-4">Quay lại danh sách</Button>
                </Link>
            </div>
        );
    }

    const statusConfig = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.DRAFT;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/ar-invoices">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">{invoice.invoice_number}</h1>
                            <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                        </div>
                        <p className="text-muted-foreground">Hóa đơn bán hàng</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {invoice.status === 'DRAFT' && (
                        <>
                            <Link href={`/ar-invoices/${invoiceId}/edit`}>
                                <Button variant="outline">
                                    <Edit className="h-4 w-4 mr-2" />
                                    Sửa
                                </Button>
                            </Link>
                            <Button variant="outline" className="text-red-600" onClick={handleDelete}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Xóa
                            </Button>
                            <Button>
                                <Send className="h-4 w-4 mr-2" />
                                Ghi sổ
                            </Button>
                        </>
                    )}
                    <Button variant="outline">
                        <Printer className="h-4 w-4 mr-2" />
                        In
                    </Button>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Invoice Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Thông tin hóa đơn</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="flex items-center gap-3">
                                    <User className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <div className="text-sm text-muted-foreground">Khách hàng</div>
                                        <div className="font-medium">{invoice.customer_name || 'N/A'}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Calendar className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <div className="text-sm text-muted-foreground">Ngày hóa đơn</div>
                                        <div className="font-medium">{invoice.invoice_date}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Clock className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <div className="text-sm text-muted-foreground">Ngày đến hạn</div>
                                        <div className="font-medium">{invoice.due_date}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <div className="text-sm text-muted-foreground">Điều khoản</div>
                                        <div className="font-medium">{invoice.payment_term_days} ngày</div>
                                    </div>
                                </div>
                            </div>
                            {invoice.description && (
                                <div className="mt-4 pt-4 border-t">
                                    <div className="text-sm text-muted-foreground mb-1">Mô tả</div>
                                    <div>{invoice.description}</div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Line Items */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Chi tiết hóa đơn</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-muted border-b">
                                        <tr>
                                            <th className="text-left p-3 font-medium">#</th>
                                            <th className="text-left p-3 font-medium">Sản phẩm</th>
                                            <th className="text-right p-3 font-medium">SL</th>
                                            <th className="text-right p-3 font-medium">Đơn giá</th>
                                            <th className="text-right p-3 font-medium">VAT</th>
                                            <th className="text-right p-3 font-medium">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {invoice.lines?.map((line) => (
                                            <tr key={line.id}>
                                                <td className="p-3 text-muted-foreground">{line.line_number}</td>
                                                <td className="p-3">
                                                    <div className="font-medium">{line.product_name}</div>
                                                    {line.unit && (
                                                        <div className="text-sm text-muted-foreground">{line.unit}</div>
                                                    )}
                                                </td>
                                                <td className="p-3 text-right">{line.quantity}</td>
                                                <td className="p-3 text-right">{formatMoney(line.unit_price)}</td>
                                                <td className="p-3 text-right">{line.tax_rate}%</td>
                                                <td className="p-3 text-right font-medium">
                                                    {formatMoney(line.total_amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notes */}
                    {invoice.notes && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Ghi chú</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">{invoice.notes}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Summary Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tổng cộng</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Tiền hàng</span>
                                <span>{formatMoney(invoice.sub_total)}</span>
                            </div>
                            {invoice.discount_amount > 0 && (
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Chiết khấu</span>
                                    <span className="text-red-600">-{formatMoney(invoice.discount_amount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-muted-foreground">
                                <span>VAT</span>
                                <span>{formatMoney(invoice.tax_amount)}</span>
                            </div>
                            <div className="border-t pt-3">
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Tổng cộng</span>
                                    <span className="text-primary">{formatMoney(invoice.total_amount)}</span>
                                </div>
                            </div>
                            <div className="border-t pt-3 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Đã thanh toán</span>
                                    <span className="text-green-600">{formatMoney(invoice.paid_amount)}</span>
                                </div>
                                <div className="flex justify-between font-medium">
                                    <span>Còn nợ</span>
                                    <span className={invoice.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                                        {formatMoney(invoice.balance)}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Status Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Trạng thái</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="h-8 w-8 text-primary" />
                                <div>
                                    <Badge className={`${statusConfig.color} text-sm`}>
                                        {statusConfig.label}
                                    </Badge>
                                    <div className="text-sm text-muted-foreground mt-1">
                                        {invoice.status === 'DRAFT' && 'Chưa ghi sổ'}
                                        {invoice.status === 'POSTED' && `Ghi sổ: ${invoice.posted_at?.split('T')[0]}`}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
