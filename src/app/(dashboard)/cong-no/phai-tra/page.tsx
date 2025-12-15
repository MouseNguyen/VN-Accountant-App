// src/app/(dashboard)/cong-no/phai-tra/page.tsx
// Trang công nợ phải trả NCC

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    ArrowLeft,
    Plus,
    Search,
    Filter,
    TrendingDown,
    Clock,
    AlertTriangle,
    ChevronRight,
    Building2,
    Calendar,
    DollarSign,
    Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useAPTransactions, useAPSummary } from '@/hooks/use-ap';
import type { APListParams } from '@/types/ap';

// Format money
function formatMoney(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(value);
}

// Status badge
function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
        UNPAID: { label: 'Chưa trả', variant: 'destructive' },
        PARTIAL: { label: 'Trả 1 phần', variant: 'secondary' },
        PAID: { label: 'Đã trả', variant: 'default' },
        OVERDUE: { label: 'Quá hạn', variant: 'destructive' },
    };

    const { label, variant } = config[status] || { label: status, variant: 'outline' };

    return <Badge variant={variant}>{label}</Badge>;
}

export default function PhaiTraPage() {
    const [filters, setFilters] = useState<APListParams>({
        page: 1,
        limit: 20,
        sort_by: 'trans_date',
        sort_order: 'desc',
    });
    const [searchTerm, setSearchTerm] = useState('');

    const { data, isLoading } = useAPTransactions({
        ...filters,
        search: searchTerm || undefined,
    });
    const { data: summary, isLoading: loadingSummary } = useAPSummary();

    const handleSearch = (value: string) => {
        setSearchTerm(value);
        setFilters((prev) => ({ ...prev, page: 1 }));
    };

    return (
        <div className="p-4 pb-20 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/bao-cao?tab=payable" className="p-2 hover:bg-muted rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold">Công nợ Phải trả</h1>
                        <p className="text-sm text-muted-foreground">Quản lý nợ nhà cung cấp</p>
                    </div>
                </div>
                <Link href="/cong-no/phai-tra/tra-tien">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Trả tiền
                    </Button>
                </Link>
            </div>

            {/* Quick Links */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                <Link href="/cong-no/phai-tra/lich-thanh-toan">
                    <Button variant="outline" size="sm">
                        <Calendar className="w-4 h-4 mr-2" />
                        Lịch thanh toán
                    </Button>
                </Link>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <TrendingDown className="w-4 h-4" />
                            <span className="text-sm">Tổng phải trả</span>
                        </div>
                        {loadingSummary ? (
                            <Skeleton className="h-7 w-24" />
                        ) : (
                            <p className="text-lg font-bold text-red-600">
                                {formatMoney(summary?.total_payable || 0)}
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <span className="text-sm">Quá hạn</span>
                        </div>
                        {loadingSummary ? (
                            <Skeleton className="h-7 w-24" />
                        ) : (
                            <p className="text-lg font-bold text-red-600">
                                {formatMoney(summary?.total_overdue || 0)}
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Clock className="w-4 h-4 text-orange-500" />
                            <span className="text-sm">Sắp đến hạn</span>
                        </div>
                        {loadingSummary ? (
                            <Skeleton className="h-7 w-24" />
                        ) : (
                            <p className="text-lg font-bold">{summary?.due_soon_count || 0} HĐ</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Building2 className="w-4 h-4" />
                            <span className="text-sm">Số NCC</span>
                        </div>
                        {loadingSummary ? (
                            <Skeleton className="h-7 w-24" />
                        ) : (
                            <p className="text-lg font-bold">{summary?.vendor_count || 0}</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Search and Filters */}
            <div className="flex gap-2">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm theo mã HĐ, tên NCC..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>
                <Select
                    value={filters.status || 'all'}
                    onValueChange={(value) =>
                        setFilters((prev) => ({
                            ...prev,
                            status: value === 'all' ? undefined : (value as any),
                            page: 1,
                        }))
                    }
                >
                    <SelectTrigger className="w-36">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value="PENDING">Chưa trả</SelectItem>
                        <SelectItem value="PARTIAL">Trả 1 phần</SelectItem>
                        <SelectItem value="PAID">Đã thanh toán</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Transaction List */}
            <div className="space-y-3">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-4">
                                <Skeleton className="h-20 w-full" />
                            </CardContent>
                        </Card>
                    ))
                ) : data?.items.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Chưa có công nợ phải trả</p>
                        </CardContent>
                    </Card>
                ) : (
                    data?.items.map((ap) => (
                        <Card key={ap.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{ap.code}</span>
                                            <StatusBadge status={ap.status} />
                                        </div>
                                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                                            <Building2 className="w-3 h-3" />
                                            {ap.vendor?.name || 'N/A'}
                                        </p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(ap.trans_date), 'dd/MM/yyyy', { locale: vi })}
                                            {ap.due_date && (
                                                <>
                                                    {' → '}
                                                    <span className={ap.days_overdue > 0 ? 'text-red-500' : ''}>
                                                        {format(new Date(ap.due_date), 'dd/MM/yyyy', { locale: vi })}
                                                    </span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-red-600">{formatMoney(ap.balance)}</p>
                                        {ap.paid_amount > 0 && (
                                            <p className="text-xs text-muted-foreground">
                                                Đã trả: {formatMoney(ap.paid_amount)}
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            / {formatMoney(ap.amount)}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Load More */}
            {data?.hasMore && (
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))}
                >
                    Xem thêm
                </Button>
            )}

            {/* Summary Footer */}
            {data && (
                <div className="text-center text-sm text-muted-foreground">
                    Hiển thị {data.items.length} / {data.total} công nợ
                </div>
            )}
        </div>
    );
}
