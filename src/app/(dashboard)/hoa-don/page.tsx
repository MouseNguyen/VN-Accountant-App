// src/app/(dashboard)/hoa-don/page.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Invoice } from '@/types/invoice';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/utils';
import {
    Camera,
    FileText,
    Check,
    Clock,
    XCircle,
    ChevronRight,
    ArrowLeft,
    Plus,
} from 'lucide-react';

interface InvoiceListResponse {
    items: Invoice[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    summary: {
        total_pending: number;
        total_processed: number;
        total_confirmed: number;
        total_failed: number;
    };
}

export default function InvoiceListPage() {
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const { data, isLoading } = useQuery({
        queryKey: ['invoices', statusFilter],
        queryFn: async () => {
            const params: Record<string, string> = { limit: '50' };
            if (statusFilter !== 'all') {
                params.status = statusFilter;
            }
            const res = await apiClient.get<InvoiceListResponse>('/invoices', params);
            if (!res.success || !res.data) {
                throw new Error('Không thể tải danh sách');
            }
            return res.data;
        },
    });

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <Clock className="w-4 h-4 text-yellow-500" />;
            case 'PROCESSED':
                return <FileText className="w-4 h-4 text-blue-500" />;
            case 'CONFIRMED':
                return <Check className="w-4 h-4 text-green-500" />;
            case 'FAILED':
                return <XCircle className="w-4 h-4 text-red-500" />;
            default:
                return <FileText className="w-4 h-4" />;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'PENDING':
                return 'Đang xử lý';
            case 'PROCESSED':
                return 'Chờ xác nhận';
            case 'CONFIRMED':
                return 'Đã xác nhận';
            case 'FAILED':
                return 'Thất bại';
            default:
                return status;
        }
    };

    return (
        <div className="p-4 pb-24 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard" className="p-2 hover:bg-muted rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-xl font-bold">📄 Hóa đơn OCR</h1>
                </div>
                <Link href="/hoa-don/upload">
                    <Button size="sm" className="gap-2">
                        <Plus className="w-4 h-4" />
                        Chụp mới
                    </Button>
                </Link>
            </div>

            {/* Summary */}
            {data?.summary && (
                <div className="grid grid-cols-4 gap-2 mb-4">
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`p-3 rounded-lg text-center ${statusFilter === 'all' ? 'bg-primary text-white' : 'bg-muted'
                            }`}
                    >
                        <div className="text-lg font-bold">
                            {data.summary.total_pending +
                                data.summary.total_processed +
                                data.summary.total_confirmed +
                                data.summary.total_failed}
                        </div>
                        <div className="text-xs">Tất cả</div>
                    </button>
                    <button
                        onClick={() => setStatusFilter('PROCESSED')}
                        className={`p-3 rounded-lg text-center ${statusFilter === 'PROCESSED' ? 'bg-blue-500 text-white' : 'bg-blue-50'
                            }`}
                    >
                        <div className="text-lg font-bold">{data.summary.total_processed}</div>
                        <div className="text-xs">Chờ xác nhận</div>
                    </button>
                    <button
                        onClick={() => setStatusFilter('CONFIRMED')}
                        className={`p-3 rounded-lg text-center ${statusFilter === 'CONFIRMED' ? 'bg-green-500 text-white' : 'bg-green-50'
                            }`}
                    >
                        <div className="text-lg font-bold">{data.summary.total_confirmed}</div>
                        <div className="text-xs">Đã xác nhận</div>
                    </button>
                    <button
                        onClick={() => setStatusFilter('FAILED')}
                        className={`p-3 rounded-lg text-center ${statusFilter === 'FAILED' ? 'bg-red-500 text-white' : 'bg-red-50'
                            }`}
                    >
                        <div className="text-lg font-bold">{data.summary.total_failed}</div>
                        <div className="text-xs">Thất bại</div>
                    </button>
                </div>
            )}

            {/* List */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 w-full rounded-xl" />
                    ))}
                </div>
            ) : data?.items.length === 0 ? (
                <div className="text-center py-12">
                    <Camera className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-muted-foreground mb-4">Chưa có hóa đơn nào</p>
                    <Link href="/hoa-don/upload">
                        <Button>
                            <Camera className="w-4 h-4 mr-2" />
                            Chụp hóa đơn đầu tiên
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {data?.items.map((invoice) => (
                        <Link
                            key={invoice.id}
                            href={
                                invoice.status === 'PROCESSED'
                                    ? `/hoa-don/${invoice.id}/confirm`
                                    : `/hoa-don/${invoice.id}`
                            }
                        >
                            <Card className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div
                                        className={`w-12 h-12 rounded-lg flex items-center justify-center ${invoice.status === 'CONFIRMED'
                                                ? 'bg-green-100'
                                                : invoice.status === 'FAILED'
                                                    ? 'bg-red-100'
                                                    : invoice.status === 'PROCESSED'
                                                        ? 'bg-blue-100'
                                                        : 'bg-yellow-100'
                                            }`}
                                    >
                                        {getStatusIcon(invoice.status)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium truncate">
                                                {invoice.supplier_name || invoice.invoice_number || 'Hóa đơn OCR'}
                                            </span>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {invoice.invoice_date
                                                ? new Date(invoice.invoice_date).toLocaleDateString('vi-VN')
                                                : new Date(invoice.created_at).toLocaleDateString('vi-VN')}
                                            {' · '}
                                            {getStatusLabel(invoice.status)}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {invoice.total_amount && (
                                            <div className="font-bold">{formatMoney(Number(invoice.total_amount))}</div>
                                        )}
                                        <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
