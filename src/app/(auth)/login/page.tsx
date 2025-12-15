// src/app/(auth)/login/page.tsx
// Trang đăng nhập

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react';
import { loginSchema, LoginInput } from '@/lib/validations/auth';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function LoginPage() {
    const { login, isLoading } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    interface LoginFormData {
        email: string;
        password: string;
        remember_me?: boolean;
    }

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
            remember_me: false,
        },
    });

    const rememberMe = watch('remember_me');

    const onSubmit = async (data: LoginFormData) => {
        setError(null);

        const result = await login({
            email: data.email,
            password: data.password,
            remember_me: data.remember_me,
        });

        if (!result.success && result.error) {
            setError(result.error.message);
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900">Đăng nhập</h2>
                <p className="mt-1 text-sm text-gray-500">
                    Chào mừng bạn quay lại!
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
                {/* Email */}
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <Input
                            id="email"
                            type="email"
                            placeholder="email@example.com"
                            className="h-12 pl-10 text-base"
                            {...register('email')}
                        />
                    </div>
                    {errors.email && (
                        <p className="text-sm text-red-500">{errors.email.message}</p>
                    )}
                </div>

                {/* Password */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Mật khẩu</Label>
                        <Link
                            href="/forgot-password"
                            className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
                        >
                            Quên mật khẩu?
                        </Link>
                    </div>
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
                </div>

                {/* Remember me */}
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="remember_me"
                        checked={rememberMe}
                        onCheckedChange={(checked) =>
                            setValue('remember_me', checked as boolean)
                        }
                    />
                    <Label htmlFor="remember_me" className="text-sm font-normal">
                        Ghi nhớ đăng nhập
                    </Label>
                </div>

                {/* Submit button */}
                <Button
                    type="submit"
                    className="h-12 w-full bg-gradient-to-r from-emerald-600 to-green-600 text-base font-semibold hover:from-emerald-700 hover:to-green-700"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Đang đăng nhập...
                        </>
                    ) : (
                        'Đăng nhập'
                    )}
                </Button>
            </form>

            {/* Register link */}
            <p className="mt-6 text-center text-sm text-gray-600">
                Chưa có tài khoản?{' '}
                <Link
                    href="/register"
                    className="font-semibold text-emerald-600 hover:text-emerald-500"
                >
                    Đăng ký ngay
                </Link>
            </p>
        </div>
    );
}
