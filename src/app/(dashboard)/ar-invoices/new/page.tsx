// src/app/(dashboard)/ar-invoices/new/page.tsx
// Create AR Invoice Page - Phase 4 Task 2

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Save, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import { useCreateARInvoice } from '@/hooks/use-ar-invoices';
import { usePartners } from '@/hooks/use-partners';
import type { ARInvoiceLineInput } from '@/types/ar-invoice';

interface LineItem extends ARInvoiceLineInput {
    id: string; // temp id for React key
}

export default function NewARInvoicePage() {
    const router = useRouter();
    const { toast } = useToast();
    const createInvoice = useCreateARInvoice();

    const farmId = typeof window !== 'undefined'
        ? localStorage.getItem('farmId') || 'test-farm-001'
        : 'test-farm-001';

    // Partners list
    const { data: partnersData } = usePartners({ partner_type: 'CUSTOMER', limit: 100 });
    const customers = partnersData?.items || [];

    // Form state
    const [customerId, setCustomerId] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentTermDays, setPaymentTermDays] = useState(30);
    const [description, setDescription] = useState('');
    const [notes, setNotes] = useState('');

    // Line items
    const [lines, setLines] = useState<LineItem[]>([
        {
            id: crypto.randomUUID(),
            product_name: '',
            quantity: 1,
            unit_price: 0,
            tax_rate: 10,
            discount: 0,
        },
    ]);

    // Add line
    const addLine = () => {
        setLines([
            ...lines,
            {
                id: crypto.randomUUID(),
                product_name: '',
                quantity: 1,
                unit_price: 0,
                tax_rate: 10,
                discount: 0,
            },
        ]);
    };

    // Remove line
    const removeLine = (id: string) => {
        if (lines.length === 1) {
            toast({
                title: 'Không thể xóa',
                description: 'Hóa đơn phải có ít nhất 1 dòng',
                variant: 'destructive',
            });
            return;
        }
        setLines(lines.filter((line) => line.id !== id));
    };

    // Update line
    const updateLine = (id: string, field: keyof LineItem, value: any) => {
        setLines(lines.map((line) =>
            line.id === id ? { ...line, [field]: value } : line
        ));
    };

    // Calculate totals
    const calculateTotals = () => {
        let subTotal = 0;
        let totalDiscount = 0;
        let totalTax = 0;

        lines.forEach((line) => {
            const lineSubTotal = Number(line.quantity) * Number(line.unit_price);
            const lineDiscount = Number(line.discount || 0);
            const lineTaxable = lineSubTotal - lineDiscount;
            const lineTax = lineTaxable * (Number(line.tax_rate) / 100);

            subTotal += lineSubTotal;
            totalDiscount += lineDiscount;
            totalTax += lineTax;
        });

        return {
            subTotal,
            totalDiscount,
            totalTax,
            totalAmount: subTotal - totalDiscount + totalTax,
        };
    };

    const totals = calculateTotals();

    // Format money
    const formatMoney = (value: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(value);
    };

    // Submit
    const handleSubmit = async () => {
        // Validate
        if (!customerId) {
            toast({
                title: 'Thiếu thông tin',
                description: 'Vui lòng chọn khách hàng',
                variant: 'destructive',
            });
            return;
        }

        const validLines = lines.filter((line) => line.product_name && line.quantity > 0);
        if (validLines.length === 0) {
            toast({
                title: 'Thiếu thông tin',
                description: 'Vui lòng thêm ít nhất 1 sản phẩm',
                variant: 'destructive',
            });
            return;
        }

        try {
            const invoice = await createInvoice.mutateAsync({
                farm_id: farmId,
                customer_id: customerId,
                invoice_date: invoiceDate,
                payment_term_days: paymentTermDays,
                description,
                notes,
                lines: validLines.map(({ id, ...line }) => line),
            });

            toast({
                title: 'Thành công',
                description: `Đã tạo hóa đơn ${invoice.invoice_number}`,
            });

            router.push('/ar-invoices');
        } catch (error: any) {
            toast({
                title: 'Lỗi',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/ar-invoices">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Tạo hóa đơn mới</h1>
                    <p className="text-muted-foreground">Hóa đơn bán hàng AR Invoice</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Invoice Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Thông tin hóa đơn</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Khách hàng *</Label>
                                    <Select value={customerId} onValueChange={setCustomerId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Chọn khách hàng" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {customers.map((customer) => (
                                                <SelectItem key={customer.id} value={customer.id}>
                                                    {customer.name} ({customer.code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Ngày hóa đơn</Label>
                                    <Input
                                        type="date"
                                        value={invoiceDate}
                                        onChange={(e) => setInvoiceDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Số ngày thanh toán</Label>
                                    <Input
                                        type="number"
                                        value={paymentTermDays}
                                        onChange={(e) => setPaymentTermDays(Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Mô tả</Label>
                                    <Input
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Mô tả ngắn"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Line Items */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Chi tiết hóa đơn</CardTitle>
                            <Button onClick={addLine} size="sm">
                                <Plus className="h-4 w-4 mr-1" />
                                Thêm dòng
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {lines.map((line, index) => (
                                    <div
                                        key={line.id}
                                        className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg"
                                    >
                                        <div className="col-span-12 sm:col-span-4">
                                            <Label className="text-xs">Sản phẩm *</Label>
                                            <Input
                                                value={line.product_name}
                                                onChange={(e) => updateLine(line.id, 'product_name', e.target.value)}
                                                placeholder="Tên sản phẩm"
                                            />
                                        </div>
                                        <div className="col-span-4 sm:col-span-2">
                                            <Label className="text-xs">SL</Label>
                                            <Input
                                                type="number"
                                                value={line.quantity}
                                                onChange={(e) => updateLine(line.id, 'quantity', Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="col-span-4 sm:col-span-2">
                                            <Label className="text-xs">Đơn giá</Label>
                                            <Input
                                                type="number"
                                                value={line.unit_price}
                                                onChange={(e) => updateLine(line.id, 'unit_price', Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="col-span-3 sm:col-span-1">
                                            <Label className="text-xs">VAT %</Label>
                                            <Input
                                                type="number"
                                                value={line.tax_rate}
                                                onChange={(e) => updateLine(line.id, 'tax_rate', Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="col-span-4 sm:col-span-2">
                                            <Label className="text-xs">Thành tiền</Label>
                                            <div className="font-medium text-sm py-2">
                                                {formatMoney(
                                                    Number(line.quantity) * Number(line.unit_price) *
                                                    (1 + Number(line.tax_rate) / 100) - Number(line.discount || 0)
                                                )}
                                            </div>
                                        </div>
                                        <div className="col-span-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-600"
                                                onClick={() => removeLine(line.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notes */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Ghi chú</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Ghi chú thêm (không bắt buộc)"
                                rows={3}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Summary Sidebar */}
                <div className="space-y-6">
                    <Card className="sticky top-6">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calculator className="h-5 w-5" />
                                Tổng cộng
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Tổng tiền hàng</span>
                                <span>{formatMoney(totals.subTotal)}</span>
                            </div>
                            {totals.totalDiscount > 0 && (
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Chiết khấu</span>
                                    <span className="text-red-600">-{formatMoney(totals.totalDiscount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-muted-foreground">
                                <span>VAT</span>
                                <span>{formatMoney(totals.totalTax)}</span>
                            </div>
                            <div className="border-t pt-4">
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Tổng cộng</span>
                                    <span className="text-primary">{formatMoney(totals.totalAmount)}</span>
                                </div>
                            </div>

                            <Button
                                className="w-full"
                                size="lg"
                                onClick={handleSubmit}
                                disabled={createInvoice.isPending}
                            >
                                {createInvoice.isPending ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white mr-2" />
                                        Đang tạo...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        Tạo hóa đơn
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
