'use client';

// src/app/(dashboard)/kho/dieu-chinh/page.tsx
// Trang điều chỉnh tồn kho

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Package,
    Check,
    AlertCircle,
    ArrowUpDown
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
import { useStockAdjust } from '@/hooks/use-inventory';
import { useProducts } from '@/hooks/use-products';
import { formatMoney, formatQuantity } from '@/lib/decimal';

export default function StockAdjustPage() {
    const router = useRouter();
    const stockAdjustMutation = useStockAdjust();
    const { products } = useProducts({ limit: 100 });

    const [formData, setFormData] = useState({
        product_id: '',
        new_quantity: '',
        reason: '',
        notes: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Get selected product info
    const selectedProduct = products.find((p) => p.id === formData.product_id);

    // Calculate variance
    const newQty = parseFloat(formData.new_quantity) || 0;
    const currentQty = selectedProduct?.stock_qty || 0;
    const variance = newQty - currentQty;
    const isIncrease = variance > 0;
    const avgCost = selectedProduct?.avg_cost || 0;
    const varianceValue = Math.abs(variance) * avgCost;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate
        const newErrors: Record<string, string> = {};
        if (!formData.product_id) newErrors.product_id = 'Vui lòng chọn sản phẩm';
        if (formData.new_quantity === '' || parseFloat(formData.new_quantity) < 0) {
            newErrors.new_quantity = 'Số lượng không hợp lệ';
        }
        if (!formData.reason.trim()) {
            newErrors.reason = 'Vui lòng nhập lý do điều chỉnh';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        if (variance === 0) {
            setErrors({ new_quantity: 'Số lượng mới giống số lượng hiện tại' });
            return;
        }

        try {
            await stockAdjustMutation.mutateAsync({
                product_id: formData.product_id,
                new_quantity: parseFloat(formData.new_quantity),
                reason: formData.reason,
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
                        <h1 className="text-lg font-bold">Điều chỉnh tồn kho</h1>
                        <p className="text-xs text-muted-foreground">Điều chỉnh số lượng tồn kho</p>
                    </div>
                </div>
            </header>

            {/* Form */}
            <main className="p-4 max-w-lg mx-auto">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Product */}
                    <div>
                        <Label className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Sản phẩm *
                        </Label>
                        <Select
                            value={formData.product_id}
                            onValueChange={(v) => {
                                setFormData({ ...formData, product_id: v, new_quantity: '' });
                                setErrors({ ...errors, product_id: '' });
                            }}
                        >
                            <SelectTrigger className={`mt-1 ${errors.product_id ? 'border-red-500' : ''}`}>
                                <SelectValue placeholder="Chọn sản phẩm" />
                            </SelectTrigger>
                            <SelectContent>
                                {products
                                    .filter((p) => p.id && p.id.trim() !== '')
                                    .map((product) => (
                                        <SelectItem key={product.id} value={product.id}>
                                            {product.code} - {product.name} (Tồn: {formatQuantity(product.stock_qty || 0)})
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
                                    <span>Tồn hiện tại:</span>
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

                    {/* New Quantity */}
                    <div>
                        <Label className="flex items-center gap-2">
                            <ArrowUpDown className="h-4 w-4" />
                            Số lượng mới *
                        </Label>
                        <Input
                            type="number"
                            placeholder="0"
                            value={formData.new_quantity}
                            onChange={(e) => {
                                setFormData({ ...formData, new_quantity: e.target.value });
                                setErrors({ ...errors, new_quantity: '' });
                            }}
                            className={`mt-1 text-2xl h-14 font-bold ${errors.new_quantity ? 'border-red-500' : ''}`}
                            min="0"
                            step="0.001"
                        />
                        {errors.new_quantity && (
                            <p className="text-sm text-red-500 mt-1">{errors.new_quantity}</p>
                        )}
                    </div>

                    {/* Preview Card */}
                    {selectedProduct && formData.new_quantity !== '' && variance !== 0 && (
                        <Card className={`${isIncrease ? 'bg-green-50 border-green-200 dark:bg-green-950' : 'bg-red-50 border-red-200 dark:bg-red-950'}`}>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <AlertCircle className={`h-4 w-4 ${isIncrease ? 'text-green-600' : 'text-red-600'}`} />
                                    <span className="font-medium">
                                        {isIncrease ? 'Tăng tồn kho' : 'Giảm tồn kho'}
                                    </span>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Chênh lệch:</span>
                                        <span className={`font-bold ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                                            {isIncrease ? '+' : ''}{formatQuantity(variance)} {selectedProduct.unit}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Giá trị:</span>
                                        <span className={`font-medium ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                                            {isIncrease ? '+' : '-'}{formatMoney(varianceValue)}đ
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Reason */}
                    <div>
                        <Label>Lý do điều chỉnh *</Label>
                        <Select
                            value={formData.reason}
                            onValueChange={(v) => {
                                setFormData({ ...formData, reason: v });
                                setErrors({ ...errors, reason: '' });
                            }}
                        >
                            <SelectTrigger className={`mt-1 ${errors.reason ? 'border-red-500' : ''}`}>
                                <SelectValue placeholder="Chọn lý do" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Hàng hư hỏng">Hàng hư hỏng</SelectItem>
                                <SelectItem value="Hàng hết hạn">Hàng hết hạn</SelectItem>
                                <SelectItem value="Mất mát">Mất mát</SelectItem>
                                <SelectItem value="Kiểm kê chênh lệch">Kiểm kê chênh lệch</SelectItem>
                                <SelectItem value="Nhập sai số lượng">Nhập sai số lượng (sửa)</SelectItem>
                                <SelectItem value="Xuất sai số lượng">Xuất sai số lượng (sửa)</SelectItem>
                                <SelectItem value="Khác">Khác</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.reason && (
                            <p className="text-sm text-red-500 mt-1">{errors.reason}</p>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <Label>Ghi chú chi tiết</Label>
                        <Textarea
                            placeholder="Nhập chi tiết lý do điều chỉnh..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="mt-1"
                            rows={3}
                        />
                    </div>

                    {/* Submit */}
                    <Button
                        type="submit"
                        className="w-full h-14 text-lg"
                        disabled={stockAdjustMutation.isPending || variance === 0}
                    >
                        <Check className="w-5 h-5 mr-2" />
                        {stockAdjustMutation.isPending ? 'Đang xử lý...' : 'Điều chỉnh'}
                    </Button>
                </form>
            </main>
        </div>
    );
}
