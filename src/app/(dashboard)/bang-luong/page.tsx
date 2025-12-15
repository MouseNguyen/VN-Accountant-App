// src/app/(dashboard)/bang-luong/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePayrolls, useCreatePayroll, useDeletePayroll } from '@/hooks/use-payrolls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
    Plus, FileText, Banknote, Clock, TrendingUp, Eye, Trash2,
    Calendar, DollarSign, MoreHorizontal, CheckCircle2
} from 'lucide-react';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

const STATUS_MAP: Record<string, { label: string; variant: any }> = {
    DRAFT: { label: 'Nháp', variant: 'secondary' },
    CONFIRMED: { label: 'Đã xác nhận', variant: 'default' },
    PARTIAL_PAID: { label: 'Trả một phần', variant: 'outline' },
    PAID: { label: 'Đã trả', variant: 'default' },
    CANCELLED: { label: 'Đã hủy', variant: 'destructive' },
};

export default function PayrollsPage() {
    const { toast } = useToast();
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Form state
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [formData, setFormData] = useState({
        period_start: firstDay.toISOString().split('T')[0],
        period_end: lastDay.toISOString().split('T')[0],
        period_type: 'MONTHLY',
        note: '',
    });

    const { data, isLoading } = usePayrolls({
        status: statusFilter && statusFilter !== 'all' ? statusFilter as any : undefined,
        limit: 50
    });
    const createPayroll = useCreatePayroll();
    const deletePayroll = useDeletePayroll();

    const handleCreate = async () => {
        try {
            const result = await createPayroll.mutateAsync({
                period_start: formData.period_start,
                period_end: formData.period_end,
                period_type: formData.period_type as any,
                note: formData.note || undefined,
            });
            toast({
                title: 'Thành công',
                description: `Đã tạo bảng lương ${result.code}`
            });
            setIsDialogOpen(false);
        } catch (err: any) {
            toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deletePayroll.mutateAsync(deleteId);
            toast({ title: 'Thành công', description: 'Đã xóa bảng lương' });
            setDeleteId(null);
        } catch (err: any) {
            toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
        }
    };

    const formatMoney = (val: number) => val?.toLocaleString('vi-VN') + 'đ';

    const totalNet = data?.items?.reduce((sum: number, p: any) => sum + (p.total_net || 0), 0) || 0;
    const totalPaid = data?.items?.reduce((sum: number, p: any) => sum + (p.paid_amount || 0), 0) || 0;

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Bảng lương</h1>
                    <p className="text-muted-foreground">Quản lý bảng lương theo kỳ</p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Tạo bảng lương
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-full">
                            <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{data?.total || 0}</div>
                            <div className="text-sm text-muted-foreground">Tổng bảng lương</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-full">
                            <DollarSign className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <div className="text-lg font-bold">{formatMoney(totalNet)}</div>
                            <div className="text-sm text-muted-foreground">Tổng lương Net</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-full">
                            <CheckCircle2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <div className="text-lg font-bold">{formatMoney(totalPaid)}</div>
                            <div className="text-sm text-muted-foreground">Đã chi trả</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-full">
                            <Clock className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <div className="text-lg font-bold">{formatMoney(totalNet - totalPaid)}</div>
                            <div className="text-sm text-muted-foreground">Còn lại</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex gap-4">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả</SelectItem>
                                <SelectItem value="DRAFT">Nháp</SelectItem>
                                <SelectItem value="CONFIRMED">Đã xác nhận</SelectItem>
                                <SelectItem value="PARTIAL_PAID">Trả một phần</SelectItem>
                                <SelectItem value="PAID">Đã trả</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-8 text-center text-muted-foreground">Đang tải...</div>
                    ) : !data?.items?.length ? (
                        <div className="p-8 text-center text-muted-foreground">
                            Chưa có bảng lương nào. Bấm "Tạo bảng lương" để bắt đầu.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Mã</TableHead>
                                    <TableHead>Kỳ lương</TableHead>
                                    <TableHead className="hidden md:table-cell">Số NV</TableHead>
                                    <TableHead className="text-right">Tổng Net</TableHead>
                                    <TableHead className="hidden md:table-cell">Tiến độ</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.items.map((payroll: any) => {
                                    const progress = payroll.total_net > 0
                                        ? (payroll.paid_amount / payroll.total_net) * 100
                                        : 0;

                                    return (
                                        <TableRow key={payroll.id}>
                                            <TableCell>
                                                <Link href={`/bang-luong/${payroll.id}`} className="font-mono text-sm text-primary hover:underline">
                                                    {payroll.code}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                                    {payroll.period_start} → {payroll.period_end}
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                {payroll.item_count} người
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-medium">
                                                {formatMoney(payroll.total_net)}
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell w-[150px]">
                                                <div className="space-y-1">
                                                    <Progress value={progress} className="h-2" />
                                                    <div className="text-xs text-muted-foreground text-right">
                                                        {progress.toFixed(0)}%
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={STATUS_MAP[payroll.status]?.variant || 'secondary'}>
                                                    {STATUS_MAP[payroll.status]?.label || payroll.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/bang-luong/${payroll.id}`}>
                                                                <Eye className="h-4 w-4 mr-2" /> Xem chi tiết
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        {payroll.status === 'DRAFT' && (
                                                            <DropdownMenuItem
                                                                onClick={() => setDeleteId(payroll.id)}
                                                                className="text-destructive"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" /> Xóa
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Create Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Tạo bảng lương mới</DialogTitle>
                        <DialogDescription>
                            Chọn kỳ lương và hệ thống sẽ tự động tính lương cho tất cả nhân viên
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Từ ngày *</Label>
                                <Input
                                    type="date"
                                    value={formData.period_start}
                                    onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Đến ngày *</Label>
                                <Input
                                    type="date"
                                    value={formData.period_end}
                                    onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Loại kỳ</Label>
                            <Select
                                value={formData.period_type}
                                onValueChange={(v) => setFormData({ ...formData, period_type: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MONTHLY">Theo tháng</SelectItem>
                                    <SelectItem value="BIWEEKLY">2 tuần</SelectItem>
                                    <SelectItem value="WEEKLY">Theo tuần</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>Ghi chú</Label>
                            <Input
                                placeholder="Ghi chú thêm (không bắt buộc)"
                                value={formData.note}
                                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                        <Button onClick={handleCreate} disabled={createPayroll.isPending}>
                            {createPayroll.isPending ? 'Đang tạo...' : 'Tạo bảng lương'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc muốn xóa bảng lương này? Chỉ có thể xóa bảng lương ở trạng thái Nháp.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                            Xóa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
