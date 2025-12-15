'use client';

// src/app/(dashboard)/kho/nhap/page.tsx
// Trang nhập kho

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Package,
    Check,
    Calendar,
    User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useStockIn } from '@/hooks/use-inventory';
import { useProducts } from '@/hooks/use-products';
import { usePartners } from '@/hooks/use-partners';
import { formatMoney, calculateMovingAverageCost } from '@/lib/decimal';

export default function StockInPage() {
    const router = useRouter();
    const stockInMutation = useStockIn();
    const { products } = useProducts({ limit: 100 });
    const { partners: vendors } = usePartners({ partner_type: 'VENDOR', limit: 100 });

    const [formData, setFormData] = useState({
        product_id: '',
        quantity: '',
        unit_price: '',
        date: new Date().toISOString().split('T')[0],
        partner_id: '',
        notes: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Get selected product info
    const selectedProduct = products.find((p) => p.id === formData.product_id);

    // Calculate new avg cost preview
    const quantityNum = parseFloat(formData.quantity) || 0;
    const priceNum = parseFloat(formData.unit_price) || 0;
    const totalValue = quantityNum * priceNum;

    const previewAvgCost = selectedProduct && quantityNum > 0 && priceNum > 0
        ? calculateMovingAverageCost(
            selectedProduct.stock_qty || 0,
            selectedProduct.avg_cost || 0,
            quantityNum,
            priceNum
        )
        : null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate
        const newErrors: Record<string, string> = {};
        if (!formData.product_id) newErrors.product_id = 'Vui lòng chọn sản phẩm';
        if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
            newErrors.quantity = 'Số lượng phải lớn hơn 0';
        }
        if (!formData.unit_price || parseFloat(formData.unit_price) < 0) {
            newErrors.unit_price = 'Đơn giá không hợp lệ';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            await stockInMutation.mutateAsync({
                product_id: formData.product_id,
                quantity: parseFloat(formData.quantity),
                unit_price: parseFloat(formData.unit_price),
                date: formData.date,
                partner_id: formData.partner_id || undefined,
                notes: formData.notes || undefined,
            });

            router.push('/kho');
        } catch (error) {
            // Error handled by mutation hook
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-card border-b">
                <div className="flex items-center gap-3 px-4 py-3">
                    <Link href="/kho">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold">Nhập kho</h1>
                        <p className="text-xs text-muted-foreground">Thêm hàng vào kho</p>
                    </div>
                </div>
            </header>

            {/* Form */}
            <main className="p-4 max-w-lg mx-auto">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Date */}
                    <div>
                        <Label className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Ngày nhập
                        </Label>
                        <Input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="mt-1"
                        />
                    </div>

                    {/* Product */}
                    <div>
                        <Label className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Sản phẩm *
                        </Label>
                        <Select
                            value={formData.product_id}
                            onValueChange={(v) => {
                                setFormData({ ...formData, product_id: v });
                                setErrors({ ...errors, product_id: '' });
                            }}
                        >
                            <SelectTrigger className={`mt-1 ${errors.product_id ? 'border-red-500' : ''}`}>
                                <SelectValue placeholder="Chọn sản phẩm" />
                            </SelectTrigger>
                            <SelectContent>
                                {products
                                    .filter((product) => product.id && product.id.trim() !== '')
                                    .map((product) => (
                                        <SelectItem key={product.id} value={product.id}>
                                            {product.code} - {product.name}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                        {errors.product_id && (
                            <p className="text-sm text-red-500 mt-1">{errors.product_id}</p>
                        )}
                        {selectedProduct && (
                            <p className="text-sm text-muted-foreground mt-1">
                                Tồn hiện tại: {selectedProduct.stock_qty || 0} {selectedProduct.unit}
                                @ {formatMoney(selectedProduct.avg_cost || 0)}đ
                            </p>
                        )}
                    </div>

                    {/* Quantity */}
                    <div>
                        <Label>Số lượng *</Label>
                        <Input
                            type="number"
                            placeholder="0"
                            value={formData.quantity}
                            onChange={(e) => {
                                setFormData({ ...formData, quantity: e.target.value });
                                setErrors({ ...errors, quantity: '' });
                            }}
                            className={`mt-1 text-2xl h-14 font-bold ${errors.quantity ? 'border-red-500' : ''}`}
                            min="0"
                            step="0.001"
                        />
                        {errors.quantity && (
                            <p className="text-sm text-red-500 mt-1">{errors.quantity}</p>
                        )}
                    </div>

                    {/* Unit Price */}
                    <div>
                        <Label>Đơn giá (VNĐ) *</Label>
                        <Input
                            type="number"
                            placeholder="0"
                            value={formData.unit_price}
                            onChange={(e) => {
                                setFormData({ ...formData, unit_price: e.target.value });
                                setErrors({ ...errors, unit_price: '' });
                            }}
                            className={`mt-1 text-xl h-12 ${errors.unit_price ? 'border-red-500' : ''}`}
                            min="0"
                        />
                        {errors.unit_price && (
                            <p className="text-sm text-red-500 mt-1">{errors.unit_price}</p>
                        )}
                    </div>

                    {/* Preview Card */}
                    {quantityNum > 0 && priceNum > 0 && (
                        <Card className="bg-emerald-50 dark:bg-emerald-950 border-emerald-200">
                            <CardContent className="p-4">
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Thành tiền:</span>
                                        <span className="font-bold text-emerald-600">
                                            {formatMoney(totalValue)}đ
                                        </span>
                                    </div>
                                    {previewAvgCost !== null && (
                                        <div className="flex justify-between">
                                            <span>Giá vốn mới:</span>
                                            <span className="font-medium">
                                                {formatMoney(previewAvgCost)}đ/{selectedProduct?.unit}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Vendor */}
                    <div>
                        <Label className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Nhà cung cấp
                        </Label>
                        <Select
                            value={formData.partner_id}
                            onValueChange={(v) => setFormData({ ...formData, partner_id: v === 'none' ? '' : v })}
                        >
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Chọn NCC (tùy chọn)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Không chọn</SelectItem>
                                {vendors
                                    .filter((partner) => partner.id && partner.id.trim() !== '')
                                    .map((partner) => (
                                        <SelectItem key={partner.id} value={partner.id}>
                                            {partner.name}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Notes */}
                    <div>
                        <Label>Ghi chú</Label>
                        <Textarea
                            placeholder="Nhập ghi chú..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="mt-1"
                            rows={2}
                        />
                    </div>

                    {/* Submit */}
                    <Button
                        type="submit"
                        className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700"
                        disabled={stockInMutation.isPending}
                    >
                        <Check className="w-5 h-5 mr-2" />
                        {stockInMutation.isPending ? 'Đang xử lý...' : 'Nhập kho'}
                    </Button>
                </form>
            </main>
        </div>
    );
}
