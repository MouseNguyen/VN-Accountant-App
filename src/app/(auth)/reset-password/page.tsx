// src/app/(auth)/reset-password/page.tsx
// Trang đặt lại mật khẩu

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import {
    Loader2,
    Lock,
    Eye,
    EyeOff,
    CheckCircle,
    AlertCircle,
    ArrowLeft,
} from 'lucide-react';
import { resetPasswordSchema, ResetPasswordInput } from '@/lib/validations/auth';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const { resetPassword } = useAuth();

    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordInput>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            token: token || '',
        },
    });

    // Check if token exists
    if (!token) {
        return (
            <div className="text-center">
                <div className="mb-4 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                        <AlertCircle className="h-10 w-10 text-red-600" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Link không hợp lệ</h2>
                <p className="mt-4 text-gray-500">
                    Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
                </p>
                <Button asChild className="mt-6 h-12 w-full" variant="outline">
                    <Link href="/forgot-password">
                        Yêu cầu link mới
                    </Link>
                </Button>
            </div>
        );
    }

    const onSubmit = async (data: ResetPasswordInput) => {
        setIsLoading(true);
        setError(null);

        const result = await resetPassword(
            token,
            data.password,
            data.confirm_password
        );

        if (result.success) {
            setIsSuccess(true);
        } else if (result.error) {
            setError(result.error.message);
        }

        setIsLoading(false);
    };

    if (isSuccess) {
        return (
            <div className="text-center">
                <div className="mb-4 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Đổi mật khẩu thành công!</h2>
                <p className="mt-4 text-gray-500">
                    Mật khẩu của bạn đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới.
                </p>
                <Button
                    asChild
                    className="mt-6 h-12 w-full bg-gradient-to-r from-emerald-600 to-green-600 font-semibold hover:from-emerald-700 hover:to-green-700"
                >
                    <Link href="/login">Đăng nhập ngay</Link>
                </Button>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-6 text-center">
                <div className="mb-4 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                        <Lock className="h-10 w-10 text-emerald-600" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Đặt mật khẩu mới</h2>
                <p className="mt-2 text-sm text-gray-500">
                    Nhập mật khẩu mới cho tài khoản của bạn
                </p>
            </div>

            {/* Error message */}
            {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <input type="hidden" {...register('token')} />

                <div className="space-y-2">
                    <Label htmlFor="password">Mật khẩu mới</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            className="h-12 pl-10 pr-10 text-base"
                            {...register('password')}
                        />
                        <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? (
                                <EyeOff className="h-5 w-5" />
                            ) : (
                                <Eye className="h-5 w-5" />
                            )}
                        </button>
                    </div>
                    {errors.password && (
                        <p className="text-sm text-red-500">{errors.password.message}</p>
                    )}
                    <p className="text-xs text-gray-500">
                        Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirm_password">Xác nhận mật khẩu</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <Input
                            id="confirm_password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            className="h-12 pl-10 pr-10 text-base"
                            {...register('confirm_password')}
                        />
                        <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                            {showConfirmPassword ? (
                                <EyeOff className="h-5 w-5" />
                            ) : (
                                <Eye className="h-5 w-5" />
                            )}
                        </button>
                    </div>
                    {errors.confirm_password && (
                        <p className="text-sm text-red-500">
                            {errors.confirm_password.message}
                        </p>
                    )}
                </div>

                <Button
                    type="submit"
                    className="h-12 w-full bg-gradient-to-r from-emerald-600 to-green-600 text-base font-semibold hover:from-emerald-700 hover:to-green-700"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Đang cập nhật...
                        </>
                    ) : (
                        'Đặt mật khẩu mới'
                    )}
                </Button>
            </form>

            {/* Back to login */}
            <p className="mt-6 text-center">
                <Link
                    href="/login"
                    className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Quay lại đăng nhập
                </Link>
            </p>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense
            fallback={
                <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
            }
        >
            <ResetPasswordForm />
        </Suspense>
    );
}
