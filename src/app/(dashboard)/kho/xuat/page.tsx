'use client';

// src/app/(dashboard)/kho/xuat/page.tsx
// Trang xuất kho

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Package,
    Check,
    Calendar,
    User,
    AlertCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import { useStockOut } from '@/hooks/use-inventory';
import { useProducts } from '@/hooks/use-products';
import { usePartners } from '@/hooks/use-partners';
import { formatMoney, formatQuantity } from '@/lib/decimal';

export default function StockOutPage() {
    const router = useRouter();
    const stockOutMutation = useStockOut();
    const { products } = useProducts({ limit: 100 });
    const { partners: customers } = usePartners({ partner_type: 'CUSTOMER', limit: 100 });

    const [formData, setFormData] = useState({
        product_id: '',
        quantity: '',
        date: new Date().toISOString().split('T')[0],
        partner_id: '',
        notes: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Get selected product info
    const selectedProduct = products.find((p) => p.id === formData.product_id);

    // Calculate values - convert Decimal to number
    const quantityNum = parseFloat(formData.quantity) || 0;
    const currentStock = Number(selectedProduct?.stock_qty ?? 0);
    const avgCost = Number(selectedProduct?.avg_cost ?? 0);
    const cogsAmount = quantityNum * avgCost;
    const remainingQty = currentStock - quantityNum;
    const isOverStock = quantityNum > currentStock;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate
        const newErrors: Record<string, string> = {};
        if (!formData.product_id) newErrors.product_id = 'Vui lòng chọn sản phẩm';
        if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
            newErrors.quantity = 'Số lượng phải lớn hơn 0';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            await stockOutMutation.mutateAsync({
                product_id: formData.product_id,
                quantity: parseFloat(formData.quantity),
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
                        <h1 className="text-lg font-bold">Xuất kho</h1>
                        <p className="text-xs text-muted-foreground">Xuất hàng khỏi kho</p>
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
                            Ngày xuất
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
                                setFormData({ ...formData, product_id: v, quantity: '' });
                                setErrors({ ...errors, product_id: '' });
                            }}
                        >
                            <SelectTrigger className={`mt-1 ${errors.product_id ? 'border-red-500' : ''}`}>
                                <SelectValue placeholder="Chọn sản phẩm" />
                            </SelectTrigger>
                            <SelectContent>
                                {products
                                    .filter((p) => p.id && p.id.trim() !== '' && (p.stock_qty || 0) > 0)
                                    .map((product) => (
                                        <SelectItem key={product.id} value={product.id}>
                                            {product.code} - {product.name} ({formatQuantity(product.stock_qty || 0)} {product.unit})
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                        {errors.product_id && (
                            <p className="text-sm text-red-500 mt-1">{errors.product_id}</p>
                        )}
                        {selectedProduct && (
                            <div className="mt-2 p-3 rounded-lg bg-muted">
                                <div className="flex justify-between text-sm">
                                    <span>Tồn kho:</span>
                                    <span className="font-bold">
                                        {formatQuantity(selectedProduct.stock_qty || 0)} {selectedProduct.unit}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                    <span>Giá vốn:</span>
                                    <span>{formatMoney(selectedProduct.avg_cost || 0)}đ/{selectedProduct.unit}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quantity */}
                    <div>
                        <Label>Số lượng xuất *</Label>
                        <Input
                            type="number"
                            placeholder="0"
                            value={formData.quantity}
                            onChange={(e) => {
                                setFormData({ ...formData, quantity: e.target.value });
                                setErrors({ ...errors, quantity: '' });
                            }}
                            className={`mt-1 text-2xl h-14 font-bold ${errors.quantity || isOverStock ? 'border-red-500' : ''}`}
                            min="0"
                            step="0.001"
                            max={currentStock || undefined}
                        />
                        {errors.quantity && (
                            <p className="text-sm text-red-500 mt-1">{errors.quantity}</p>
                        )}
                        {isOverStock && selectedProduct && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-amber-600">
                                <AlertCircle className="h-4 w-4" />
                                <span>Vượt quá tồn kho! Tối đa: {formatQuantity(currentStock)}</span>
                            </div>
                        )}
                    </div>

                    {/* Preview Card */}
                    {quantityNum > 0 && selectedProduct && (
                        <Card className={`${isOverStock ? 'bg-red-50 border-red-200 dark:bg-red-950' : 'bg-orange-50 border-orange-200 dark:bg-orange-950'}`}>
                            <CardContent className="p-4">
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Giá vốn hàng xuất:</span>
                                        <span className="font-bold text-orange-600">
                                            {formatMoney(cogsAmount)}đ
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Tồn sau xuất:</span>
                                        <span className={`font-medium ${remainingQty < 0 ? 'text-red-600' : ''}`}>
                                            {formatQuantity(remainingQty)} {selectedProduct.unit}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Customer */}
                    <div>
                        <Label className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Khách hàng
                        </Label>
                        <Select
                            value={formData.partner_id}
                            onValueChange={(v) => setFormData({ ...formData, partner_id: v === 'none' ? '' : v })}
                        >
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Chọn khách hàng (tùy chọn)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Không chọn</SelectItem>
                                {customers
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
                        className="w-full h-14 text-lg bg-orange-600 hover:bg-orange-700"
                        disabled={stockOutMutation.isPending || isOverStock}
                    >
                        <Check className="w-5 h-5 mr-2" />
                        {stockOutMutation.isPending ? 'Đang xử lý...' : 'Xuất kho'}
                    </Button>
                </form>
            </main>
        </div>
    );
}
