// src/app/(dashboard)/tai-san/bang-khau-hao/page.tsx
// Depreciation Schedule Page

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useDepreciationSchedule, useRunDepreciation, useAssets } from '@/hooks/use-assets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Play, Download, Calendar } from 'lucide-react';
import { formatMoney } from '@/lib/utils';

export default function DepreciationSchedulePage() {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState<number>(currentYear);
    const [assetId, setAssetId] = useState<string | undefined>(undefined);

    const { data: schedule, isLoading } = useDepreciationSchedule(assetId, assetId ? undefined : year);
    const { data: assetsData } = useAssets({ status: 'ACTIVE' });
    const runDepreciation = useRunDepreciation();

    const assets = assetsData?.data || [];

    // Generate year options (last 5 years)
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

    // Group by asset
    const groupedByAsset = schedule?.reduce((acc, row) => {
        if (!acc[row.asset_code]) {
            acc[row.asset_code] = {
                asset_code: row.asset_code,
                asset_name: row.asset_name,
                rows: [],
            };
        }
        acc[row.asset_code].rows.push(row);
        return acc;
    }, {} as Record<string, { asset_code: string; asset_name: string; rows: typeof schedule }>);

    const totalDepreciation = schedule?.reduce((sum, r) => sum + r.depreciation_amount, 0) || 0;

    const handleRunDepreciation = async () => {
        const period = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        await runDepreciation.mutateAsync(period);
    };

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/tai-san">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold">📋 Bảng khấu hao</h1>
                </div>

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button>
                            <Play className="w-4 h-4 mr-2" />
                            Tính khấu hao tháng này
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Xác nhận tính khấu hao?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Hệ thống sẽ tính khấu hao cho tất cả tài sản đang hoạt động trong tháng{' '}
                                {new Date().getMonth() + 1}/{currentYear}.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleRunDepreciation}
                                disabled={runDepreciation.isPending}
                            >
                                {runDepreciation.isPending ? 'Đang xử lý...' : 'Xác nhận'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <Select
                        value={String(year)}
                        onValueChange={(v) => {
                            setYear(Number(v));
                            setAssetId(undefined);
                        }}
                    >
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {yearOptions.map((y) => (
                                <SelectItem key={y} value={String(y)}>
                                    Năm {y}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Select
                    value={assetId || 'all'}
                    onValueChange={(v) => setAssetId(v === 'all' ? undefined : v)}
                >
                    <SelectTrigger className="w-64">
                        <SelectValue placeholder="Tất cả tài sản" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả tài sản</SelectItem>
                        {assets.map((asset) => (
                            <SelectItem key={asset.id} value={asset.id}>
                                {asset.code} - {asset.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="flex-1" />

                <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Xuất Excel
                </Button>
            </div>

            {/* Summary */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="text-sm text-muted-foreground">
                                Tổng khấu hao {assetId ? '' : `năm ${year}`}
                            </div>
                            <div className="text-2xl font-bold text-red-600">
                                {formatMoney(totalDepreciation)}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-muted-foreground">Số bản ghi</div>
                            <div className="text-xl font-semibold">{schedule?.length || 0}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            {isLoading ? (
                <Card>
                    <CardContent className="p-4">
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            ) : !schedule || schedule.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center space-y-4">
                        <div className="text-muted-foreground">
                            Chưa có dữ liệu khấu hao cho năm {year}
                        </div>
                        {assets.length > 0 ? (
                            <div className="space-y-4">
                                <div className="text-sm text-blue-600">
                                    Bạn có {assets.length} tài sản đang hoạt động.
                                    Nhấn "Tính khấu hao tháng này" để tạo bản ghi khấu hao.
                                </div>
                                <div className="border rounded-lg p-4 bg-muted/30">
                                    <div className="text-sm font-medium mb-2">Tài sản đang hoạt động:</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-left text-sm">
                                        {assets.slice(0, 6).map(asset => (
                                            <div key={asset.id} className="flex justify-between items-center p-2 bg-background rounded border">
                                                <div>
                                                    <div className="font-mono text-xs text-muted-foreground">{asset.code}</div>
                                                    <div>{asset.name}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-muted-foreground">KH/tháng</div>
                                                    <div className="text-red-600 font-medium">{formatMoney(asset.monthly_depreciation)}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {assets.length > 6 && (
                                            <div className="text-center text-muted-foreground p-2">
                                                ... và {assets.length - 6} tài sản khác
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground">
                                <Link href="/tai-san/them" className="text-blue-600 hover:underline">
                                    Tạo tài sản mới
                                </Link> để bắt đầu theo dõi khấu hao.
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Mã TS</TableHead>
                                    <TableHead>Tên tài sản</TableHead>
                                    <TableHead>Kỳ</TableHead>
                                    <TableHead className="text-right">Khấu hao</TableHead>
                                    <TableHead className="text-right">Lũy kế</TableHead>
                                    <TableHead className="text-right">Còn lại</TableHead>
                                    <TableHead className="text-center">Ghi sổ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {schedule.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-mono">{row.asset_code}</TableCell>
                                        <TableCell>{row.asset_name}</TableCell>
                                        <TableCell>{row.period}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatMoney(row.depreciation_amount)}
                                        </TableCell>
                                        <TableCell className="text-right text-red-600">
                                            {formatMoney(row.accumulated_amount)}
                                        </TableCell>
                                        <TableCell className="text-right text-green-600">
                                            {formatMoney(row.remaining_value)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={row.is_posted ? 'default' : 'outline'}>
                                                {row.is_posted ? 'Đã ghi' : 'Chưa ghi'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
