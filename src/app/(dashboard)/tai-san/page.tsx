// src/app/(dashboard)/tai-san/page.tsx
// Fixed Assets List Page

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAssets, useAssetSummary } from '@/hooks/use-assets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Plus,
    Search,
    Factory,
    Truck,
    Building,
    Wrench,
    PawPrint,
    Package,
    FileSpreadsheet,
} from 'lucide-react';
import { formatMoney } from '@/lib/utils';
import { AssetStatus, AssetCategory } from '@prisma/client';

const categoryIcons: Record<string, any> = {
    MACHINERY: Factory,
    VEHICLE: Truck,
    BUILDING: Building,
    EQUIPMENT: Wrench,
    LIVESTOCK: PawPrint,
    OTHER: Package,
};

const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    DISPOSED: 'bg-gray-100 text-gray-800',
    SOLD: 'bg-blue-100 text-blue-800',
    UNDER_REPAIR: 'bg-yellow-100 text-yellow-800',
};

export default function AssetsPage() {
    const [status, setStatus] = useState<AssetStatus | 'ALL'>('ALL');
    const [search, setSearch] = useState('');

    const { data: assetsData, isLoading: loadingAssets } = useAssets({
        status: status === 'ALL' ? undefined : status,
        search: search || undefined,
    });

    const { data: summary, isLoading: loadingSummary } = useAssetSummary();

    const assets = assetsData?.data || [];

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">🏭 Tài sản cố định</h1>
                <Link href="/tai-san/them">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Thêm TSCĐ
                    </Button>
                </Link>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-sm text-muted-foreground">Nguyên giá</div>
                        {loadingSummary ? (
                            <Skeleton className="h-7 w-32 mx-auto mt-1" />
                        ) : (
                            <div className="text-xl font-bold">
                                {formatMoney(summary?.total_original_cost || 0)}
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-sm text-muted-foreground">Đã khấu hao</div>
                        {loadingSummary ? (
                            <Skeleton className="h-7 w-32 mx-auto mt-1" />
                        ) : (
                            <div className="text-xl font-bold text-red-600">
                                {formatMoney(summary?.total_accumulated_depreciation || 0)}
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-sm text-muted-foreground">Còn lại</div>
                        {loadingSummary ? (
                            <Skeleton className="h-7 w-32 mx-auto mt-1" />
                        ) : (
                            <div className="text-xl font-bold text-green-600">
                                {formatMoney(summary?.total_book_value || 0)}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-3 items-center">
                <Tabs value={status} onValueChange={(v) => setStatus(v as any)} className="flex-1">
                    <TabsList>
                        <TabsTrigger value="ALL">
                            Tất cả ({summary?.total_count || 0})
                        </TabsTrigger>
                        <TabsTrigger value="ACTIVE">
                            Đang dùng ({summary?.active_count || 0})
                        </TabsTrigger>
                        <TabsTrigger value="DISPOSED">
                            Thanh lý ({summary?.disposed_count || 0})
                        </TabsTrigger>
                        <TabsTrigger value="SOLD">
                            Đã bán ({summary?.sold_count || 0})
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm kiếm..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Category Summary */}
            {summary?.by_category && summary.by_category.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                    {summary.by_category.map((cat) => {
                        const Icon = categoryIcons[cat.category] || Package;
                        return (
                            <Badge key={cat.category} variant="outline" className="py-1 px-3">
                                <Icon className="w-3 h-3 mr-1" />
                                {cat.category_label}: {cat.count} ({formatMoney(cat.total_value)})
                            </Badge>
                        );
                    })}
                </div>
            )}

            {/* Asset List */}
            {loadingAssets ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <Card key={i}>
                            <CardContent className="p-4">
                                <Skeleton className="h-20 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : assets.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                        {search ? 'Không tìm thấy tài sản' : 'Chưa có tài sản nào'}
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {assets.map((asset) => {
                        const Icon = categoryIcons[asset.category] || Package;

                        return (
                            <Link key={asset.id} href={`/tai-san/${asset.id}`}>
                                <Card className="hover:border-primary cursor-pointer transition-colors">
                                    <CardContent className="p-4">
                                        <div className="flex gap-4">
                                            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center shrink-0">
                                                <Icon className="w-6 h-6" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-2">
                                                    <div className="min-w-0">
                                                        <div className="font-medium truncate">{asset.name}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {asset.code} • {asset.category_label}
                                                        </div>
                                                    </div>
                                                    <Badge className={statusColors[asset.status]}>
                                                        {asset.status_label}
                                                    </Badge>
                                                </div>

                                                <div className="flex justify-between items-center mt-3">
                                                    <div className="text-sm">
                                                        Còn lại:{' '}
                                                        <span className="font-semibold">
                                                            {formatMoney(asset.book_value)}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        KH: {formatMoney(asset.monthly_depreciation)}/tháng
                                                    </div>
                                                </div>

                                                <Progress
                                                    value={asset.depreciation_progress}
                                                    className="h-2 mt-2"
                                                />
                                                <div className="text-xs text-muted-foreground mt-1 text-right">
                                                    {asset.depreciation_progress.toFixed(1)}% khấu hao
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Depreciation Schedule Link */}
            <Link href="/tai-san/bang-khau-hao">
                <Card className="hover:border-primary cursor-pointer transition-colors">
                    <CardContent className="p-4 text-center flex items-center justify-center gap-2">
                        <FileSpreadsheet className="w-5 h-5" />
                        Xem bảng khấu hao chi tiết
                    </CardContent>
                </Card>
            </Link>
        </div>
    );
}
