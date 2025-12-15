// src/app/(auth)/forgot-password/page.tsx
// Trang quên mật khẩu

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { forgotPasswordSchema, ForgotPasswordInput } from '@/lib/validations/auth';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
    const { forgotPassword } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submittedEmail, setSubmittedEmail] = useState('');

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordInput>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = async (data: ForgotPasswordInput) => {
        setIsLoading(true);
        setError(null);

        const result = await forgotPassword(data.email);

        if (result.success) {
            setSubmittedEmail(data.email);
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
                <h2 className="text-2xl font-bold text-gray-900">Kiểm tra email</h2>
                <p className="mt-4 text-gray-500">
                    Nếu email <span className="font-medium text-gray-900">{submittedEmail}</span> tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu.
                </p>
                <p className="mt-2 text-sm text-gray-400">
                    Link sẽ hết hạn sau 15 phút.
                </p>

                <div className="mt-8 space-y-3">
                    <Button
                        asChild
                        variant="outline"
                        className="h-12 w-full"
                    >
                        <Link href="/login">
                            <ArrowLeft className="mr-2 h-5 w-5" />
                            Quay lại đăng nhập
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-6 text-center">
                <div className="mb-4 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                        <Mail className="h-10 w-10 text-emerald-600" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Quên mật khẩu?</h2>
                <p className="mt-2 text-sm text-gray-500">
                    Nhập email đăng ký để nhận link đặt lại mật khẩu
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

                <Button
                    type="submit"
                    className="h-12 w-full bg-gradient-to-r from-emerald-600 to-green-600 text-base font-semibold hover:from-emerald-700 hover:to-green-700"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Đang gửi...
                        </>
                    ) : (
                        'Gửi link đặt lại'
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
