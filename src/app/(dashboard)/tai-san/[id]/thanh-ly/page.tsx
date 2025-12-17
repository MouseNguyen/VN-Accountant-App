// src/app/(dashboard)/tai-san/[id]/thanh-ly/page.tsx
// Dispose/Sell Asset Page

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAsset, useDisposeAsset } from '@/hooks/use-assets';
import { disposeAssetSchema, DisposeAssetSchema } from '@/lib/validations/asset';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { formatMoney } from '@/lib/utils';

export default function DisposeAssetPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const { data: asset, isLoading } = useAsset(id);
    const disposeAsset = useDisposeAsset();

    const [disposalType, setDisposalType] = useState<'dispose' | 'sell'>('dispose');

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<DisposeAssetSchema>({
        resolver: zodResolver(disposeAssetSchema),
        defaultValues: {
            disposed_value: 0,
            disposed_at: new Date().toISOString().split('T')[0],
        },
    });

    const disposedValue = watch('disposed_value') || 0;

    if (isLoading) {
        return (
            <div className="p-4 space-y-4 max-w-lg mx-auto">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!asset) {
        return (
            <div className="p-4 text-center">
                <h1 className="text-xl font-bold text-red-600">Tài sản không tồn tại</h1>
                <Link href="/tai-san">
                    <Button className="mt-4">Quay lại</Button>
                </Link>
            </div>
        );
    }

    if (asset.status !== 'ACTIVE') {
        return (
            <div className="p-4 text-center">
                <h1 className="text-xl font-bold text-yellow-600">Tài sản đã thanh lý</h1>
                <Link href={`/tai-san/${id}`}>
                    <Button className="mt-4">Xem chi tiết</Button>
                </Link>
            </div>
        );
    }

    const gainLoss = disposalType === 'sell' ? disposedValue - asset.book_value : -asset.book_value;
    const isGain = gainLoss >= 0;

    const onSubmit = async (data: DisposeAssetSchema) => {
        try {
            const submitData = {
                ...data,
                disposed_value: disposalType === 'sell' ? data.disposed_value : 0,
            };
            await disposeAsset.mutateAsync({ id, data: submitData });
            router.push('/tai-san');
        } catch (error) {
            // Error handled by mutation
        }
    };

    return (
        <div className="p-4 max-w-lg mx-auto space-y-4">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href={`/tai-san/${id}`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">Thanh lý tài sản</h1>
            </div>

            {/* Asset Info */}
            <Card>
                <CardContent className="p-4">
                    <div className="font-medium text-lg">{asset.name}</div>
                    <div className="text-muted-foreground">{asset.code}</div>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                        <div className="text-muted-foreground">Nguyên giá:</div>
                        <div className="text-right font-medium">{formatMoney(asset.original_cost)}</div>
                        <div className="text-muted-foreground">Đã khấu hao:</div>
                        <div className="text-right font-medium text-red-600">
                            {formatMoney(asset.accumulated_depreciation)}
                        </div>
                        <div className="text-muted-foreground">Giá trị sổ sách:</div>
                        <div className="text-right font-bold text-lg text-green-600">
                            {formatMoney(asset.book_value)}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Disposal Type */}
                <Card>
                    <CardHeader>
                        <CardTitle>Hình thức</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup
                            value={disposalType}
                            onValueChange={(v) => setDisposalType(v as any)}
                            className="space-y-3"
                        >
                            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted">
                                <RadioGroupItem value="dispose" id="dispose" />
                                <Label htmlFor="dispose" className="flex-1 cursor-pointer">
                                    <div className="font-medium">Thanh lý (hủy bỏ)</div>
                                    <div className="text-sm text-muted-foreground">
                                        Không thu hồi được giá trị
                                    </div>
                                </Label>
                            </div>
                            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted">
                                <RadioGroupItem value="sell" id="sell" />
                                <Label htmlFor="sell" className="flex-1 cursor-pointer">
                                    <div className="font-medium">Bán</div>
                                    <div className="text-sm text-muted-foreground">
                                        Thu hồi một phần hoặc toàn bộ giá trị
                                    </div>
                                </Label>
                            </div>
                        </RadioGroup>
                    </CardContent>
                </Card>

                {/* Sale Value */}
                {disposalType === 'sell' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Giá bán</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="disposed_value">Số tiền thu về (VND)</Label>
                                <Input
                                    id="disposed_value"
                                    type="number"
                                    placeholder="0"
                                    {...register('disposed_value', { valueAsNumber: true })}
                                />
                                {errors.disposed_value && (
                                    <p className="text-sm text-red-500 mt-1">
                                        {errors.disposed_value.message}
                                    </p>
                                )}
                            </div>

                            {/* Gain/Loss Preview */}
                            <div
                                className={`p-4 rounded-lg border ${isGain ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    {isGain ? (
                                        <TrendingUp className="w-5 h-5 text-green-600" />
                                    ) : (
                                        <TrendingDown className="w-5 h-5 text-red-600" />
                                    )}
                                    <span className="font-medium">
                                        {isGain ? 'Lãi thanh lý' : 'Lỗ thanh lý'}
                                    </span>
                                </div>
                                <div className={`text-2xl font-bold ${isGain ? 'text-green-600' : 'text-red-600'}`}>
                                    {isGain ? '+' : ''}
                                    {formatMoney(gainLoss)}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                    = {formatMoney(disposedValue)} - {formatMoney(asset.book_value)}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>Chi tiết</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="disposed_at">Ngày thanh lý</Label>
                            <Input
                                id="disposed_at"
                                type="date"
                                max={new Date().toISOString().split('T')[0]}
                                {...register('disposed_at')}
                            />
                        </div>

                        <div>
                            <Label htmlFor="disposal_reason">Lý do</Label>
                            <Textarea
                                id="disposal_reason"
                                placeholder="VD: Hết hạn sử dụng, hỏng không sửa được, thay thế máy mới..."
                                {...register('disposal_reason')}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Warning */}
                <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                        <strong>Lưu ý:</strong> Sau khi thanh lý, tài sản sẽ không thể khôi phục và{' '}
                        {disposalType === 'sell'
                            ? 'giao dịch lãi/lỗ sẽ được tạo tự động.'
                            : 'giá trị còn lại sẽ được ghi nhận là lỗ.'}
                    </AlertDescription>
                </Alert>

                {/* Actions */}
                <div className="flex gap-3 justify-end">
                    <Link href={`/tai-san/${id}`}>
                        <Button variant="outline" type="button">
                            Hủy
                        </Button>
                    </Link>
                    <Button
                        type="submit"
                        variant="destructive"
                        disabled={disposeAsset.isPending}
                    >
                        {disposeAsset.isPending
                            ? 'Đang xử lý...'
                            : disposalType === 'sell'
                                ? 'Xác nhận bán'
                                : 'Xác nhận thanh lý'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
