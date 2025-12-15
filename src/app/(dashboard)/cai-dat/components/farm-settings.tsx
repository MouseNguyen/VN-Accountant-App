// src/app/(dashboard)/cai-dat/components/farm-settings.tsx
// Farm settings component - update farm info, change business type

'use client';

import { useEffect } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFarm } from '@/hooks/use-farm';
import { useFormDirty } from '@/hooks/use-form-dirty';
import { BusinessTypeSelector } from '@/components/shared/business-type-selector';
import { useAuthStore } from '@/stores/auth-store';
import { Loader2, Save, X } from 'lucide-react';

export function FarmSettings() {
    const { user } = useAuthStore();
    const {
        farm,
        isLoading,
        updateFarm,
        isUpdating,
        changeBusinessType,
        isChangingType,
    } = useFarm();
    const isOwner = user?.role === 'OWNER';

    const { values, setValue, isDirty, reset, syncWithInitial } = useFormDirty({
        name: farm?.name || '',
        owner_name: farm?.owner_name || '',
        phone: farm?.phone || '',
        email: farm?.email || '',
        address: farm?.address || '',
        tax_code: farm?.tax_code || '',
    });

    // Sync when farm data loads
    useEffect(() => {
        if (farm) {
            syncWithInitial({
                name: farm.name || '',
                owner_name: farm.owner_name || '',
                phone: farm.phone || '',
                email: farm.email || '',
                address: farm.address || '',
                tax_code: farm.tax_code || '',
            });
        }
    }, [farm, syncWithInitial]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateFarm(values);
    };

    if (isLoading) {
        return <FarmSettingsSkeleton />;
    }

    return (
        <div className="space-y-6">
            {/* Thông tin cơ bản */}
            <Card>
                <CardHeader>
                    <CardTitle>Thông tin nông trại</CardTitle>
                    <CardDescription>
                        {isOwner
                            ? 'Cập nhật thông tin cơ bản của nông trại'
                            : 'Chỉ chủ sở hữu mới có thể chỉnh sửa'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Tên nông trại *</Label>
                                <Input
                                    id="name"
                                    value={values.name}
                                    onChange={(e) => setValue('name', e.target.value)}
                                    disabled={!isOwner}
                                    placeholder="VD: Nông trại Hòa Bình"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="owner_name">Tên chủ sở hữu *</Label>
                                <Input
                                    id="owner_name"
                                    value={values.owner_name}
                                    onChange={(e) => setValue('owner_name', e.target.value)}
                                    disabled={!isOwner}
                                    placeholder="VD: Nguyễn Văn A"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Số điện thoại</Label>
                                <Input
                                    id="phone"
                                    value={values.phone}
                                    onChange={(e) => setValue('phone', e.target.value)}
                                    disabled={!isOwner}
                                    placeholder="VD: 0901234567"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={values.email}
                                    onChange={(e) => setValue('email', e.target.value)}
                                    disabled={!isOwner}
                                    placeholder="VD: nongtrai@email.com"
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="address">Địa chỉ</Label>
                                <Input
                                    id="address"
                                    value={values.address}
                                    onChange={(e) => setValue('address', e.target.value)}
                                    disabled={!isOwner}
                                    placeholder="VD: Xã ABC, Huyện XYZ, Tỉnh..."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="tax_code">Mã số thuế</Label>
                                <Input
                                    id="tax_code"
                                    value={values.tax_code}
                                    onChange={(e) => setValue('tax_code', e.target.value)}
                                    disabled={!isOwner}
                                    placeholder="VD: 0123456789"
                                />
                            </div>
                        </div>

                        {isOwner && (
                            <div className="flex gap-2 pt-4">
                                <Button type="submit" disabled={!isDirty || isUpdating}>
                                    {isUpdating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Đang lưu...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Lưu thay đổi
                                        </>
                                    )}
                                </Button>
                                {isDirty && (
                                    <Button type="button" variant="outline" onClick={reset}>
                                        <X className="mr-2 h-4 w-4" />
                                        Hủy
                                    </Button>
                                )}
                            </div>
                        )}
                    </form>
                </CardContent>
            </Card>

            {/* Mô hình kinh doanh */}
            {isOwner && (
                <Card>
                    <CardHeader>
                        <CardTitle>Mô hình kinh doanh</CardTitle>
                        <CardDescription>
                            Thay đổi sẽ ảnh hưởng đến toàn bộ giao diện ứng dụng
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <BusinessTypeSelector
                            value={farm?.business_type || 'FARM'}
                            onChange={(type) => changeBusinessType(type)}
                            showConfirm={true}
                            isLoading={isChangingType}
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function FarmSettingsSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-72 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
