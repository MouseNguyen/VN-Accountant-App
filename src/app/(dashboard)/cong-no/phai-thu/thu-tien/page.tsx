'use client';

// src/app/(dashboard)/cong-no/phai-thu/thu-tien/page.tsx
// Trang thu tiền khách hàng

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
    ArrowLeft,
    DollarSign,
    Check,
    Wallet,
    Landmark,
    CheckCircle2,
    Circle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { formatMoney } from '@/lib/decimal';
import type { ARTransaction, CollectPaymentResponse } from '@/types/ar';

interface Partner {
    id: string;
    code: string;
    name: string;
    balance: number;
}

async function fetchCustomers(): Promise<Partner[]> {
    const res = await fetch('/api/partners?partner_type=CUSTOMER&limit=100');
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Lỗi tải khách hàng');
    return data.data?.items || [];
}

async function fetchUnpaidInvoices(customerId: string): Promise<ARTransaction[]> {
    if (!customerId) return [];
    const res = await fetch(`/api/ar-transactions?customer_id=${customerId}&status=UNPAID&limit=50`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Lỗi tải hóa đơn');
    return data.data?.items || [];
}

async function collectPayment(input: any): Promise<CollectPaymentResponse> {
    const res = await fetch('/api/ar/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Lỗi thu tiền');
    return data.data;
}

export default function CollectPaymentPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preselectedCustomerId = searchParams.get('customer_id');

    const [formData, setFormData] = useState({
        customer_id: preselectedCustomerId || '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'CASH' as 'CASH' | 'BANK_TRANSFER',
        invoice_ids: [] as string[],
        auto_allocate: true,
        notes: '',
    });

    // Fetch customers
    const { data: customers } = useQuery({
        queryKey: ['customers-for-payment'],
        queryFn: fetchCustomers,
    });

    // Fetch unpaid invoices for selected customer
    const { data: unpaidInvoices } = useQuery({
        queryKey: ['unpaid-invoices', formData.customer_id],
        queryFn: () => fetchUnpaidInvoices(formData.customer_id),
        enabled: !!formData.customer_id,
    });

    const selectedCustomer = customers?.find((c) => c.id === formData.customer_id);
    const totalUnpaid = unpaidInvoices?.reduce((sum, inv) => sum + inv.balance, 0) || 0;

    const mutation = useMutation({
        mutationFn: collectPayment,
        onSuccess: (res) => {
            toast.success(`Thu tiền thành công! Đã phân bổ vào ${res.allocations.length} hóa đơn`);
            router.push('/cong-no/phai-thu');
        },
        onError: (err: Error) => {
            toast.error(err.message);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.customer_id) {
            toast.error('Vui lòng chọn khách hàng');
            return;
        }
        if (!formData.amount || Number(formData.amount) <= 0) {
            toast.error('Vui lòng nhập số tiền');
            return;
        }

        mutation.mutate({
            ...formData,
            amount: Number(formData.amount),
            invoice_ids: formData.auto_allocate ? undefined : formData.invoice_ids,
        });
    };

    const toggleInvoice = (invoiceId: string) => {
        setFormData((prev) => ({
            ...prev,
            invoice_ids: prev.invoice_ids.includes(invoiceId)
                ? prev.invoice_ids.filter((id) => id !== invoiceId)
                : [...prev.invoice_ids, invoiceId],
        }));
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-card border-b">
                <div className="flex items-center gap-3 px-4 py-3">
                    <Link href="/cong-no/phai-thu">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="text-lg font-bold">💵 Thu tiền khách hàng</h1>
                </div>
            </header>

            {/* Form */}
            <main className="p-4 max-w-lg mx-auto">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Khách hàng */}
                    <div className="space-y-2">
                        <Label>Khách hàng *</Label>
                        <select
                            value={formData.customer_id}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    customer_id: e.target.value,
                                    invoice_ids: [],
                                })
                            }
                            className="w-full h-10 px-3 rounded-md border bg-background text-foreground"
                        >
                            <option value="">-- Chọn khách hàng --</option>
                            {customers?.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name} ({c.code})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Tổng nợ */}
                    {formData.customer_id && (
                        <Card className="bg-muted">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm">Tổng nợ hiện tại:</span>
                                    <span className="font-bold text-primary text-lg">
                                        {formatMoney(selectedCustomer?.balance || totalUnpaid)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Số tiền */}
                    <div className="space-y-2">
                        <Label>Số tiền thu *</Label>
                        <Input
                            type="number"
                            placeholder="0"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            className="text-2xl h-14 font-bold"
                        />
                        {totalUnpaid > 0 && (
                            <Button
                                type="button"
                                variant="link"
                                size="sm"
                                className="p-0 h-auto"
                                onClick={() => setFormData({ ...formData, amount: String(totalUnpaid) })}
                            >
                                Thu hết: {formatMoney(totalUnpaid)}
                            </Button>
                        )}
                    </div>

                    {/* Ngày thu */}
                    <div className="space-y-2">
                        <Label>Ngày thu</Label>
                        <Input
                            type="date"
                            value={formData.payment_date}
                            onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                        />
                    </div>

                    {/* Phương thức */}
                    <div className="space-y-2">
                        <Label>Phương thức thanh toán</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                type="button"
                                variant={formData.payment_method === 'CASH' ? 'default' : 'outline'}
                                onClick={() => setFormData({ ...formData, payment_method: 'CASH' })}
                                className="h-12"
                            >
                                <Wallet className="h-4 w-4 mr-2" />
                                Tiền mặt
                            </Button>
                            <Button
                                type="button"
                                variant={formData.payment_method === 'BANK_TRANSFER' ? 'default' : 'outline'}
                                onClick={() => setFormData({ ...formData, payment_method: 'BANK_TRANSFER' })}
                                className="h-12"
                            >
                                <Landmark className="h-4 w-4 mr-2" />
                                Chuyển khoản
                            </Button>
                        </div>
                    </div>

                    {/* Auto allocate */}
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <Checkbox
                            id="auto_allocate"
                            checked={formData.auto_allocate}
                            onCheckedChange={(checked) =>
                                setFormData({ ...formData, auto_allocate: !!checked })
                            }
                        />
                        <Label htmlFor="auto_allocate" className="text-sm cursor-pointer">
                            Tự động phân bổ vào hóa đơn cũ nhất (FIFO)
                        </Label>
                    </div>

                    {/* Manual invoice selection */}
                    {!formData.auto_allocate && unpaidInvoices && unpaidInvoices.length > 0 && (
                        <div className="space-y-2">
                            <Label>Chọn hóa đơn phân bổ</Label>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {unpaidInvoices.map((inv) => (
                                    <Card
                                        key={inv.id}
                                        className={`cursor-pointer transition-colors ${formData.invoice_ids.includes(inv.id)
                                            ? 'border-primary bg-primary/5'
                                            : 'hover:border-primary/50'
                                            }`}
                                        onClick={() => toggleInvoice(inv.id)}
                                    >
                                        <CardContent className="p-3 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {formData.invoice_ids.includes(inv.id) ? (
                                                    <CheckCircle2 className="h-5 w-5 text-primary" />
                                                ) : (
                                                    <Circle className="h-5 w-5 text-muted-foreground" />
                                                )}
                                                <div>
                                                    <div className="font-medium text-sm">{inv.code}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {inv.trans_date}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="font-bold">{formatMoney(inv.balance)}</div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Ghi chú */}
                    <div className="space-y-2">
                        <Label>Ghi chú</Label>
                        <Input
                            placeholder="Nhập ghi chú..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    {/* Submit */}
                    <Button
                        type="submit"
                        className="w-full h-14 text-lg"
                        disabled={mutation.isPending}
                    >
                        <Check className="h-5 w-5 mr-2" />
                        {mutation.isPending ? 'Đang xử lý...' : 'Thu tiền'}
                    </Button>
                </form>
            </main>
        </div>
    );
}
