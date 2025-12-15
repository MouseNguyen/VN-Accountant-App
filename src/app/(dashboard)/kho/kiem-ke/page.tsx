'use client';

// src/app/(dashboard)/kho/kiem-ke/page.tsx
// Trang danh sách phiếu kiểm kê

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Plus,
    ClipboardList,
    Clock,
    CheckCircle,
    XCircle,
    ChevronRight,
    RefreshCw,
    Calendar
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useStockCounts, useCreateStockCount } from '@/hooks/use-inventory';
import { formatMoney } from '@/lib/decimal';
import { StockCount } from '@/types/inventory';
import { StockCountStatus } from '@prisma/client';

const statusConfig: Record<StockCountStatus, { label: string; color: string; icon: React.ReactNode }> = {
    DRAFT: { label: 'Nháp', color: 'bg-muted text-foreground', icon: <Clock className="h-3 w-3" /> },
    IN_PROGRESS: { label: 'Đang kiểm', color: 'bg-blue-100 text-blue-700', icon: <ClipboardList className="h-3 w-3" /> },
    COMPLETED: { label: 'Hoàn thành', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-3 w-3" /> },
    CANCELLED: { label: 'Đã hủy', color: 'bg-red-100 text-red-700', icon: <XCircle className="h-3 w-3" /> },
};

export default function StockCountListPage() {
    const router = useRouter();
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newCountDate, setNewCountDate] = useState(new Date().toISOString().split('T')[0]);

    const { data, isLoading, refetch, isRefetching } = useStockCounts();
    const createMutation = useCreateStockCount();

    const handleCreate = async () => {
        try {
            const result = await createMutation.mutateAsync({
                count_date: newCountDate,
            });
            setShowCreateDialog(false);
            router.push(`/kho/kiem-ke/${result.id}`);
        } catch (error) {
            // Error handled by hook
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-card border-b">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <Link href="/kho">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-lg font-bold">Kiểm kê kho</h1>
                            <p className="text-xs text-muted-foreground">
                                {data?.total || 0} phiếu kiểm kê
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => refetch()}
                            disabled={isRefetching}
                        >
                            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                        </Button>
                        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <Plus className="h-4 w-4 mr-1" />
                                    Tạo mới
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Tạo phiếu kiểm kê mới</DialogTitle>
                                    <DialogDescription>
                                        Chọn ngày kiểm kê để bắt đầu
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                    <Label>Ngày kiểm kê</Label>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="date"
                                            value={newCountDate}
                                            onChange={(e) => setNewCountDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                                        Hủy
                                    </Button>
                                    <Button
                                        onClick={handleCreate}
                                        disabled={createMutation.isPending}
                                    >
                                        {createMutation.isPending ? 'Đang tạo...' : 'Tạo phiếu'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="p-4 max-w-3xl mx-auto space-y-3">
                {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                        Đang tải...
                    </div>
                ) : !data?.items.length ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                            <p className="text-muted-foreground mb-4">Chưa có phiếu kiểm kê nào</p>
                            <Button onClick={() => setShowCreateDialog(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Tạo phiếu kiểm kê đầu tiên
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    data.items.map((count: StockCount) => {
                        const config = statusConfig[count.status as StockCountStatus];
                        return (
                            <Link key={count.id} href={`/kho/kiem-ke/${count.id}`}>
                                <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">{count.code}</span>
                                                    <Badge className={`text-xs ${config.color}`}>
                                                        {config.icon}
                                                        <span className="ml-1">{config.label}</span>
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    Ngày: {count.count_date}
                                                </p>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-sm">
                                            <div>
                                                <span className="text-muted-foreground">Sản phẩm:</span>
                                                <span className="ml-1 font-medium">{count.total_products}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Chênh lệch:</span>
                                                <span className={`ml-1 font-medium ${count.total_variance !== 0 ? (count.total_variance > 0 ? 'text-green-600' : 'text-red-600') : ''}`}>
                                                    {count.total_variance > 0 ? '+' : ''}{formatMoney(count.total_variance)}đ
                                                </span>
                                            </div>
                                            {count.completed_at && (
                                                <div className="text-right">
                                                    <span className="text-muted-foreground text-xs">
                                                        Hoàn thành: {new Date(count.completed_at).toLocaleDateString('vi-VN')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })
                )}
            </main>
        </div>
    );
}
