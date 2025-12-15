// src/app/(dashboard)/hoa-don/[id]/confirm/page.tsx

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Invoice } from '@/types/invoice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/utils';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Check,
    Loader2,
    AlertCircle,
    Building2,
    Calendar,
    Hash,
    DollarSign,
} from 'lucide-react';
import Link from 'next/link';

export default function InvoiceConfirmPage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const invoiceId = params.id as string;

    const [formData, setFormData] = useState({
        invoice_number: '',
        invoice_date: '',
        supplier_name: '',
        supplier_tax_code: '',
        total_amount: 0,
        tax_amount: 0,
        payment_method: 'CASH',
        paid_amount: 0,
        create_partner: true,
        note: '',
    });

    const { data: invoice, isLoading } = useQuery({
        queryKey: ['invoice', invoiceId],
        queryFn: async () => {
            const res = await apiClient.get<Invoice>(`/invoices/${invoiceId}`);
            if (!res.success || !res.data) {
                throw new Error('Không tìm thấy hóa đơn');
            }
            // Initialize form with OCR data
            const inv = res.data;
            setFormData({
                invoice_number: inv.invoice_number || '',
                invoice_date: inv.invoice_date?.split('T')[0] || new Date().toISOString().split('T')[0],
                supplier_name: inv.supplier_name || '',
                supplier_tax_code: inv.supplier_tax_code || '',
                total_amount: Number(inv.total_amount) || 0,
                tax_amount: Number(inv.tax_amount) || 0,
                payment_method: 'CASH',
                paid_amount: 0,
                create_partner: true,
                note: '',
            });
            return inv;
        },
    });

    const confirmMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const res = await apiClient.post(`/invoices/${invoiceId}/confirm`, data);
            if (!res.success) {
                throw new Error(res.error?.message || 'Lỗi xác nhận');
            }
            return res.data;
        },
        onSuccess: () => {
            toast.success('Đã tạo giao dịch từ hóa đơn!');
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            router.push('/hoa-don');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        confirmMutation.mutate(formData);
    };

    if (isLoading) {
        return (
            <div className="p-4 space-y-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-64 w-full rounded-xl" />
                <Skeleton className="h-48 w-full rounded-xl" />
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="p-4 text-center py-12">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">Không tìm thấy hóa đơn</p>
                <Link href="/hoa-don">
                    <Button variant="outline" className="mt-4">
                        Quay lại
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="p-4 pb-24 min-h-screen">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Link href="/hoa-don" className="p-2 hover:bg-gray-100 rounded-lg">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-xl font-bold">✅ Xác nhận hóa đơn</h1>
            </div>

            {/* OCR Confidence */}
            {invoice.ocr_confidence && (
                <Card className="mb-4 border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-blue-700">
                            <Check className="w-5 h-5" />
                            <span>Độ tin cậy OCR: {Number(invoice.ocr_confidence).toFixed(0)}%</span>
                        </div>
                        <p className="text-sm text-blue-600 mt-1">
                            Vui lòng kiểm tra và sửa thông tin nếu cần trước khi xác nhận
                        </p>
                    </CardContent>
                </Card>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Thông tin hóa đơn */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Hash className="w-5 h-5" />
                            Thông tin hóa đơn
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="invoice_number">Số hóa đơn</Label>
                            <Input
                                id="invoice_number"
                                value={formData.invoice_number}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, invoice_number: e.target.value }))
                                }
                                placeholder="Nhập số hóa đơn"
                            />
                        </div>
                        <div>
                            <Label htmlFor="invoice_date">Ngày hóa đơn</Label>
                            <Input
                                id="invoice_date"
                                type="date"
                                value={formData.invoice_date}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, invoice_date: e.target.value }))
                                }
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Nhà cung cấp */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Building2 className="w-5 h-5" />
                            Nhà cung cấp
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="supplier_name">Tên nhà cung cấp</Label>
                            <Input
                                id="supplier_name"
                                value={formData.supplier_name}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, supplier_name: e.target.value }))
                                }
                                placeholder="Công ty ABC"
                            />
                        </div>
                        <div>
                            <Label htmlFor="supplier_tax_code">Mã số thuế</Label>
                            <Input
                                id="supplier_tax_code"
                                value={formData.supplier_tax_code}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, supplier_tax_code: e.target.value }))
                                }
                                placeholder="0123456789"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="create_partner"
                                checked={formData.create_partner}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, create_partner: e.target.checked }))
                                }
                                className="rounded"
                            />
                            <Label htmlFor="create_partner" className="text-sm font-normal">
                                Tạo đối tác mới nếu chưa tồn tại
                            </Label>
                        </div>
                    </CardContent>
                </Card>

                {/* Số tiền */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            Số tiền
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="total_amount">Tổng tiền</Label>
                            <Input
                                id="total_amount"
                                type="number"
                                value={formData.total_amount}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, total_amount: Number(e.target.value) }))
                                }
                            />
                        </div>
                        <div>
                            <Label htmlFor="tax_amount">Tiền thuế (VAT)</Label>
                            <Input
                                id="tax_amount"
                                type="number"
                                value={formData.tax_amount}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, tax_amount: Number(e.target.value) }))
                                }
                            />
                        </div>
                        <div>
                            <Label htmlFor="paid_amount">Đã thanh toán</Label>
                            <Input
                                id="paid_amount"
                                type="number"
                                value={formData.paid_amount}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, paid_amount: Number(e.target.value) }))
                                }
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Ghi chú */}
                <Card>
                    <CardContent className="p-4">
                        <Label htmlFor="note">Ghi chú</Label>
                        <Input
                            id="note"
                            value={formData.note}
                            onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
                            placeholder="Ghi chú thêm..."
                        />
                    </CardContent>
                </Card>

                {/* Summary */}
                <Card className="bg-primary text-white">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                            <span>Tổng tiền giao dịch:</span>
                            <span className="text-2xl font-bold">{formatMoney(formData.total_amount)}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Submit */}
                <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={confirmMutation.isPending || formData.total_amount <= 0}
                >
                    {confirmMutation.isPending ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Đang xử lý...
                        </>
                    ) : (
                        <>
                            <Check className="w-5 h-5 mr-2" />
                            Xác nhận & Tạo giao dịch
                        </>
                    )}
                </Button>
            </form>
        </div>
    );
}
