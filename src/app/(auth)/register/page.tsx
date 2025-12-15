// src/app/(auth)/register/page.tsx
// Trang đăng ký - Multi-step form

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import {
    Eye,
    EyeOff,
    Loader2,
    Mail,
    Lock,
    User,
    Building2,
    ArrowLeft,
    ArrowRight,
    Check,
    Tractor,
    Coffee,
} from 'lucide-react';
import { registerSchema, RegisterInput } from '@/lib/validations/auth';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type BusinessType = 'FARM' | 'RETAIL_FNB';

const STEPS = [
    { id: 1, title: 'Tài khoản' },
    { id: 2, title: 'Thông tin' },
    { id: 3, title: 'Loại hình' },
];

export default function RegisterPage() {
    const { register: registerUser, isLoading } = useAuth();
    const [step, setStep] = useState(1);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedBusinessType, setSelectedBusinessType] =
        useState<BusinessType | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
        trigger,
        getValues,
        setValue,
    } = useForm<RegisterInput>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            email: '',
            password: '',
            confirm_password: '',
            full_name: '',
            farm_name: '',
            business_type: undefined,
            phone: '',
        },
    });

    // Validate current step before proceeding
    const validateStep = async () => {
        if (step === 1) {
            return await trigger(['email', 'password', 'confirm_password']);
        }
        if (step === 2) {
            return await trigger(['full_name', 'farm_name']);
        }
        return true;
    };

    const handleNext = async () => {
        const isValid = await validateStep();
        if (isValid) {
            setStep(step + 1);
        }
    };

    const handleBack = () => {
        setStep(step - 1);
    };

    const handleBusinessTypeSelect = (type: BusinessType) => {
        setSelectedBusinessType(type);
        setValue('business_type', type);
    };

    const onSubmit = async (data: RegisterInput) => {
        if (!selectedBusinessType) {
            setError('Vui lòng chọn loại hình kinh doanh');
            return;
        }

        setError(null);

        const result = await registerUser({
            ...data,
            business_type: selectedBusinessType,
        });

        if (!result.success && result.error) {
            setError(result.error.message);
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900">Đăng ký tài khoản</h2>
                <p className="mt-1 text-sm text-gray-500">
                    Bắt đầu quản lý tài chính hiệu quả
                </p>
            </div>

            {/* Progress Steps */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    {STEPS.map((s, index) => (
                        <div key={s.id} className="flex items-center">
                            <div
                                className={cn(
                                    'flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all',
                                    step > s.id
                                        ? 'bg-green-500 text-white'
                                        : step === s.id
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-gray-200 text-gray-500'
                                )}
                            >
                                {step > s.id ? <Check className="h-5 w-5" /> : s.id}
                            </div>
                            {index < STEPS.length - 1 && (
                                <div
                                    className={cn(
                                        'mx-2 h-1 w-12 rounded-full sm:w-16',
                                        step > s.id ? 'bg-green-500' : 'bg-gray-200'
                                    )}
                                />
                            )}
                        </div>
                    ))}
                </div>
                <div className="mt-2 flex justify-between px-1">
                    {STEPS.map((s) => (
                        <span
                            key={s.id}
                            className={cn(
                                'text-xs',
                                step >= s.id ? 'text-gray-700' : 'text-gray-400'
                            )}
                        >
                            {s.title}
                        </span>
                    ))}
                </div>
            </div>

            {/* Error message */}
            {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)}>
                {/* Step 1: Account */}
                {step === 1 && (
                    <div className="space-y-5">
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

                        <div className="space-y-2">
                            <Label htmlFor="password">Mật khẩu</Label>
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
                            type="button"
                            className="h-12 w-full bg-gradient-to-r from-emerald-600 to-green-600 text-base font-semibold hover:from-emerald-700 hover:to-green-700"
                            onClick={handleNext}
                        >
                            Tiếp tục
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </div>
                )}

                {/* Step 2: Info */}
                {step === 2 && (
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="full_name">Họ và tên</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                                <Input
                                    id="full_name"
                                    type="text"
                                    placeholder="Nguyễn Văn A"
                                    className="h-12 pl-10 text-base"
                                    {...register('full_name')}
                                />
                            </div>
                            {errors.full_name && (
                                <p className="text-sm text-red-500">{errors.full_name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="farm_name">Tên nông trại / doanh nghiệp</Label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                                <Input
                                    id="farm_name"
                                    type="text"
                                    placeholder="Nông trại ABC"
                                    className="h-12 pl-10 text-base"
                                    {...register('farm_name')}
                                />
                            </div>
                            {errors.farm_name && (
                                <p className="text-sm text-red-500">{errors.farm_name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Số điện thoại (tùy chọn)</Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="0912 345 678"
                                className="h-12 text-base"
                                {...register('phone')}
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-12 flex-1"
                                onClick={handleBack}
                            >
                                <ArrowLeft className="mr-2 h-5 w-5" />
                                Quay lại
                            </Button>
                            <Button
                                type="button"
                                className="h-12 flex-1 bg-gradient-to-r from-emerald-600 to-green-600 font-semibold hover:from-emerald-700 hover:to-green-700"
                                onClick={handleNext}
                            >
                                Tiếp tục
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 3: Business Type */}
                {step === 3 && (
                    <div className="space-y-5">
                        <p className="text-center text-sm text-gray-600">
                            Chọn loại hình kinh doanh của bạn
                        </p>

                        <div className="grid gap-4">
                            {/* Farm Option */}
                            <button
                                type="button"
                                className={cn(
                                    'flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-all',
                                    selectedBusinessType === 'FARM'
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                )}
                                onClick={() => handleBusinessTypeSelect('FARM')}
                            >
                                <div
                                    className={cn(
                                        'flex h-14 w-14 items-center justify-center rounded-full',
                                        selectedBusinessType === 'FARM'
                                            ? 'bg-green-500 text-white'
                                            : 'bg-green-100 text-green-600'
                                    )}
                                >
                                    <Tractor className="h-7 w-7" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">🌾 Nông trại</h3>
                                    <p className="text-sm text-gray-500">
                                        Trồng trọt, chăn nuôi, trang trại
                                    </p>
                                </div>
                                {selectedBusinessType === 'FARM' && (
                                    <Check className="h-6 w-6 text-green-500" />
                                )}
                            </button>

                            {/* F&B Option */}
                            <button
                                type="button"
                                className={cn(
                                    'flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-all',
                                    selectedBusinessType === 'RETAIL_FNB'
                                        ? 'border-orange-500 bg-orange-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                )}
                                onClick={() => handleBusinessTypeSelect('RETAIL_FNB')}
                            >
                                <div
                                    className={cn(
                                        'flex h-14 w-14 items-center justify-center rounded-full',
                                        selectedBusinessType === 'RETAIL_FNB'
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-orange-100 text-orange-600'
                                    )}
                                >
                                    <Coffee className="h-7 w-7" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">☕ Cafe / Bán lẻ</h3>
                                    <p className="text-sm text-gray-500">
                                        Quán cafe, nhà hàng, cửa hàng
                                    </p>
                                </div>
                                {selectedBusinessType === 'RETAIL_FNB' && (
                                    <Check className="h-6 w-6 text-orange-500" />
                                )}
                            </button>
                        </div>

                        {errors.business_type && (
                            <p className="text-center text-sm text-red-500">
                                {errors.business_type.message}
                            </p>
                        )}

                        <div className="flex gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-12 flex-1"
                                onClick={handleBack}
                            >
                                <ArrowLeft className="mr-2 h-5 w-5" />
                                Quay lại
                            </Button>
                            <Button
                                type="submit"
                                className="h-12 flex-1 bg-gradient-to-r from-emerald-600 to-green-600 font-semibold hover:from-emerald-700 hover:to-green-700"
                                disabled={isLoading || !selectedBusinessType}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Đang đăng ký...
                                    </>
                                ) : (
                                    'Hoàn tất đăng ký'
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </form>

            {/* Login link */}
            <p className="mt-6 text-center text-sm text-gray-600">
                Đã có tài khoản?{' '}
                <Link
                    href="/login"
                    className="font-semibold text-emerald-600 hover:text-emerald-500"
                >
                    Đăng nhập
                </Link>
            </p>
        </div>
    );
}
