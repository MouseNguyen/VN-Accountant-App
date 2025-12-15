// src/app/(dashboard)/cai-dat/components/user-settings.tsx
// User settings component - update profile, avatar, and email

'use client';

import { useEffect, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useUser } from '@/hooks/use-user';
import { useFormDirty } from '@/hooks/use-form-dirty';
import { AvatarSelector } from '@/components/shared/avatar-selector';
import { USER_ROLES } from '@/lib/constants/index';
import { Loader2, Save, X, Mail, CheckCircle, AlertCircle } from 'lucide-react';

export function UserSettings() {
    const { user, isLoading, updateUser, isUpdating, changeEmail, isChangingEmail } =
        useUser();

    const { values, setValue, isDirty, reset, syncWithInitial } = useFormDirty({
        full_name: user?.full_name || '',
        phone: user?.phone || '',
        avatar_url: user?.avatar_url || '',
    });

    // Email change form
    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [emailForm, setEmailForm] = useState({
        new_email: '',
        password: '',
    });

    useEffect(() => {
        if (user) {
            syncWithInitial({
                full_name: user.full_name || '',
                phone: user.phone || '',
                avatar_url: user.avatar_url || '',
            });
        }
    }, [user, syncWithInitial]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateUser(values);
    };

    const handleEmailChange = (e: React.FormEvent) => {
        e.preventDefault();
        changeEmail(emailForm);
        setEmailDialogOpen(false);
        setEmailForm({ new_email: '', password: '' });
    };

    const roleInfo =
        USER_ROLES[user?.role as keyof typeof USER_ROLES] || USER_ROLES.STAFF;

    if (isLoading) {
        return <UserSettingsSkeleton />;
    }

    return (
        <div className="space-y-6">
            {/* Thông tin cá nhân */}
            <Card>
                <CardHeader>
                    <CardTitle>Thông tin cá nhân</CardTitle>
                    <CardDescription>Cập nhật thông tin tài khoản của bạn</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Avatar */}
                        <div className="flex items-center gap-6">
                            <AvatarSelector
                                value={values.avatar_url}
                                onChange={(url) => setValue('avatar_url', url)}
                                size="lg"
                            />
                            <div>
                                <p className="font-medium text-lg">{user?.full_name}</p>
                                <p className="text-sm text-muted-foreground">{user?.email}</p>
                                <Badge variant="outline" className="mt-2">
                                    {roleInfo?.label || user?.role}
                                </Badge>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Họ và tên *</Label>
                                <Input
                                    id="full_name"
                                    value={values.full_name}
                                    onChange={(e) => setValue('full_name', e.target.value)}
                                    placeholder="Nguyễn Văn A"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Số điện thoại</Label>
                                <Input
                                    id="phone"
                                    value={values.phone}
                                    onChange={(e) => setValue('phone', e.target.value)}
                                    placeholder="0901234567"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
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
                    </form>
                </CardContent>
            </Card>

            {/* Email */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Email
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                        {user?.email_verified ? (
                            <>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-green-600">Email đã xác thực</span>
                            </>
                        ) : (
                            <>
                                <AlertCircle className="h-4 w-4 text-yellow-500" />
                                <span className="text-yellow-600">Email chưa xác thực</span>
                            </>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <Input value={user?.email || ''} disabled className="max-w-sm" />
                        <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline">Đổi email</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Đổi địa chỉ email</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleEmailChange} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="new_email">Email mới</Label>
                                        <Input
                                            id="new_email"
                                            type="email"
                                            value={emailForm.new_email}
                                            onChange={(e) =>
                                                setEmailForm({ ...emailForm, new_email: e.target.value })
                                            }
                                            placeholder="email@example.com"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">Mật khẩu xác nhận</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={emailForm.password}
                                            onChange={(e) =>
                                                setEmailForm({ ...emailForm, password: e.target.value })
                                            }
                                            placeholder="Nhập mật khẩu hiện tại"
                                            required
                                        />
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isChangingEmail}>
                                        {isChangingEmail ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Đang xử lý...
                                            </>
                                        ) : (
                                            'Đổi email'
                                        )}
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function UserSettingsSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-72 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-5 w-20" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {[...Array(2)].map((_, i) => (
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
