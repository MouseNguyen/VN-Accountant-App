// src/app/(dashboard)/bang-luong/[id]/page.tsx
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePayroll, useConfirmPayroll, usePayPayroll } from '@/hooks/use-payrolls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
    ArrowLeft, CheckCircle, CreditCard, FileText, Users, Banknote,
    Shield, Receipt, Calculator, Clock, DollarSign, Loader2
} from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; variant: any; color: string }> = {
    DRAFT: { label: 'Nháp', variant: 'secondary', color: 'text-gray-500' },
    CONFIRMED: { label: 'Đã xác nhận', variant: 'default', color: 'text-blue-500' },
    PARTIAL_PAID: { label: 'Trả một phần', variant: 'outline', color: 'text-orange-500' },
    PAID: { label: 'Đã trả hết', variant: 'default', color: 'text-green-500' },
    CANCELLED: { label: 'Đã hủy', variant: 'destructive', color: 'text-red-500' },
};

export default function PayrollDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const payrollId = params.id as string;

    const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
    const [payAmount, setPayAmount] = useState('');
    const [payMethod, setPayMethod] = useState('CASH');

    const { data: payroll, isLoading } = usePayroll(payrollId);
    const confirmPayroll = useConfirmPayroll();
    const payPayroll = usePayPayroll();

    const handleConfirm = async () => {
        try {
            await confirmPayroll.mutateAsync(payrollId);
            toast({ title: 'Thành công', description: 'Đã xác nhận bảng lương!' });
        } catch (err: any) {
            toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
        }
    };

    const handlePay = async () => {
        const amount = parseFloat(payAmount);
        if (!amount || amount <= 0) {
            toast({ title: 'Lỗi', description: 'Vui lòng nhập số tiền hợp lệ', variant: 'destructive' });
            return;
        }

        try {
            await payPayroll.mutateAsync({
                id: payrollId,
                amount,
                payment_method: payMethod as any,
            });
            toast({ title: 'Thành công', description: 'Đã chi trả lương!' });
            setIsPayDialogOpen(false);
            setPayAmount('');
        } catch (err: any) {
            toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
        }
    };

    const formatMoney = (val: number) => val?.toLocaleString('vi-VN') + 'đ';

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!payroll) {
        return (
            <div className="container mx-auto p-6 text-center">
                <p className="text-muted-foreground">Không tìm thấy bảng lương</p>
                <Button variant="link" asChild>
                    <Link href="/bang-luong">← Quay lại danh sách</Link>
                </Button>
            </div>
        );
    }

    const progress = payroll.total_net > 0
        ? (payroll.paid_amount / payroll.total_net) * 100
        : 0;
    const canConfirm = payroll.status === 'DRAFT';
    const canPay = ['CONFIRMED', 'PARTIAL_PAID'].includes(payroll.status);

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/bang-luong"><ArrowLeft className="h-5 w-5" /></Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl md:text-3xl font-bold">{payroll.code}</h1>
                            <Badge variant={STATUS_MAP[payroll.status]?.variant}>
                                {STATUS_MAP[payroll.status]?.label}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground">
                            Kỳ: {payroll.period_start} → {payroll.period_end}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    {canConfirm && (
                        <Button onClick={handleConfirm} disabled={confirmPayroll.isPending} className="gap-2">
                            <CheckCircle className="h-4 w-4" />
                            {confirmPayroll.isPending ? 'Đang xử lý...' : 'Xác nhận'}
                        </Button>
                    )}
                    {canPay && (
                        <Button onClick={() => {
                            setPayAmount(payroll.remaining_amount.toString());
                            setIsPayDialogOpen(true);
                        }} className="gap-2">
                            <CreditCard className="h-4 w-4" />
                            Chi trả
                        </Button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Users className="h-8 w-8 text-primary" />
                            <div>
                                <div className="text-2xl font-bold">{payroll.items?.length || 0}</div>
                                <div className="text-sm text-muted-foreground">Nhân viên</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Calculator className="h-8 w-8 text-blue-500" />
                            <div>
                                <div className="text-lg font-bold">{formatMoney(payroll.total_gross)}</div>
                                <div className="text-sm text-muted-foreground">Tổng Gross</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <DollarSign className="h-8 w-8 text-green-500" />
                            <div>
                                <div className="text-lg font-bold">{formatMoney(payroll.total_net)}</div>
                                <div className="text-sm text-muted-foreground">Tổng Net</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Clock className="h-8 w-8 text-orange-500" />
                            <div>
                                <div className="text-lg font-bold">{formatMoney(payroll.remaining_amount)}</div>
                                <div className="text-sm text-muted-foreground">Còn lại</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Progress */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Tiến độ chi trả</span>
                        <span className="text-sm text-muted-foreground">
                            {formatMoney(payroll.paid_amount)} / {formatMoney(payroll.total_net)}
                        </span>
                    </div>
                    <Progress value={progress} className="h-3" />
                    <div className="text-right text-sm text-muted-foreground mt-1">
                        {progress.toFixed(1)}%
                    </div>
                </CardContent>
            </Card>

            {/* Financial Summary */}
            <div className="grid md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-green-600" /> Thu nhập
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                            <span>Lương cơ bản</span>
                            <span className="font-mono">{formatMoney(payroll.total_base)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Tăng ca (OT)</span>
                            <span className="font-mono">{formatMoney(payroll.total_ot)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Phụ cấp</span>
                            <span className="font-mono">{formatMoney(payroll.total_allowance)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-medium">
                            <span>Tổng Gross</span>
                            <span className="font-mono text-green-600">{formatMoney(payroll.total_gross)}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Shield className="h-5 w-5 text-red-500" /> Khấu trừ NV (10.5%)
                        </CardTitle>
                        <CardDescription>Trừ từ lương nhân viên</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                            <span>BHXH (8%)</span>
                            <span className="font-mono text-red-500">
                                -{formatMoney(
                                    (payroll.items || []).reduce((s: number, i: any) => s + (i.bhxh_amount || 0), 0)
                                )}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>BHYT (1.5%)</span>
                            <span className="font-mono text-red-500">
                                -{formatMoney(
                                    (payroll.items || []).reduce((s: number, i: any) => s + (i.bhyt_amount || 0), 0)
                                )}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>BHTN (1%)</span>
                            <span className="font-mono text-red-500">
                                -{formatMoney(
                                    (payroll.items || []).reduce((s: number, i: any) => s + (i.bhtn_amount || 0), 0)
                                )}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Thuế TNCN</span>
                            <span className="font-mono text-red-500">
                                -{formatMoney(
                                    (payroll.items || []).reduce((s: number, i: any) => s + (i.tax_amount || 0), 0)
                                )}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Khấu trừ khác</span>
                            <span className="font-mono text-red-500">
                                -{formatMoney(payroll.total_deduction)}
                            </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-medium">
                            <span>Thực lĩnh (Net)</span>
                            <span className="font-mono text-primary">{formatMoney(payroll.total_net)}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-orange-200 bg-orange-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Banknote className="h-5 w-5 text-orange-600" /> DN phải đóng (21.5%)
                        </CardTitle>
                        <CardDescription>Chi phí BH doanh nghiệp</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                            <span>BHXH (17%)</span>
                            <span className="font-mono text-orange-600">
                                {formatMoney(
                                    (payroll.items || []).reduce((s: number, i: any) => s + (i.employer_bhxh || 0), 0)
                                )}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>BHYT (3%)</span>
                            <span className="font-mono text-orange-600">
                                {formatMoney(
                                    (payroll.items || []).reduce((s: number, i: any) => s + (i.employer_bhyt || 0), 0)
                                )}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>BHTN (1%)</span>
                            <span className="font-mono text-orange-600">
                                {formatMoney(
                                    (payroll.items || []).reduce((s: number, i: any) => s + (i.employer_bhtn || 0), 0)
                                )}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>BHTNLĐ-BNN (0.5%)</span>
                            <span className="font-mono text-orange-600">
                                {formatMoney(
                                    (payroll.items || []).reduce((s: number, i: any) => s + (i.employer_bhtnld || 0), 0)
                                )}
                            </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-medium">
                            <span>Tổng DN đóng</span>
                            <span className="font-mono text-orange-600 text-lg">
                                {formatMoney(
                                    (payroll.items || []).reduce((s: number, i: any) => s + (i.employer_insurance || 0), 0)
                                )}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Employee Details */}
            <Card>
                <CardHeader>
                    <CardTitle>Chi tiết lương từng người</CardTitle>
                    <CardDescription>
                        Bảng chi tiết lương của {payroll.items?.length || 0} nhân viên
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Mã NV</TableHead>
                                    <TableHead>Tên</TableHead>
                                    <TableHead className="text-right">Ngày công</TableHead>
                                    <TableHead className="text-right hidden md:table-cell">Lương CB</TableHead>
                                    <TableHead className="text-right hidden md:table-cell">OT</TableHead>
                                    <TableHead className="text-right hidden lg:table-cell">BHXH</TableHead>
                                    <TableHead className="text-right hidden lg:table-cell">Thuế</TableHead>
                                    <TableHead className="text-right">Net</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payroll.items?.map((item: any) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-mono text-sm">{item.worker?.code}</TableCell>
                                        <TableCell className="font-medium">{item.worker?.name}</TableCell>
                                        <TableCell className="text-right">{item.work_days}</TableCell>
                                        <TableCell className="text-right font-mono hidden md:table-cell">
                                            {formatMoney(item.base_amount)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono hidden md:table-cell">
                                            {formatMoney(
                                                item.ot_normal_amount + item.ot_weekend_amount +
                                                item.ot_holiday_amount + item.night_amount
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-red-500 hidden lg:table-cell">
                                            -{formatMoney(item.insurance_amount)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-red-500 hidden lg:table-cell">
                                            -{formatMoney(item.tax_amount)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-medium text-primary">
                                            {formatMoney(item.net_amount)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Payment History */}
            {payroll.payments && payroll.payments.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Lịch sử chi trả</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {payroll.payments.map((payment: any) => (
                                <div key={payment.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                    <div>
                                        <div className="font-medium">{formatMoney(payment.amount)}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {new Date(payment.payment_date).toLocaleDateString('vi-VN')} • {payment.payment_method}
                                        </div>
                                    </div>
                                    <Badge variant="outline">Đã trả</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Pay Dialog */}
            <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Chi trả lương</DialogTitle>
                        <DialogDescription>
                            Số tiền còn lại: {formatMoney(payroll.remaining_amount)}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Số tiền chi trả *</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={payAmount}
                                onChange={(e) => setPayAmount(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Hình thức</Label>
                            <Select value={payMethod} onValueChange={setPayMethod}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CASH">Tiền mặt</SelectItem>
                                    <SelectItem value="BANK_TRANSFER">Chuyển khoản</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPayDialogOpen(false)}>Hủy</Button>
                        <Button onClick={handlePay} disabled={payPayroll.isPending}>
                            {payPayroll.isPending ? 'Đang xử lý...' : 'Xác nhận chi trả'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
