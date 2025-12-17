// src/app/(dashboard)/tai-san/[id]/page.tsx
// Asset Detail Page

'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAsset, useDeleteAsset, useDepreciationSchedule } from '@/hooks/use-assets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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
import {
    ArrowLeft,
    Edit,
    Trash2,
    Package,
    Calendar,
    MapPin,
    Hash,
    Receipt,
    Building,
    TrendingDown,
    AlertTriangle,
} from 'lucide-react';
import { formatMoney, formatDate } from '@/lib/utils';

const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    DISPOSED: 'bg-gray-100 text-gray-800',
    SOLD: 'bg-blue-100 text-blue-800',
    UNDER_REPAIR: 'bg-yellow-100 text-yellow-800',
};

export default function AssetDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const { data: asset, isLoading } = useAsset(id);
    const { data: schedule } = useDepreciationSchedule(id);
    const deleteAsset = useDeleteAsset();

    const handleDelete = async () => {
        try {
            await deleteAsset.mutateAsync(id);
            router.push('/tai-san');
        } catch (error) {
            // Error handled by mutation
        }
    };

    if (isLoading) {
        return (
            <div className="p-4 space-y-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!asset) {
        return (
            <div className="p-4 text-center">
                <h1 className="text-xl font-bold text-red-600">Tài sản không tồn tại</h1>
                <Link href="/tai-san">
                    <Button className="mt-4">Quay lại</Button>
                </Link>
            </div>
        );
    }

    const isActive = asset.status === 'ACTIVE';
    const hasSchedule = schedule && schedule.length > 0;

    return (
        <div className="p-4 space-y-4 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/tai-san">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">{asset.name}</h1>
                        <div className="text-muted-foreground">{asset.code}</div>
                    </div>
                </div>
                <Badge className={statusColors[asset.status]}>{asset.status_label}</Badge>
            </div>

            {/* Main Info */}
            <div className="grid md:grid-cols-2 gap-4">
                {/* Left - Basic Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            Thông tin tài sản
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Loại:</span>
                            <span className="font-medium">{asset.category_label}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Ngày mua:</span>
                            <span className="font-medium">{formatDate(asset.purchase_date)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Giá mua:</span>
                            <span className="font-medium">{formatMoney(asset.purchase_price)}</span>
                        </div>
                        {asset.supplier && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Nhà cung cấp:</span>
                                <span className="font-medium">{asset.supplier}</span>
                            </div>
                        )}
                        {asset.invoice_number && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Số HĐ:</span>
                                <span className="font-medium">{asset.invoice_number}</span>
                            </div>
                        )}
                        {asset.location && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Vị trí:</span>
                                <span className="font-medium">{asset.location}</span>
                            </div>
                        )}
                        {asset.serial_number && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Số seri:</span>
                                <span className="font-medium">{asset.serial_number}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Right - Depreciation Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingDown className="w-5 h-5" />
                            Khấu hao
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Nguyên giá:</span>
                            <span className="font-medium">{formatMoney(asset.original_cost)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Đã khấu hao:</span>
                            <span className="font-medium text-red-600">
                                {formatMoney(asset.accumulated_depreciation)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Giá trị còn lại:</span>
                            <span className="font-bold text-green-600">
                                {formatMoney(asset.book_value)}
                            </span>
                        </div>

                        <div className="pt-2">
                            <div className="flex justify-between text-sm mb-1">
                                <span>Tiến độ khấu hao</span>
                                <span>{asset.depreciation_progress.toFixed(1)}%</span>
                            </div>
                            <Progress value={asset.depreciation_progress} className="h-3" />
                        </div>

                        <div className="pt-2 border-t">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Thời gian sử dụng:</span>
                                <span className="font-medium">
                                    {asset.useful_life_months} tháng ({asset.useful_life_years} năm)
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">KH hàng tháng:</span>
                                <span className="font-medium">
                                    {formatMoney(asset.monthly_depreciation)}
                                </span>
                            </div>
                        </div>

                        {asset.max_deductible_value && (
                            <div className="p-2 bg-yellow-50 rounded border border-yellow-200 text-sm">
                                <div className="flex items-center gap-1 text-yellow-800">
                                    <AlertTriangle className="w-4 h-4" />
                                    Giới hạn khấu trừ thuế: {formatMoney(asset.max_deductible_value)}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Disposal Info */}
            {(asset.status === 'DISPOSED' || asset.status === 'SOLD') && (
                <Card className="border-yellow-300 bg-yellow-50">
                    <CardHeader>
                        <CardTitle>Thông tin thanh lý</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Ngày thanh lý:</span>
                            <span className="font-medium">
                                {asset.disposed_at ? formatDate(asset.disposed_at) : '-'}
                            </span>
                        </div>
                        {asset.disposed_value !== undefined && asset.disposed_value > 0 && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Giá bán:</span>
                                <span className="font-medium">{formatMoney(asset.disposed_value)}</span>
                            </div>
                        )}
                        {asset.gain_loss !== undefined && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Lãi/Lỗ:</span>
                                <span
                                    className={`font-bold ${asset.gain_loss >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}
                                >
                                    {asset.gain_loss >= 0 ? '+' : ''}
                                    {formatMoney(asset.gain_loss)}
                                </span>
                            </div>
                        )}
                        {asset.disposal_reason && (
                            <div>
                                <span className="text-muted-foreground">Lý do:</span>
                                <p className="mt-1">{asset.disposal_reason}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Depreciation Schedule */}
            {hasSchedule && (
                <Card>
                    <CardHeader>
                        <CardTitle>Lịch sử khấu hao</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Kỳ</TableHead>
                                    <TableHead className="text-right">Khấu hao</TableHead>
                                    <TableHead className="text-right">Lũy kế</TableHead>
                                    <TableHead className="text-right">Còn lại</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {schedule.slice(0, 12).map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>{row.period}</TableCell>
                                        <TableCell className="text-right">
                                            {formatMoney(row.depreciation_amount)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatMoney(row.accumulated_amount)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatMoney(row.remaining_value)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {schedule.length > 12 && (
                            <p className="text-sm text-muted-foreground text-center mt-2">
                                ... và {schedule.length - 12} kỳ khác
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end">
                {isActive && (
                    <>
                        <Link href={`/tai-san/${id}/sua`}>
                            <Button variant="outline">
                                <Edit className="w-4 h-4 mr-2" />
                                Chỉnh sửa
                            </Button>
                        </Link>

                        <Link href={`/tai-san/${id}/thanh-ly`}>
                            <Button variant="outline">
                                <Package className="w-4 h-4 mr-2" />
                                Thanh lý / Bán
                            </Button>
                        </Link>
                    </>
                )}

                {!hasSchedule && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Xóa
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Xác nhận xóa tài sản?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Bạn có chắc muốn xóa tài sản "{asset.name}"? Hành động này không thể hoàn tác.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Hủy</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete}>
                                    Xóa
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
        </div>
    );
}
