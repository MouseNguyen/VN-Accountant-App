// src/app/(dashboard)/giao-dich/transaction-form-dialog.tsx
// Transaction Form Dialog for Create/Edit - Simplified version

'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { Plus, Trash2, Package } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useTransactions, useTransaction } from '@/hooks/use-transactions';
import { useProducts } from '@/hooks/use-products';
import { usePartners } from '@/hooks/use-partners';
import type { Transaction } from '@/types/transaction';
import {
    INCOME_CATEGORIES,
    EXPENSE_CATEGORIES,
    CASH_IN_CATEGORIES,
    CASH_OUT_CATEGORIES,
    getTaxBadgeColorClass,
} from '@/lib/transaction-categories';

// ==========================================
// CONSTANTS
// ==========================================

const TRANS_TYPE_OPTIONS = [
    { value: 'INCOME', label: 'Bán hàng (Thu doanh thu)' },
    { value: 'EXPENSE', label: 'Mua hàng (Chi phí)' },
    { value: 'CASH_IN', label: 'Thu tiền (Công nợ, vay, góp vốn)' },
    { value: 'CASH_OUT', label: 'Chi tiền (Trả nợ, lương, điện)' },
];

const PAYMENT_METHOD_OPTIONS = [
    { value: 'CASH', label: 'Tiền mặt' },
    { value: 'BANK_TRANSFER', label: 'Chuyển khoản' },
    { value: 'MOMO', label: 'MoMo' },
    { value: 'ZALO_PAY', label: 'ZaloPay' },
    { value: 'OTHER', label: 'Khác' },
];

// Import units from constants
import { ALL_UNITS } from '@/lib/constants';

// Popular units first, then others
const POPULAR_UNITS = ['kg', 'con', 'quả', 'cây', 'cái', 'hộp'];
const UNIT_OPTIONS = [
    // Popular units first (sorted by frequency of use)
    ...ALL_UNITS.filter((u: { value: string; label: string }) => POPULAR_UNITS.includes(u.value)),
    // Separator could be added
    ...ALL_UNITS.filter((u: { value: string; label: string }) => !POPULAR_UNITS.includes(u.value)),
];

// ==========================================
// TYPES
// ==========================================

interface FormItem {
    product_id: string | null;
    description: string | null;
    quantity: number;
    unit: string;
    unit_price: number;
    tax_rate: number;
    discount_percent: number;
}

interface FormData {
    trans_type: 'INCOME' | 'EXPENSE' | 'CASH_IN' | 'CASH_OUT';
    trans_date: string;
    partner_id: string | null;
    description: string | null;
    items: FormItem[];
    payment_method: string;
    paid_amount: number;
    payment_note: string | null;
    discount_amount: number;
    // Category fields for tax engine
    income_category: string | null;
    cash_in_category: string | null;
    expense_type: string;
}

// ==========================================
// COMPONENT
// ==========================================

interface TransactionFormDialogProps {
    open: boolean;
    onClose: () => void;
    transaction?: Transaction | null;
}

export function TransactionFormDialog({
    open,
    onClose,
    transaction,
}: TransactionFormDialogProps) {
    const isEditing = !!transaction;
    const { createTransaction, updateTransaction, isCreating, isUpdating } = useTransactions();
    const { products, isLoading: loadingProducts } = useProducts({ limit: 100 });
    const { partners, isLoading: loadingPartners } = usePartners({ limit: 100 });

    // Fetch full transaction details when editing (list doesn't include items)
    const { data: fullTransaction, isLoading: loadingTransaction } = useTransaction(
        open && transaction?.id ? transaction.id : null
    );

    const defaultItem: FormItem = {
        product_id: null,
        description: '',
        quantity: 1,
        unit: 'kg',
        unit_price: 0,
        tax_rate: 0,
        discount_percent: 0,
    };

    const defaultValues: FormData = {
        trans_type: 'INCOME',
        trans_date: new Date().toISOString().split('T')[0],
        partner_id: null,
        description: null,
        items: [defaultItem],
        payment_method: 'CASH',
        paid_amount: 0,
        payment_note: null,
        discount_amount: 0,
        // Category defaults
        income_category: null,
        cash_in_category: null,
        expense_type: 'NORMAL',
    };

    const form = useForm<FormData>({
        defaultValues,
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'items',
    });

    // Watch items for total calculation
    const watchItems = useWatch({ control: form.control, name: 'items' });
    const watchDiscountAmount = useWatch({ control: form.control, name: 'discount_amount' });
    const watchPaidAmount = useWatch({ control: form.control, name: 'paid_amount' });
    const watchTransType = useWatch({ control: form.control, name: 'trans_type' });

    // Get category options based on transaction type
    const getCategoryOptions = () => {
        switch (watchTransType) {
            case 'INCOME':
                return INCOME_CATEGORIES;
            case 'EXPENSE':
                return EXPENSE_CATEGORIES;
            case 'CASH_IN':
                return CASH_IN_CATEGORIES;
            case 'CASH_OUT':
                return CASH_OUT_CATEGORIES;
            default:
                return [];
        }
    };

    const categoryOptions = getCategoryOptions();

    // Calculate totals
    const calculateTotals = () => {
        let subtotal = 0;
        let totalTax = 0;
        let totalDiscount = 0;

        (watchItems || []).forEach((item) => {
            const lineSubtotal = (item?.quantity || 0) * (item?.unit_price || 0);
            const lineDiscount = lineSubtotal * ((item?.discount_percent || 0) / 100);
            const afterDiscount = lineSubtotal - lineDiscount;
            const lineTax = afterDiscount * ((item?.tax_rate || 0) / 100);

            subtotal += lineSubtotal;
            totalDiscount += lineDiscount;
            totalTax += lineTax;
        });

        const grandTotal = subtotal - totalDiscount + totalTax - (watchDiscountAmount || 0);
        return { subtotal, totalTax, totalDiscount, grandTotal };
    };

    const totals = calculateTotals();

    // Reset form when transaction changes - use fullTransaction which has items
    useEffect(() => {
        if (open) {
            // Use fullTransaction (with items) when editing, otherwise default values
            const txn = fullTransaction || transaction;

            if (txn && txn.items && txn.items.length > 0) {
                form.reset({
                    trans_type: txn.trans_type as 'INCOME' | 'EXPENSE' | 'CASH_IN' | 'CASH_OUT',
                    trans_date: txn.trans_date.split('T')[0],
                    partner_id: txn.partner_id || null,
                    description: txn.description || null,
                    items: txn.items.map((item) => ({
                        product_id: item.product_id || null,
                        description: item.description || null,
                        quantity: item.quantity,
                        unit: item.unit,
                        unit_price: item.unit_price,
                        tax_rate: item.tax_rate,
                        discount_percent: item.discount_percent,
                    })),
                    payment_method: txn.payment_method,
                    paid_amount: txn.paid_amount,
                    payment_note: txn.payment_note || null,
                    discount_amount: txn.discount_amount,
                    // Category fields
                    income_category: (txn as { income_category?: string }).income_category || null,
                    cash_in_category: (txn as { cash_in_category?: string }).cash_in_category || null,
                    expense_type: (txn as { expense_type?: string }).expense_type || 'NORMAL',
                });
            } else if (!transaction) {
                // New transaction
                form.reset(defaultValues);
            }
            // If transaction exists but no items yet, wait for fullTransaction to load
        }
    }, [open, transaction, fullTransaction, form]);

    // Handle product selection
    const handleProductSelect = (index: number, productId: string) => {
        const product = products.find((p) => p.id === productId);
        if (product) {
            const transType = form.getValues('trans_type');
            form.setValue(`items.${index}.product_id`, productId);
            form.setValue(`items.${index}.unit`, product.unit);
            form.setValue(
                `items.${index}.unit_price`,
                transType === 'INCOME' ? product.selling_price : product.purchase_price
            );
        }
    };

    // Submit handler
    const onSubmit = async (data: FormData) => {
        try {
            const payload = {
                trans_type: data.trans_type as 'INCOME' | 'EXPENSE' | 'CASH_IN' | 'CASH_OUT',
                trans_date: data.trans_date,
                partner_id: data.partner_id,
                description: data.description,
                items: data.items.map((item) => ({
                    product_id: item.product_id,
                    description: item.description,
                    quantity: item.quantity,
                    unit: item.unit,
                    unit_price: item.unit_price,
                    tax_rate: item.tax_rate,
                    discount_percent: item.discount_percent,
                })),
                payment_method: data.payment_method as 'CASH' | 'BANK_TRANSFER' | 'MOMO' | 'ZALO_PAY' | 'OTHER',
                paid_amount: data.paid_amount,
                payment_note: data.payment_note,
                discount_amount: data.discount_amount,
                // Category fields for tax engine
                income_category: data.income_category,
                cash_in_category: data.cash_in_category,
                expense_type: data.expense_type,
            };

            if (isEditing && transaction) {
                await updateTransaction({
                    id: transaction.id,
                    version: transaction.version,
                    ...payload,
                });
            } else {
                await createTransaction(payload);
            }
            onClose();
        } catch {
            // Error handled by mutation
        }
    };

    const formatMoney = (value: number) =>
        new Intl.NumberFormat('vi-VN').format(Math.round(value)) + 'đ';

    // ==========================================
    // RENDER
    // ==========================================

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="pb-4 border-b">
                    <DialogTitle className="text-xl">
                        {isEditing ? `Sửa giao dịch ${transaction?.code}` : 'Tạo giao dịch mới'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing ? 'Cập nhật thông tin giao dịch' : 'Điền thông tin để tạo giao dịch mới'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                    {/* ===== SECTION 1: Basic Info ===== */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">Loại giao dịch <span className="text-destructive">*</span></Label>
                            <Controller
                                name="trans_type"
                                control={form.control}
                                render={({ field }) => (
                                    <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        disabled={isEditing}
                                    >
                                        <SelectTrigger className="h-11">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TRANS_TYPE_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">Ngày giao dịch <span className="text-destructive">*</span></Label>
                            <Input type="date" className="h-11" {...form.register('trans_date')} />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">Đối tác</Label>
                            <Controller
                                name="partner_id"
                                control={form.control}
                                render={({ field }) => (
                                    <Select
                                        value={field.value || '__none__'}
                                        onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                                    >
                                        <SelectTrigger className="h-11">
                                            <SelectValue placeholder="Chọn đối tác..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">-- Không chọn --</SelectItem>
                                            {loadingPartners ? (
                                                <Skeleton className="h-8 w-full" />
                                            ) : (
                                                partners.map((p) => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">Phương thức thanh toán</Label>
                            <Controller
                                name="payment_method"
                                control={form.control}
                                render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger className="h-11">
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
                    </div>

                    {/* ===== SECTION 1.5: Category (Tax Engine) ===== */}
                    {categoryOptions.length > 0 && (
                        <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg border border-dashed">
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium">
                                    {watchTransType === 'INCOME' && 'Loại doanh thu'}
                                    {watchTransType === 'EXPENSE' && 'Loại chi phí'}
                                    {watchTransType === 'CASH_IN' && 'Loại thu tiền'}
                                    {watchTransType === 'CASH_OUT' && 'Loại chi tiền'}
                                    <span className="text-xs text-muted-foreground ml-2">(Thuế)</span>
                                </Label>
                                <Controller
                                    name={
                                        watchTransType === 'INCOME' ? 'income_category' :
                                            watchTransType === 'CASH_IN' ? 'cash_in_category' :
                                                'expense_type'
                                    }
                                    control={form.control}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value || '__none__'}
                                            onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                                        >
                                            <SelectTrigger className="h-11">
                                                <SelectValue placeholder="Chọn loại..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(watchTransType === 'INCOME' || watchTransType === 'CASH_IN') && (
                                                    <SelectItem value="__none__">-- Không chọn --</SelectItem>
                                                )}
                                                {categoryOptions.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        <div className="flex items-center justify-between w-full gap-2">
                                                            <span>{opt.label}</span>
                                                            {'taxBadge' in opt && opt.taxBadge && (
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getTaxBadgeColorClass('taxBadgeColor' in opt ? opt.taxBadgeColor : 'gray')}`}>
                                                                    {opt.taxBadge}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="flex items-end">
                                <p className="text-xs text-muted-foreground">
                                    {watchTransType === 'INCOME' && '💡 Ảnh hưởng thuế suất VAT đầu ra'}
                                    {watchTransType === 'EXPENSE' && '💡 Ảnh hưởng khấu trừ VAT đầu vào'}
                                    {watchTransType === 'CASH_IN' && '💡 Phân loại nguồn thu'}
                                    {watchTransType === 'CASH_OUT' && '💡 Ảnh hưởng CIT/PIT'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ===== SECTION 2: Items ===== */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Chi tiết sản phẩm <span className="text-destructive">*</span></Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => append(defaultItem)}
                                className="h-8"
                            >
                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                Thêm dòng
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {fields.map((field, index) => {
                                const item = watchItems?.[index];
                                const lineSubtotal = (item?.quantity || 0) * (item?.unit_price || 0);
                                const lineDiscount = lineSubtotal * ((item?.discount_percent || 0) / 100);
                                const afterDiscount = lineSubtotal - lineDiscount;
                                const lineTax = afterDiscount * ((item?.tax_rate || 0) / 100);
                                const lineTotal = afterDiscount + lineTax;

                                return (
                                    <div
                                        key={field.id}
                                        className="border rounded-xl p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
                                    >
                                        {/* Product Row */}
                                        <div className="flex gap-3 items-start">
                                            <div className="flex-1">
                                                <Controller
                                                    name={`items.${index}.product_id`}
                                                    control={form.control}
                                                    render={({ field }) => (
                                                        <Select
                                                            value={field.value || '__none__'}
                                                            onValueChange={(v) => {
                                                                if (v && v !== '__none__') handleProductSelect(index, v);
                                                                else form.setValue(`items.${index}.product_id`, null);
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-11">
                                                                <Package className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                                                                <SelectValue placeholder="Chọn sản phẩm hoặc nhập tự do..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="__none__">📝 Nhập mô tả tự do</SelectItem>
                                                                {loadingProducts ? (
                                                                    <Skeleton className="h-8 w-full" />
                                                                ) : (
                                                                    products.map((p) => (
                                                                        <SelectItem key={p.id} value={p.id}>
                                                                            {p.name} ({p.code})
                                                                        </SelectItem>
                                                                    ))
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                                {!watchItems?.[index]?.product_id && (
                                                    <Input
                                                        className="mt-2 h-11"
                                                        placeholder="Nhập mô tả sản phẩm/dịch vụ..."
                                                        {...form.register(`items.${index}.description`)}
                                                    />
                                                )}
                                            </div>
                                            {fields.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-11 w-11 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => remove(index)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>

                                        {/* Numbers Row - Clean Grid */}
                                        <div className="grid grid-cols-5 gap-3 mt-4">
                                            <div className="col-span-2">
                                                <Label className="text-xs text-muted-foreground mb-1.5 block">Số lượng & Đơn vị</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        type="number"
                                                        step="0.001"
                                                        min="0"
                                                        className="h-11 flex-1 text-right font-medium"
                                                        {...form.register(`items.${index}.quantity`, {
                                                            valueAsNumber: true,
                                                        })}
                                                    />
                                                    <Controller
                                                        name={`items.${index}.unit`}
                                                        control={form.control}
                                                        render={({ field }) => (
                                                            <Select value={field.value || 'kg'} onValueChange={field.onChange}>
                                                                <SelectTrigger className="h-11 w-24">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {UNIT_OPTIONS.map((opt) => (
                                                                        <SelectItem key={opt.value} value={opt.value}>
                                                                            {opt.label}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        )}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <Label className="text-xs text-muted-foreground mb-1.5 block">Đơn giá (đ)</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    className="h-11 text-right font-medium"
                                                    {...form.register(`items.${index}.unit_price`, {
                                                        valueAsNumber: true,
                                                    })}
                                                />
                                            </div>

                                            <div>
                                                <Label className="text-xs text-muted-foreground mb-1.5 block">Thuế %</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    className="h-11 text-center"
                                                    {...form.register(`items.${index}.tax_rate`, {
                                                        valueAsNumber: true,
                                                    })}
                                                />
                                            </div>

                                            <div>
                                                <Label className="text-xs text-muted-foreground mb-1.5 block">Giảm %</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    className="h-11 text-center"
                                                    {...form.register(`items.${index}.discount_percent`, {
                                                        valueAsNumber: true,
                                                    })}
                                                />
                                            </div>
                                        </div>

                                        {/* Line Total */}
                                        <div className="flex justify-end items-center mt-3 pt-3 border-t border-dashed">
                                            <span className="text-sm text-muted-foreground mr-2">Thành tiền:</span>
                                            <span className="text-lg font-bold text-primary">{formatMoney(lineTotal)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ===== SECTION 3: Notes & Totals ===== */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">Ghi chú</Label>
                            <Textarea
                                placeholder="Ghi chú cho giao dịch..."
                                className="min-h-[140px] resize-none"
                                {...form.register('description')}
                            />
                        </div>

                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl p-5 space-y-3 border">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Tạm tính:</span>
                                <span className="font-medium">{formatMoney(totals.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Giảm giá dòng:</span>
                                <span className="text-orange-600">-{formatMoney(totals.totalDiscount)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Thuế:</span>
                                <span className="text-blue-600">+{formatMoney(totals.totalTax)}</span>
                            </div>

                            <div className="flex justify-between items-center text-sm py-2">
                                <span className="text-muted-foreground">Giảm thêm:</span>
                                <Input
                                    type="number"
                                    className="w-28 h-9 text-right"
                                    {...form.register('discount_amount', { valueAsNumber: true })}
                                />
                            </div>

                            <div className="border-t-2 border-primary/20 pt-3 flex justify-between items-center">
                                <span className="font-semibold">Tổng cộng:</span>
                                <span className="text-2xl font-bold text-primary">{formatMoney(totals.grandTotal)}</span>
                            </div>

                            <div className="flex justify-between items-center text-sm pt-2">
                                <span className="text-muted-foreground">Thanh toán:</span>
                                <Input
                                    type="number"
                                    className="w-28 h-9 text-right"
                                    {...form.register('paid_amount', { valueAsNumber: true })}
                                />
                            </div>

                            <div className="flex justify-between items-center pt-2">
                                <span className="font-medium">Còn nợ:</span>
                                <span
                                    className={`text-lg font-bold ${totals.grandTotal - (watchPaidAmount || 0) > 0
                                        ? 'text-red-500'
                                        : 'text-green-500'
                                        }`}
                                >
                                    {formatMoney(Math.max(0, totals.grandTotal - (watchPaidAmount || 0)))}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ===== FOOTER ===== */}
                    <DialogFooter className="border-t pt-4 gap-2">
                        <Button type="button" variant="outline" onClick={onClose} className="min-w-[100px]">
                            Hủy
                        </Button>
                        <Button type="submit" disabled={isCreating || isUpdating} className="min-w-[120px]">
                            {isCreating || isUpdating ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Tạo mới'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
