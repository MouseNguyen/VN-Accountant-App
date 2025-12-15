// src/app/(dashboard)/cong-no/payment-dialog.tsx
// Dialog thanh toán công nợ với cảnh báo vượt hạn mức

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    CreditCard,
    AlertTriangle,
    CheckCircle2,
    Wallet,
    Building2,
    Receipt,
    ArrowRight,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePayDebt } from '@/hooks/use-payables';
import { toast } from 'sonner';
import type { PartnerPayable, UnpaidInvoice } from '@/types/payable';

// Payment methods
const PAYMENT_METHODS = [
    { value: 'CASH', label: 'Tiền mặt', icon: Wallet },
    { value: 'BANK_TRANSFER', label: 'Chuyển khoản', icon: Building2 },
];

// Form schema
const paymentFormSchema = z.object({
    amount: z.number().positive('Số tiền phải lớn hơn 0'),
    payment_method: z.enum(['CASH', 'BANK_TRANSFER']),
    notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

interface PaymentDialogProps {
    open: boolean;
    onClose: () => void;
    partner: PartnerPayable;
}

export function PaymentDialog({ open, onClose, partner }: PaymentDialogProps) {
    const [showWarning, setShowWarning] = useState(false);

    const { mutate: payDebt, isPending } = usePayDebt();

    const {
        control,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm<PaymentFormData>({
        resolver: zodResolver(paymentFormSchema),
        defaultValues: {
            amount: 0,
            payment_method: 'CASH',
            notes: '',
        },
    });

    const amount = watch('amount');

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            reset({
                amount: parseFloat(partner.balance.toString()),
                payment_method: 'CASH',
                notes: '',
            });
            setShowWarning(false);
        }
    }, [open, partner.balance, reset]);

    // Check if amount exceeds balance
    const exceedsBalance = useMemo(() => {
        return amount > parseFloat(partner.balance.toString());
    }, [amount, partner.balance]);

    // Calculate remaining after payment
    const remainingBalance = useMemo(() => {
        const balance = parseFloat(partner.balance.toString());
        return Math.max(0, balance - amount);
    }, [amount, partner.balance]);

    // Handle quick amount buttons
    const handleQuickAmount = (percentage: number) => {
        const balance = parseFloat(partner.balance.toString());
        setValue('amount', Math.round(balance * percentage));
    };

    // Format money
    const formatMoney = (value: number | string) => {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(num);
    };

    // Handle form submit
    const onSubmit = (data: PaymentFormData) => {
        if (exceedsBalance && !showWarning) {
            setShowWarning(true);
            return;
        }

        payDebt(
            {
                partner_id: partner.partner_id,
                amount: Math.min(data.amount, parseFloat(partner.balance.toString())),
                payment_method: data.payment_method,
                note: data.notes,
            },
            {
                onSuccess: (result) => {
                    toast.success(`Đã thanh toán ${formatMoney(data.amount)} cho ${partner.partner_name}`);
                    onClose();
                },
                onError: (error) => {
                    toast.error(error.message || 'Lỗi thanh toán');
                },
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        Thanh toán công nợ
                    </DialogTitle>
                    <DialogDescription>
                        Thanh toán cho {partner.partner_name}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Partner Info Card */}
                    <Card className="bg-muted border-border">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <div className="font-medium text-lg">{partner.partner_name}</div>
                                    <div className="text-sm text-muted-foreground">{partner.partner_code}</div>
                                </div>
                                {partner.overdue_days > 0 && (
                                    <Badge className="bg-red-100 text-red-800 gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        Quá hạn {partner.overdue_days} ngày
                                    </Badge>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Tổng nợ:</span>
                                    <span className="font-bold text-red-600 ml-2">
                                        {formatMoney(partner.balance)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Quá hạn:</span>
                                    <span className="font-medium text-red-600 ml-2">
                                        {formatMoney(partner.overdue_balance)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Số hóa đơn:</span>
                                    <span className="ml-2">{partner.unpaid_invoice_count}</span>
                                </div>
                                {partner.credit_limit && (
                                    <div>
                                        <span className="text-muted-foreground">Hạn mức:</span>
                                        <span className="ml-2">{formatMoney(partner.credit_limit)}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Amount Input */}
                    <div className="space-y-2">
                        <Label htmlFor="amount">Số tiền thanh toán</Label>
                        <Controller
                            name="amount"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    id="amount"
                                    type="number"
                                    className="text-lg h-12"
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                            )}
                        />
                        {errors.amount && (
                            <p className="text-sm text-red-500">{errors.amount.message}</p>
                        )}

                        {/* Quick amount buttons */}
                        <div className="flex gap-2 pt-1">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickAmount(0.25)}
                            >
                                25%
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickAmount(0.5)}
                            >
                                50%
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickAmount(0.75)}
                            >
                                75%
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickAmount(1)}
                            >
                                Toàn bộ
                            </Button>
                        </div>
                    </div>

                    {/* Payment Preview */}
                    <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between text-sm">
                                <div className="text-muted-foreground">
                                    <div>Nợ hiện tại</div>
                                    <div className="font-bold text-lg text-foreground">
                                        {formatMoney(partner.balance)}
                                    </div>
                                </div>
                                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                <div className="text-muted-foreground">
                                    <div>Thanh toán</div>
                                    <div className="font-bold text-lg text-primary">
                                        {formatMoney(Math.min(amount, parseFloat(partner.balance.toString())))}
                                    </div>
                                </div>
                                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                <div className="text-muted-foreground">
                                    <div>Còn lại</div>
                                    <div className={`font-bold text-lg ${remainingBalance === 0 ? 'text-green-600' : 'text-foreground'}`}>
                                        {formatMoney(remainingBalance)}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment Method */}
                    <div className="space-y-2">
                        <Label>Phương thức thanh toán</Label>
                        <Controller
                            name="payment_method"
                            control={control}
                            render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className="h-12">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PAYMENT_METHODS.map((method) => {
                                            const Icon = method.icon;
                                            return (
                                                <SelectItem key={method.value} value={method.value}>
                                                    <div className="flex items-center gap-2">
                                                        <Icon className="h-4 w-4" />
                                                        {method.label}
                                                    </div>
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Ghi chú (tùy chọn)</Label>
                        <Controller
                            name="notes"
                            control={control}
                            render={({ field }) => (
                                <Textarea
                                    {...field}
                                    id="notes"
                                    placeholder="Thêm ghi chú về thanh toán..."
                                    className="resize-none"
                                    rows={2}
                                />
                            )}
                        />
                    </div>

                    {/* Warning for excess amount */}
                    {exceedsBalance && (
                        <Card className="bg-yellow-50 border-yellow-200">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <div className="font-medium text-yellow-800">
                                            Số tiền vượt quá công nợ
                                        </div>
                                        <div className="text-yellow-700 mt-1">
                                            Số tiền thanh toán sẽ được điều chỉnh về {formatMoney(partner.balance)}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Hủy
                        </Button>
                        <Button type="submit" disabled={isPending || amount <= 0}>
                            {isPending ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                            )}
                            Xác nhận thanh toán
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
