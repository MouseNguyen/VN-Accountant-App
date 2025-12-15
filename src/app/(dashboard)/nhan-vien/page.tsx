// src/app/(dashboard)/nhan-vien/page.tsx
'use client';

import { useState } from 'react';
import { useWorkers, useCreateWorker, useUpdateWorker, useDeleteWorker } from '@/hooks/use-workers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
    Plus, Search, Users, UserCheck, UserX, Edit, Trash2, Phone,
    Banknote, Calendar, MoreHorizontal
} from 'lucide-react';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

const WORKER_TYPES = [
    { value: 'FULL_TIME', label: 'Toàn thời gian' },
    { value: 'PART_TIME', label: 'Bán thời gian' },
    { value: 'SEASONAL', label: 'Thời vụ' },
];

const SALARY_TYPES = [
    { value: 'MONTHLY', label: 'Theo tháng' },
    { value: 'DAILY', label: 'Theo ngày' },
    { value: 'HOURLY', label: 'Theo giờ' },
];

export default function WorkersPage() {
    const { toast } = useToast();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingWorker, setEditingWorker] = useState<any>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        worker_type: 'FULL_TIME',
        salary_type: 'MONTHLY',
        base_salary: '',
        dependents: '0',
        bank_name: '',
        bank_account: '',
    });

    const { data, isLoading } = useWorkers({
        search: search || undefined,
        status: statusFilter && statusFilter !== 'all' ? statusFilter as any : undefined,
        limit: 100
    });
    const createWorker = useCreateWorker();
    const updateWorker = useUpdateWorker();
    const deleteWorker = useDeleteWorker();

    const resetForm = () => {
        setFormData({
            name: '',
            phone: '',
            worker_type: 'FULL_TIME',
            salary_type: 'MONTHLY',
            base_salary: '',
            dependents: '0',
            bank_name: '',
            bank_account: '',
        });
        setEditingWorker(null);
    };

    const handleOpenCreate = () => {
        resetForm();
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (worker: any) => {
        setEditingWorker(worker);
        setFormData({
            name: worker.name,
            phone: worker.phone || '',
            worker_type: worker.worker_type,
            salary_type: worker.salary_type,
            base_salary: worker.base_salary?.toString() || '',
            dependents: worker.dependents?.toString() || '0',
            bank_name: worker.bank_name || '',
            bank_account: worker.bank_account || '',
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            toast({ title: 'Lỗi', description: 'Vui lòng nhập tên nhân viên', variant: 'destructive' });
            return;
        }

        try {
            const payload = {
                name: formData.name,
                phone: formData.phone || undefined,
                worker_type: formData.worker_type as any,
                salary_type: formData.salary_type as any,
                base_salary: formData.base_salary ? parseFloat(formData.base_salary) : 0,
                dependents: parseInt(formData.dependents) || 0,
                bank_name: formData.bank_name || undefined,
                bank_account: formData.bank_account || undefined,
            };

            if (editingWorker) {
                await updateWorker.mutateAsync({ id: editingWorker.id, ...payload });
                toast({ title: 'Thành công', description: 'Cập nhật nhân viên thành công!' });
            } else {
                await createWorker.mutateAsync(payload);
                toast({ title: 'Thành công', description: 'Thêm nhân viên thành công!' });
            }

            setIsDialogOpen(false);
            resetForm();
        } catch (err: any) {
            toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteWorker.mutateAsync(deleteId);
            toast({ title: 'Thành công', description: 'Đã xóa nhân viên' });
            setDeleteId(null);
        } catch (err: any) {
            toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
        }
    };

    const formatMoney = (val: number) => val?.toLocaleString('vi-VN') + 'đ';

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Nhân viên</h1>
                    <p className="text-muted-foreground">Quản lý danh sách nhân viên</p>
                </div>
                <Button onClick={handleOpenCreate} className="gap-2">
                    <Plus className="h-4 w-4" /> Thêm nhân viên
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-full">
                            <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{data?.total || 0}</div>
                            <div className="text-sm text-muted-foreground">Tổng NV</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-full">
                            <UserCheck className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{data?.summary?.total_active || 0}</div>
                            <div className="text-sm text-muted-foreground">Đang làm</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-full">
                            <UserX className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{data?.summary?.total_inactive || 0}</div>
                            <div className="text-sm text-muted-foreground">Nghỉ việc</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-full">
                            <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{data?.summary?.by_type?.seasonal || 0}</div>
                            <div className="text-sm text-muted-foreground">Thời vụ</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm theo tên, mã, SĐT..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full md:w-[180px]">
                                <SelectValue placeholder="Trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả</SelectItem>
                                <SelectItem value="ACTIVE">Đang làm</SelectItem>
                                <SelectItem value="INACTIVE">Nghỉ việc</SelectItem>
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
                            Chưa có nhân viên nào. Bấm "Thêm nhân viên" để bắt đầu.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Mã</TableHead>
                                    <TableHead>Tên nhân viên</TableHead>
                                    <TableHead className="hidden md:table-cell">SĐT</TableHead>
                                    <TableHead className="hidden md:table-cell">Loại</TableHead>
                                    <TableHead className="text-right">Lương cơ bản</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.items.map((worker: any) => (
                                    <TableRow key={worker.id}>
                                        <TableCell className="font-mono text-sm">{worker.code}</TableCell>
                                        <TableCell className="font-medium">{worker.name}</TableCell>
                                        <TableCell className="hidden md:table-cell">{worker.phone || '-'}</TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            {WORKER_TYPES.find(t => t.value === worker.worker_type)?.label}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {formatMoney(worker.base_salary)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={worker.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                                {worker.status === 'ACTIVE' ? 'Đang làm' : 'Nghỉ việc'}
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
                                                    <DropdownMenuItem onClick={() => handleOpenEdit(worker)}>
                                                        <Edit className="h-4 w-4 mr-2" /> Sửa
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => setDeleteId(worker.id)}
                                                        className="text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" /> Xóa
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingWorker ? 'Sửa nhân viên' : 'Thêm nhân viên mới'}</DialogTitle>
                        <DialogDescription>
                            Nhập thông tin nhân viên bên dưới
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Họ tên *</Label>
                            <Input
                                placeholder="Nguyễn Văn A"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Số điện thoại</Label>
                                <Input
                                    placeholder="0901234567"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Người phụ thuộc</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={formData.dependents}
                                    onChange={(e) => setFormData({ ...formData, dependents: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Loại nhân viên</Label>
                                <Select
                                    value={formData.worker_type}
                                    onValueChange={(v) => setFormData({ ...formData, worker_type: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {WORKER_TYPES.map(t => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Loại lương</Label>
                                <Select
                                    value={formData.salary_type}
                                    onValueChange={(v) => setFormData({ ...formData, salary_type: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SALARY_TYPES.map(t => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Lương cơ bản (VNĐ)</Label>
                            <Input
                                type="number"
                                placeholder="15000000"
                                value={formData.base_salary}
                                onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Ngân hàng</Label>
                                <Input
                                    placeholder="Vietcombank"
                                    value={formData.bank_name}
                                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Số tài khoản</Label>
                                <Input
                                    placeholder="0123456789"
                                    value={formData.bank_account}
                                    onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={createWorker.isPending || updateWorker.isPending}
                        >
                            {createWorker.isPending || updateWorker.isPending ? 'Đang lưu...' : 'Lưu'}
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
                            Bạn có chắc muốn xóa nhân viên này? Hành động này không thể hoàn tác.
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
