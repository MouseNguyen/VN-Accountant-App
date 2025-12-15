// src/app/(dashboard)/cai-dat/components/security-settings.tsx
// Security settings - change password + links to security features

'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import { toast } from 'sonner';
import { Loader2, Lock, Eye, EyeOff, ChevronRight, FileText, Smartphone, Shield } from 'lucide-react';

export function SecuritySettings() {
    const [isLoading, setIsLoading] = useState(false);
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });
    const [form, setForm] = useState({
        current_password: '',
        new_password: '',
        confirm_password: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (form.new_password !== form.confirm_password) {
            toast.error('Mật khẩu xác nhận không khớp');
            return;
        }

        if (form.new_password.length < 8) {
            toast.error('Mật khẩu mới phải có ít nhất 8 ký tự');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(form),
            });
            const data = await res.json();

            if (data.success) {
                toast.success('Đổi mật khẩu thành công!');
                setForm({ current_password: '', new_password: '', confirm_password: '' });
            } else {
                toast.error(data.error?.message || 'Có lỗi xảy ra');
            }
        } catch {
            toast.error('Có lỗi xảy ra');
        } finally {
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
        setShowPasswords((prev) => ({
            ...prev,
            [field]: !prev[field],
        }));
    };

    return (
        <div className="space-y-6">
            {/* Security Features Links */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Bảo mật & Kiểm soát
                    </CardTitle>
                    <CardDescription>
                        Quản lý phiên đăng nhập, nhật ký hoạt động và khóa sổ
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Link
                        href="/cai-dat/phien-dang-nhap"
                        className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-blue-500/10">
                                <Smartphone className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <div className="font-medium">Phiên đăng nhập</div>
                                <div className="text-sm text-muted-foreground">
                                    Quản lý các thiết bị đã đăng nhập
                                </div>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Link>

                    <Link
                        href="/cai-dat/nhat-ky"
                        className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-purple-500/10">
                                <FileText className="h-5 w-5 text-purple-500" />
                            </div>
                            <div>
                                <div className="font-medium">Nhật ký hoạt động</div>
                                <div className="text-sm text-muted-foreground">
                                    Xem lịch sử thao tác trong hệ thống
                                </div>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Link>

                    <Link
                        href="/cai-dat/khoa-so"
                        className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-amber-500/10">
                                <Lock className="h-5 w-5 text-amber-500" />
                            </div>
                            <div>
                                <div className="font-medium">Khóa sổ kế toán</div>
                                <div className="text-sm text-muted-foreground">
                                    Khóa sổ theo kỳ để ngăn chỉnh sửa
                                </div>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Link>
                </CardContent>
            </Card>

            {/* Change Password Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        Đổi mật khẩu
                    </CardTitle>
                    <CardDescription>
                        Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
                        <div className="space-y-2">
                            <Label htmlFor="current_password">Mật khẩu hiện tại</Label>
                            <div className="relative">
                                <Input
                                    id="current_password"
                                    type={showPasswords.current ? 'text' : 'password'}
                                    value={form.current_password}
                                    onChange={(e) =>
                                        setForm({ ...form, current_password: e.target.value })
                                    }
                                    className="pr-10"
                                    required
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                                    onClick={() => togglePasswordVisibility('current')}
                                >
                                    {showPasswords.current ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="new_password">Mật khẩu mới</Label>
                            <div className="relative">
                                <Input
                                    id="new_password"
                                    type={showPasswords.new ? 'text' : 'password'}
                                    value={form.new_password}
                                    onChange={(e) =>
                                        setForm({ ...form, new_password: e.target.value })
                                    }
                                    className="pr-10"
                                    required
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                                    onClick={() => togglePasswordVisibility('new')}
                                >
                                    {showPasswords.new ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirm_password">Xác nhận mật khẩu mới</Label>
                            <div className="relative">
                                <Input
                                    id="confirm_password"
                                    type={showPasswords.confirm ? 'text' : 'password'}
                                    value={form.confirm_password}
                                    onChange={(e) =>
                                        setForm({ ...form, confirm_password: e.target.value })
                                    }
                                    className="pr-10"
                                    required
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                                    onClick={() => togglePasswordVisibility('confirm')}
                                >
                                    {showPasswords.confirm ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <Button type="submit" disabled={isLoading} className="mt-2">
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Đang xử lý...
                                </>
                            ) : (
                                'Đổi mật khẩu'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
