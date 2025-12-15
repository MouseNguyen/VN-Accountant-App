// src/app/(dashboard)/giao-dich/payment-dialog.tsx
// Payment Dialog for adding partial payments - Simplified version

'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTransactions } from '@/hooks/use-transactions';
import type { Transaction } from '@/types/transaction';

// ==========================================
// CONSTANTS
// ==========================================

const PAYMENT_METHOD_OPTIONS = [
    { value: 'CASH', label: 'Tiền mặt' },
    { value: 'BANK_TRANSFER', label: 'Chuyển khoản' },
    { value: 'MOMO', label: 'MoMo' },
    { value: 'ZALO_PAY', label: 'ZaloPay' },
    { value: 'OTHER', label: 'Khác' },
];

// ==========================================
// TYPES
// ==========================================

interface FormData {
    amount: number;
    payment_method: string;
    note: string;
}

// ==========================================
// COMPONENT
// ==========================================

interface PaymentDialogProps {
    open: boolean;
    onClose: () => void;
    transaction: Transaction | null;
}

export function PaymentDialog({ open, onClose, transaction }: PaymentDialogProps) {
    const { addPayment, isAddingPayment } = useTransactions();

    const remaining = transaction
        ? transaction.total_amount - transaction.paid_amount
        : 0;

    const form = useForm<FormData>({
        defaultValues: {
            amount: 0,
            payment_method: 'CASH',
            note: '',
        },
    });

    // Reset form when transaction changes
    useEffect(() => {
        if (open && transaction) {
            form.reset({
                amount: Math.round(remaining),
                payment_method: transaction.payment_method,
                note: '',
            });
        }
    }, [open, transaction, remaining, form]);

    // Submit handler
    const onSubmit = async (data: FormData) => {
        if (!transaction) return;

        try {
            await addPayment({
                id: transaction.id,
                amount: data.amount,
                payment_method: data.payment_method as any,
                note: data.note,
            });
            onClose();
        } catch {
            // Error handled by mutation
        }
    };

    const formatMoney = (value: number) =>
        new Intl.NumberFormat('vi-VN').format(Math.round(value)) + 'đ';

    // Quick amount buttons
    const quickAmounts = [
        { label: 'Tất cả', value: remaining },
        { label: '50%', value: remaining * 0.5 },
        { label: '25%', value: remaining * 0.25 },
    ];

    // ==========================================
    // RENDER
    // ==========================================

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Thanh toán</DialogTitle>
                    <DialogDescription>
                        Thêm thanh toán cho giao dịch {transaction?.code}
                    </DialogDescription>
                </DialogHeader>

                {transaction && (
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* Summary */}
                        <div className="p-4 bg-accent rounded-lg space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Tổng tiền:</span>
                                <span className="font-medium">
                                    {formatMoney(transaction.total_amount)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Đã thanh toán:</span>
                                <span className="text-green-600">
                                    {formatMoney(transaction.paid_amount)}
                                </span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                                <span className="font-medium">Còn lại:</span>
                                <span className="font-bold text-red-600">
                                    {formatMoney(remaining)}
                                </span>
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="space-y-2">
                            <Label>Số tiền thanh toán *</Label>
                            <Input
                                type="number"
                                step="any"
                                min={1000}
                                max={remaining}
                                {...form.register('amount', {
                                    valueAsNumber: true,
                                    min: { value: 1000, message: 'Tối thiểu 1,000đ' },
                                    max: { value: remaining, message: `Tối đa ${formatMoney(remaining)}` },
                                })}
                            />
                            {form.formState.errors.amount && (
                                <p className="text-sm text-red-500">{form.formState.errors.amount.message}</p>
                            )}
                            {/* Quick buttons */}
                            <div className="flex gap-2 mt-2">
                                {quickAmounts.map((qa) => (
                                    <Button
                                        key={qa.label}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => form.setValue('amount', Math.round(qa.value))}
                                    >
                                        {qa.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div className="space-y-2">
                            <Label>Phương thức thanh toán</Label>
                            <Controller
                                name="payment_method"
                                control={form.control}
                                render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PAYMENT_METHOD_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>

                        {/* Note */}
                        <div className="space-y-2">
                            <Label>Ghi chú</Label>
                            <Textarea
                                placeholder="Ghi chú thanh toán..."
                                rows={2}
                                {...form.register('note')}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>
                                Hủy
                            </Button>
                            <Button type="submit" disabled={isAddingPayment}>
                                {isAddingPayment ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
