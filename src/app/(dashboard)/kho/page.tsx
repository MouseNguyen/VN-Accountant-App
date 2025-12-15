'use client';

// src/app/(dashboard)/kho/page.tsx
// Trang danh sách tồn kho

import { useState } from 'react';
import Link from 'next/link';
import {
    Package,
    ArrowLeft,
    Plus,
    Minus,
    Search,
    AlertTriangle,
    PackageX,
    TrendingUp,
    RefreshCw,
    Sliders
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useStocks } from '@/hooks/use-inventory';
import { formatMoney, formatQuantity } from '@/lib/decimal';
import { StockListParams } from '@/types/inventory';

export default function InventoryPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [params, setParams] = useState<StockListParams>({
        page: 1,
        limit: 20,
        sort_by: 'name',
        sort_order: 'asc',
    });

    const { data, isLoading, refetch, isRefetching } = useStocks({
        ...params,
        search: searchTerm || undefined,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setParams({ ...params, page: 1 });
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-card border-b">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-lg font-bold">Quản lý Kho</h1>
                            <p className="text-xs text-muted-foreground">
                                {data?.summary.total_products || 0} sản phẩm
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => refetch()}
                        disabled={isRefetching}
                    >
                        <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="p-4 space-y-4 max-w-7xl mx-auto">
                {/* Quick Actions */}
                <div className="grid grid-cols-3 gap-3">
                    <Link href="/kho/nhap">
                        <Card className="hover:border-emerald-500 transition-colors cursor-pointer">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900">
                                    <Plus className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="font-semibold">Nhập kho</p>
                                    <p className="text-xs text-muted-foreground">Thêm hàng</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/kho/xuat">
                        <Card className="hover:border-orange-500 transition-colors cursor-pointer">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
                                    <Minus className="h-5 w-5 text-orange-600" />
                                </div>
                                <div>
                                    <p className="font-semibold">Xuất kho</p>
                                    <p className="text-xs text-muted-foreground">Xuất hàng</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/kho/kiem-ke">
                        <Card className="hover:border-blue-500 transition-colors cursor-pointer">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                                    <Package className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-semibold">Kiểm kê</p>
                                    <p className="text-xs text-muted-foreground">Đối chiếu</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/kho/dieu-chinh">
                        <Card className="hover:border-primary transition-colors cursor-pointer">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                                    <Sliders className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold">Điều chỉnh</p>
                                    <p className="text-xs text-muted-foreground">Sửa tồn</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/kho/nhap-excel">
                        <Card className="hover:border-teal-500 transition-colors cursor-pointer">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900">
                                    <TrendingUp className="h-5 w-5 text-teal-600" />
                                </div>
                                <div>
                                    <p className="font-semibold">Import</p>
                                    <p className="text-xs text-muted-foreground">Excel</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-muted-foreground">Tổng giá trị</p>
                                    <p className="text-lg font-bold text-emerald-600">
                                        {formatMoney(data?.summary.total_value || 0)}đ
                                    </p>
                                </div>
                                <TrendingUp className="h-5 w-5 text-emerald-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-muted-foreground">Sản phẩm</p>
                                    <p className="text-lg font-bold">
                                        {data?.summary.total_products || 0}
                                    </p>
                                </div>
                                <Package className="h-5 w-5 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-muted-foreground">Tồn thấp</p>
                                    <p className="text-lg font-bold text-amber-600">
                                        {data?.summary.low_stock_count || 0}
                                    </p>
                                </div>
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-muted-foreground">Hết hàng</p>
                                    <p className="text-lg font-bold text-red-600">
                                        {data?.summary.out_of_stock_count || 0}
                                    </p>
                                </div>
                                <PackageX className="h-5 w-5 text-red-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search */}
                <form onSubmit={handleSearch}>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm sản phẩm..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </form>

                {/* Stock List */}
                <div className="space-y-2">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Đang tải...
                        </div>
                    ) : !data?.items.length ? (
                        <Card>
                            <CardContent className="py-8 text-center">
                                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                                <p className="text-muted-foreground">Chưa có sản phẩm trong kho</p>
                                <Link href="/kho/nhap">
                                    <Button className="mt-4">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Nhập kho
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ) : (
                        data.items.map((stock) => (
                            <Card key={stock.id} className="hover:border-primary/30 transition-colors">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{stock.product?.name}</span>
                                                {stock.quantity <= 0 && (
                                                    <Badge variant="destructive" className="text-xs">Hết</Badge>
                                                )}
                                                {stock.min_quantity && stock.quantity > 0 && stock.quantity <= stock.min_quantity && (
                                                    <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                                                        Tồn thấp
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {stock.product?.code}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-lg">
                                                {formatQuantity(stock.quantity)} {stock.product?.unit}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatMoney(stock.avg_cost)}đ/{stock.product?.unit}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-2 pt-2 border-t flex justify-between text-sm">
                                        <span className="text-muted-foreground">Giá trị:</span>
                                        <span className="font-medium">{formatMoney(stock.total_value)}đ</span>
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
                        onClick={() => setParams({ ...params, page: (params.page || 1) + 1 })}
                    >
                        Xem thêm
                    </Button>
                )}
            </main>
        </div>
    );
}
