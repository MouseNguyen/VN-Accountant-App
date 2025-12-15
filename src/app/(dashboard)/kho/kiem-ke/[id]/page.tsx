'use client';

// src/app/(dashboard)/kho/kiem-ke/[id]/page.tsx
// Trang chi tiết phiếu kiểm kê

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Save,
    CheckCircle,
    AlertCircle,
    Minus,
    Plus,
    RefreshCw,
    Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import {
    useStockCount,
    useUpdateStockCountItem,
    useCompleteStockCount,
    useCancelStockCount
} from '@/hooks/use-inventory';
import { formatMoney, formatQuantity } from '@/lib/decimal';
import { StockCountItem } from '@/types/inventory';

export default function StockCountDetailPage() {
    const params = useParams();
    const router = useRouter();
    const countId = params.id as string;

    const { data: count, isLoading, refetch } = useStockCount(countId);
    const updateItemMutation = useUpdateStockCountItem();
    const completeMutation = useCompleteStockCount();
    const cancelMutation = useCancelStockCount();

    const [showCompleteDialog, setShowCompleteDialog] = useState(false);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [autoAdjust, setAutoAdjust] = useState(true);
    const [editingItem, setEditingItem] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    const isEditable = count?.status === 'DRAFT' || count?.status === 'IN_PROGRESS';

    const handleSaveItem = async (item: StockCountItem) => {
        const countedQty = parseFloat(editValue);
        if (isNaN(countedQty) || countedQty < 0) return;

        try {
            await updateItemMutation.mutateAsync({
                item_id: item.id,
                counted_qty: countedQty,
            });
            setEditingItem(null);
            refetch();
        } catch (error) {
            // Error handled by hook
        }
    };

    const handleComplete = async () => {
        try {
            await completeMutation.mutateAsync({ id: countId, autoAdjust });
            setShowCompleteDialog(false);
            router.push('/kho/kiem-ke');
        } catch (error) {
            // Error handled by hook
        }
    };

    const handleCancel = async () => {
        try {
            await cancelMutation.mutateAsync(countId);
            setShowCancelDialog(false);
            router.push('/kho/kiem-ke');
        } catch (error) {
            // Error handled by hook
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-muted-foreground">Đang tải...</p>
            </div>
        );
    }

    if (!count) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-muted-foreground">Không tìm thấy phiếu kiểm kê</p>
                <Link href="/kho/kiem-ke">
                    <Button>Quay lại</Button>
                </Link>
            </div>
        );
    }

    const hasVariance = count.items?.some(item => item.variance_qty !== 0);

    return (
        <div className="min-h-screen bg-background pb-24">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-card border-b">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <Link href="/kho/kiem-ke">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-lg font-bold">{count.code}</h1>
                            <p className="text-xs text-muted-foreground">
                                {count.count_date}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isEditable && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowCancelDialog(true)}
                            >
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => refetch()}
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Summary Card */}
            <div className="p-4">
                <Card className={count.total_variance !== 0 ? 'border-amber-300' : 'border-green-300'}>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-xs text-muted-foreground">Sản phẩm</p>
                                <p className="text-xl font-bold">{count.total_products}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Trạng thái</p>
                                <Badge className={`mt-1 ${count.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                        count.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                            count.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                                'bg-gray-100 text-gray-700'
                                    }`}>
                                    {count.status === 'DRAFT' && 'Nháp'}
                                    {count.status === 'IN_PROGRESS' && 'Đang kiểm'}
                                    {count.status === 'COMPLETED' && 'Hoàn thành'}
                                    {count.status === 'CANCELLED' && 'Đã hủy'}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Chênh lệch</p>
                                <p className={`text-xl font-bold ${count.total_variance > 0 ? 'text-green-600' : count.total_variance < 0 ? 'text-red-600' : ''}`}>
                                    {count.total_variance > 0 ? '+' : ''}{formatMoney(count.total_variance)}đ
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Items List */}
            <div className="px-4 space-y-2">
                <h2 className="font-semibold mb-3">Chi tiết kiểm kê</h2>
                {count.items?.map((item) => (
                    <Card key={item.id} className={item.variance_qty !== 0 ? 'border-amber-200' : ''}>
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <p className="font-medium">{item.product?.name}</p>
                                    <p className="text-sm text-muted-foreground">{item.product?.code}</p>
                                </div>
                                {item.variance_qty !== 0 && (
                                    <Badge variant="secondary" className={item.variance_qty > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                        {item.variance_qty > 0 ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                                        {Math.abs(item.variance_qty)}
                                    </Badge>
                                )}
                            </div>

                            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                                <div>
                                    <p className="text-xs text-muted-foreground">Hệ thống</p>
                                    <p className="font-medium">{formatQuantity(item.system_qty)} {item.product?.unit}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Thực tế</p>
                                    {editingItem === item.id ? (
                                        <div className="flex gap-1">
                                            <Input
                                                type="number"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                className="h-8 w-20 text-sm"
                                                autoFocus
                                                min="0"
                                                step="0.001"
                                            />
                                            <Button
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() => handleSaveItem(item)}
                                                disabled={updateItemMutation.isPending}
                                            >
                                                <Save className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <p
                                            className={`font-medium ${isEditable ? 'cursor-pointer hover:text-primary' : ''}`}
                                            onClick={() => {
                                                if (isEditable) {
                                                    setEditingItem(item.id);
                                                    setEditValue(String(item.counted_qty));
                                                }
                                            }}
                                        >
                                            {formatQuantity(item.counted_qty)} {item.product?.unit}
                                            {isEditable && <span className="text-xs text-muted-foreground ml-1">(nhấn để sửa)</span>}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-muted-foreground">Giá trị CL</p>
                                    <p className={`font-medium ${item.variance_value > 0 ? 'text-green-600' : item.variance_value < 0 ? 'text-red-600' : ''}`}>
                                        {item.variance_value > 0 ? '+' : ''}{formatMoney(item.variance_value)}đ
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Fixed Bottom Actions */}
            {isEditable && (
                <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4">
                    <div className="max-w-3xl mx-auto">
                        <Button
                            className="w-full h-12 text-lg"
                            onClick={() => setShowCompleteDialog(true)}
                        >
                            <CheckCircle className="h-5 w-5 mr-2" />
                            Hoàn thành kiểm kê
                        </Button>
                    </div>
                </div>
            )}

            {/* Complete Dialog */}
            <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hoàn thành kiểm kê</DialogTitle>
                        <DialogDescription>
                            {hasVariance
                                ? 'Có chênh lệch giữa tồn kho hệ thống và thực tế. Bạn có muốn tự động điều chỉnh?'
                                : 'Tồn kho đã khớp, không cần điều chỉnh.'}
                        </DialogDescription>
                    </DialogHeader>

                    {hasVariance && (
                        <div className="py-4">
                            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-amber-500" />
                                    <div>
                                        <p className="font-medium">Tự động điều chỉnh tồn kho</p>
                                        <p className="text-sm text-muted-foreground">
                                            System sẽ tạo phiếu điều chỉnh tự động
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    checked={autoAdjust}
                                    onCheckedChange={setAutoAdjust}
                                />
                            </div>

                            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                                <p className="text-sm font-medium">Tổng chênh lệch:</p>
                                <p className={`text-lg font-bold ${count.total_variance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {count.total_variance > 0 ? '+' : ''}{formatMoney(count.total_variance)}đ
                                </p>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
                            Hủy
                        </Button>
                        <Button
                            onClick={handleComplete}
                            disabled={completeMutation.isPending}
                        >
                            {completeMutation.isPending ? 'Đang xử lý...' : 'Xác nhận'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancel Dialog */}
            <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hủy phiếu kiểm kê?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Phiếu kiểm kê {count.code} sẽ bị hủy và không thể khôi phục.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Không</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancel}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Hủy phiếu
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
