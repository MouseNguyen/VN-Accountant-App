// src/app/(dashboard)/cong-no/phai-tra/tra-tien/page.tsx
// Trang trả tiền NCC

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    ArrowLeft,
    Building2,
    Wallet,
    Check,
    Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { MoneyInput } from '@/components/shared/money-input';
import { useAPTransactions, useMakePayment } from '@/hooks/use-ap';
import { usePartners } from '@/hooks/use-partners';
import { toast } from 'sonner';
import type { Partner } from '@/types/partner';

// Format money
function formatMoney(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(value);
}

export default function TraTienPage() {
    const router = useRouter();
    const makePayment = useMakePayment();

    // Form state
    const [formData, setFormData] = useState({
        vendor_id: '',
        amount: 0,
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        payment_method: 'CASH' as 'CASH' | 'BANK',
        invoice_ids: [] as string[],
        auto_allocate: true,
        notes: '',
    });

    // Data hooks
    const { partners } = usePartners();
    const { data: apData, isLoading: loadingAP } = useAPTransactions({
        vendor_id: formData.vendor_id || undefined,
        status: 'UNPAID',
        limit: 50,
    });

    const vendors = (partners || []).filter((p: Partner) =>
        ['VENDOR', 'BOTH'].includes(p.partner_type)
    );
    const unpaidInvoices = apData?.items?.filter((ap) => ap.balance > 0) || [];

    // Calculate total selected
    const selectedTotal = formData.invoice_ids.reduce((sum, id) => {
        const inv = unpaidInvoices.find((i) => i.id === id);
        return sum + (inv?.balance || 0);
    }, 0);

    // Toggle invoice selection
    const toggleInvoice = (invoiceId: string) => {
        setFormData((prev) => {
            const newIds = prev.invoice_ids.includes(invoiceId)
                ? prev.invoice_ids.filter((id) => id !== invoiceId)
                : [...prev.invoice_ids, invoiceId];
            return {
                ...prev,
                invoice_ids: newIds,
                auto_allocate: newIds.length === 0,
            };
        });
    };

    // Select all
    const selectAll = () => {
        setFormData((prev) => ({
            ...prev,
            invoice_ids: unpaidInvoices.map((i) => i.id),
            auto_allocate: false,
        }));
    };

    // Clear all
    const clearAll = () => {
        setFormData((prev) => ({
            ...prev,
            invoice_ids: [],
            auto_allocate: true,
        }));
    };

    // Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.vendor_id) {
            toast.error('Vui lòng chọn nhà cung cấp');
            return;
        }

        if (formData.amount <= 0) {
            toast.error('Số tiền phải lớn hơn 0');
            return;
        }

        try {
            await makePayment.mutateAsync({
                vendor_id: formData.vendor_id,
                amount: formData.amount,
                payment_date: formData.payment_date,
                payment_method: formData.payment_method,
                account_id: '00000000-0000-0000-0000-000000000000', // Placeholder - no account table
                invoice_ids: formData.invoice_ids.length > 0 ? formData.invoice_ids : undefined,
                auto_allocate: formData.auto_allocate,
                notes: formData.notes || undefined,
            });
            router.push('/cong-no/phai-tra');
        } catch {
            // Error handled by mutation
        }
    };

    // Get selected vendor info
    const selectedVendor = vendors.find((v: Partner) => v.id === formData.vendor_id);

    return (
        <div className="p-4 pb-20 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/cong-no/phai-tra" className="p-2 hover:bg-muted rounded-lg">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold">Trả tiền NCC</h1>
                    <p className="text-sm text-muted-foreground">Thanh toán công nợ nhà cung cấp</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Vendor Selection */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            Nhà cung cấp
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Select
                            value={formData.vendor_id}
                            onValueChange={(value) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    vendor_id: value,
                                    invoice_ids: [],
                                }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn nhà cung cấp" />
                            </SelectTrigger>
                            <SelectContent>
                                {vendors.map((vendor: Partner) => (
                                    <SelectItem key={vendor.id} value={vendor.id}>
                                        {vendor.name}
                                        {vendor.balance && vendor.balance < 0 && (
                                            <span className="text-red-500 ml-2">
                                                (Nợ: {formatMoney(Math.abs(vendor.balance))})
                                            </span>
                                        )}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {selectedVendor && selectedVendor.balance && selectedVendor.balance < 0 && (
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                                <p className="text-sm text-red-700 dark:text-red-300">
                                    Tổng nợ NCC: <strong>{formatMoney(Math.abs(selectedVendor.balance))}</strong>
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Payment Info */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Wallet className="w-4 h-4" />
                            Thông tin thanh toán
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Ngày thanh toán</Label>
                                <Input
                                    type="date"
                                    value={formData.payment_date}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, payment_date: e.target.value }))
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Phương thức</Label>
                                <Select
                                    value={formData.payment_method}
                                    onValueChange={(value) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            payment_method: value as 'CASH' | 'BANK',
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CASH">💵 Tiền mặt</SelectItem>
                                        <SelectItem value="BANK">🏦 Chuyển khoản</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Số tiền trả</Label>
                            <MoneyInput
                                value={formData.amount}
                                onChange={(value) => setFormData((prev) => ({ ...prev, amount: value }))}
                                className="text-lg font-bold"
                            />
                            {formData.invoice_ids.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    Đã chọn {formData.invoice_ids.length} HĐ, tổng: {formatMoney(selectedTotal)}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Ghi chú</Label>
                            <Input
                                placeholder="Nhập ghi chú (tuỳ chọn)"
                                value={formData.notes}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                                }
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Invoice Selection */}
                {formData.vendor_id && (
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Receipt className="w-4 h-4" />
                                    Chọn hóa đơn
                                </CardTitle>
                                <div className="flex gap-2">
                                    <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
                                        Chọn tất cả
                                    </Button>
                                    <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
                                        Bỏ chọn
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loadingAP ? (
                                <p className="text-muted-foreground text-center py-4">Đang tải...</p>
                            ) : unpaidInvoices.length === 0 ? (
                                <p className="text-muted-foreground text-center py-4">
                                    Không có hóa đơn chưa thanh toán
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {unpaidInvoices.map((inv) => (
                                        <div
                                            key={inv.id}
                                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${formData.invoice_ids.includes(inv.id)
                                                    ? 'border-primary bg-primary/5'
                                                    : 'hover:bg-muted'
                                                }`}
                                            onClick={() => toggleInvoice(inv.id)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Checkbox
                                                        checked={formData.invoice_ids.includes(inv.id)}
                                                        onCheckedChange={() => toggleInvoice(inv.id)}
                                                    />
                                                    <div>
                                                        <p className="font-medium">{inv.code}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {format(new Date(inv.trans_date), 'dd/MM/yyyy', { locale: vi })}
                                                            {inv.due_date && ` → ${format(new Date(inv.due_date), 'dd/MM/yyyy', { locale: vi })}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-red-600">{formatMoney(inv.balance)}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        / {formatMoney(inv.amount)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {formData.invoice_ids.length === 0 && unpaidInvoices.length > 0 && (
                                <p className="text-sm text-muted-foreground mt-2">
                                    💡 Nếu không chọn HĐ, hệ thống sẽ tự động phân bổ theo FIFO (HĐ cũ nhất trước)
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Submit Button */}
                <Button
                    type="submit"
                    className="w-full h-14 text-lg"
                    disabled={makePayment.isPending || !formData.vendor_id || formData.amount <= 0}
                >
                    <Check className="w-5 h-5 mr-2" />
                    {makePayment.isPending ? 'Đang xử lý...' : `Trả ${formatMoney(formData.amount)}`}
                </Button>
            </form>
        </div>
    );
}
