// src/app/(dashboard)/tai-san/them/page.tsx
// Add New Asset Form

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateAsset } from '@/hooks/use-assets';
import { createAssetSchema, CreateAssetSchema } from '@/lib/validations/asset';
import {
    getDefaultUsefulLife,
    validateUsefulLife,
    calculateMonthlyDepreciationAmount,
    getCategoryLabel,
    VEHICLE_DEPRECIATION_CAP,
} from '@/lib/assets/depreciation-constants';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, AlertTriangle, Info } from 'lucide-react';
import Link from 'next/link';
import { formatMoney } from '@/lib/utils';

const categories = [
    { value: 'MACHINERY', label: 'Máy móc, thiết bị sản xuất' },
    { value: 'VEHICLE', label: 'Phương tiện vận tải' },
    { value: 'BUILDING', label: 'Nhà cửa, vật kiến trúc' },
    { value: 'EQUIPMENT', label: 'Thiết bị, công cụ' },
    { value: 'LIVESTOCK', label: 'Động vật làm việc' },
    { value: 'OTHER', label: 'Tài sản khác' },
];

export default function AddAssetPage() {
    const router = useRouter();
    const createAsset = useCreateAsset();

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<CreateAssetSchema>({
        resolver: zodResolver(createAssetSchema),
        defaultValues: {
            depreciation_method: 'STRAIGHT_LINE',
            residual_value: 0,
            is_transport_biz: false,
        },
    });

    const category = watch('category');
    const purchasePrice = watch('purchase_price') || 0;
    const usefulLifeMonths = watch('useful_life_months');
    const residualValue = watch('residual_value') || 0;
    const isTransportBiz = watch('is_transport_biz');

    // Calculate preview values
    const defaultLifeMonths = category ? getDefaultUsefulLife(category) : 60;
    const actualLifeMonths = usefulLifeMonths || defaultLifeMonths;
    const monthlyDepreciation = calculateMonthlyDepreciationAmount(
        purchasePrice,
        actualLifeMonths,
        residualValue
    );

    // Validation warnings
    const lifeValidation = category ? validateUsefulLife(category, actualLifeMonths) : { valid: true };

    // Vehicle cap warning
    const isVehicleOverCap = category === 'VEHICLE' && purchasePrice > VEHICLE_DEPRECIATION_CAP && !isTransportBiz;

    const onSubmit = async (data: CreateAssetSchema) => {
        try {
            await createAsset.mutateAsync(data);
            router.push('/tai-san');
        } catch (error) {
            // Error handled by mutation
        }
    };

    return (
        <div className="p-4 max-w-2xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/tai-san">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">Thêm tài sản cố định</h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Basic Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>Thông tin cơ bản</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label htmlFor="name">Tên tài sản *</Label>
                                <Input
                                    id="name"
                                    placeholder="VD: Máy cày Kubota L3608"
                                    {...register('name')}
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="category">Loại tài sản *</Label>
                                <Select
                                    value={category}
                                    onValueChange={(v) => setValue('category', v as any)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn loại" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.value} value={cat.value}>
                                                {cat.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.category && (
                                    <p className="text-sm text-red-500 mt-1">{errors.category.message}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="code">Mã tài sản</Label>
                                <Input
                                    id="code"
                                    placeholder="Tự động nếu để trống"
                                    {...register('code')}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Purchase Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>Thông tin mua</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="purchase_date">Ngày mua *</Label>
                                <Input
                                    id="purchase_date"
                                    type="date"
                                    max={new Date().toISOString().split('T')[0]}
                                    {...register('purchase_date')}
                                />
                                {errors.purchase_date && (
                                    <p className="text-sm text-red-500 mt-1">{errors.purchase_date.message}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="purchase_price">Giá mua (VND) *</Label>
                                <Input
                                    id="purchase_price"
                                    type="number"
                                    placeholder="0"
                                    {...register('purchase_price', { valueAsNumber: true })}
                                />
                                {errors.purchase_price && (
                                    <p className="text-sm text-red-500 mt-1">{errors.purchase_price.message}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="supplier">Nhà cung cấp</Label>
                                <Input
                                    id="supplier"
                                    placeholder="Tên nhà cung cấp"
                                    {...register('supplier')}
                                />
                            </div>

                            <div>
                                <Label htmlFor="invoice_number">Số hóa đơn</Label>
                                <Input
                                    id="invoice_number"
                                    placeholder="VD: 0000123"
                                    {...register('invoice_number')}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Depreciation */}
                <Card>
                    <CardHeader>
                        <CardTitle>Khấu hao</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="useful_life_months">
                                    Thời gian sử dụng (tháng)
                                </Label>
                                <Input
                                    id="useful_life_months"
                                    type="number"
                                    placeholder={`Mặc định: ${defaultLifeMonths} tháng`}
                                    {...register('useful_life_months', { valueAsNumber: true })}
                                />
                                {category && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Mặc định: {defaultLifeMonths} tháng ({Math.round(defaultLifeMonths / 12)} năm)
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="residual_value">Giá trị còn lại dự kiến</Label>
                                <Input
                                    id="residual_value"
                                    type="number"
                                    placeholder="0"
                                    {...register('residual_value', { valueAsNumber: true })}
                                />
                            </div>
                        </div>

                        {!lifeValidation.valid && (
                            <Alert variant="destructive">
                                <AlertTriangle className="w-4 h-4" />
                                <AlertDescription>{lifeValidation.message}</AlertDescription>
                            </Alert>
                        )}

                        {/* Vehicle Transport Business Toggle */}
                        {category === 'VEHICLE' && (
                            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div>
                                    <Label>Doanh nghiệp vận tải</Label>
                                    <p className="text-xs text-muted-foreground">
                                        DN vận tải được khấu trừ toàn bộ (không giới hạn 1.6 tỷ)
                                    </p>
                                </div>
                                <Switch
                                    checked={isTransportBiz}
                                    onCheckedChange={(v) => setValue('is_transport_biz', v)}
                                />
                            </div>
                        )}

                        {isVehicleOverCap && (
                            <Alert>
                                <Info className="w-4 h-4" />
                                <AlertDescription>
                                    Xe {">"} 1.6 tỷ: Chỉ được khấu trừ thuế tối đa{' '}
                                    {formatMoney(VEHICLE_DEPRECIATION_CAP)} (TT96/2015)
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Preview */}
                        {purchasePrice > 0 && (
                            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                <div className="text-sm font-medium text-green-800 mb-2">
                                    Dự tính khấu hao
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="text-muted-foreground">Khấu hao hàng tháng:</div>
                                    <div className="font-semibold">{formatMoney(monthlyDepreciation)}</div>
                                    <div className="text-muted-foreground">Khấu hao năm:</div>
                                    <div className="font-semibold">{formatMoney(monthlyDepreciation * 12)}</div>
                                    <div className="text-muted-foreground">Thời gian:</div>
                                    <div className="font-semibold">
                                        {actualLifeMonths} tháng ({Math.round(actualLifeMonths / 12 * 10) / 10} năm)
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Additional Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>Thông tin bổ sung</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="location">Vị trí</Label>
                                <Input
                                    id="location"
                                    placeholder="VD: Kho A, Nhà xưởng 1"
                                    {...register('location')}
                                />
                            </div>

                            <div>
                                <Label htmlFor="serial_number">Số seri</Label>
                                <Input
                                    id="serial_number"
                                    placeholder="VD: SN123456789"
                                    {...register('serial_number')}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-3 justify-end">
                    <Link href="/tai-san">
                        <Button variant="outline" type="button">
                            Hủy
                        </Button>
                    </Link>
                    <Button
                        type="submit"
                        disabled={createAsset.isPending || !lifeValidation.valid}
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {createAsset.isPending ? 'Đang lưu...' : 'Lưu tài sản'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
