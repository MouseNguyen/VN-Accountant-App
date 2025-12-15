// src/app/(auth)/verify-email/page.tsx
// Trang xác thực email với OTP

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, RefreshCw, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

export default function VerifyEmailPage() {
    const router = useRouter();
    const { user, verifyEmail, resendVerification, isLoading, isAuthenticated } =
        useAuth();
    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [isResending, setIsResending] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Redirect if not authenticated or already verified
    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
        } else if (user?.email_verified) {
            router.push('/dashboard');
        }
    }, [isAuthenticated, user, router]);

    // Countdown timer for resend
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    // Focus first input on mount
    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // Only allow digits

        const newOtp = [...otp];
        newOtp[index] = value.slice(-1); // Only take last digit
        setOtp(newOtp);
        setError(null);

        // Auto-focus next input
        if (value && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all digits entered
        if (newOtp.every((digit) => digit !== '') && index === OTP_LENGTH - 1) {
            handleSubmit(newOtp.join(''));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, OTP_LENGTH);
        if (!/^\d+$/.test(pastedData)) return;

        const newOtp = [...otp];
        pastedData.split('').forEach((digit, index) => {
            if (index < OTP_LENGTH) {
                newOtp[index] = digit;
            }
        });
        setOtp(newOtp);

        // Focus last filled input
        const lastIndex = Math.min(pastedData.length - 1, OTP_LENGTH - 1);
        inputRefs.current[lastIndex]?.focus();

        // Auto-submit if complete
        if (newOtp.every((digit) => digit !== '')) {
            handleSubmit(newOtp.join(''));
        }
    };

    const handleSubmit = async (code: string) => {
        setError(null);

        const result = await verifyEmail(code);

        if (result.success) {
            setSuccess(true);
        } else if (result.error) {
            setError(result.error.message);
            // Clear OTP on error
            setOtp(Array(OTP_LENGTH).fill(''));
            inputRefs.current[0]?.focus();
        }
    };

    const handleResend = async () => {
        setIsResending(true);
        setError(null);

        const result = await resendVerification();

        if (result.success) {
            setResendCooldown(RESEND_COOLDOWN);
        } else if (result.error) {
            setError(result.error.message);
        }

        setIsResending(false);
    };

    if (success) {
        return (
            <div className="text-center">
                <div className="mb-4 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Xác thực thành công!</h2>
                <p className="mt-2 text-gray-500">
                    Đang chuyển đến trang chủ...
                </p>
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
                <h2 className="text-2xl font-bold text-gray-900">Xác thực email</h2>
                <p className="mt-2 text-sm text-gray-500">
                    Chúng tôi đã gửi mã 6 số đến
                </p>
                <p className="font-medium text-gray-900">{user?.email}</p>
            </div>

            {/* Error message */}
            {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* OTP Input */}
            <div className="mb-6">
                <div className="flex justify-center gap-2 sm:gap-3">
                    {otp.map((digit, index) => (
                        <input
                            key={index}
                            ref={(el) => {
                                inputRefs.current[index] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            onPaste={handlePaste}
                            className={cn(
                                'h-14 w-12 rounded-xl border-2 text-center text-2xl font-bold transition-all',
                                'focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200',
                                digit ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200',
                                error && 'border-red-300 bg-red-50'
                            )}
                            disabled={isLoading}
                        />
                    ))}
                </div>
            </div>

            {/* Submit button */}
            <Button
                className="h-12 w-full bg-gradient-to-r from-emerald-600 to-green-600 text-base font-semibold hover:from-emerald-700 hover:to-green-700"
                onClick={() => handleSubmit(otp.join(''))}
                disabled={isLoading || otp.some((d) => !d)}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Đang xác thực...
                    </>
                ) : (
                    'Xác thực'
                )}
            </Button>

            {/* Resend */}
            <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">Không nhận được mã?</p>
                {resendCooldown > 0 ? (
                    <p className="mt-1 text-sm font-medium text-gray-400">
                        Gửi lại sau {resendCooldown} giây
                    </p>
                ) : (
                    <button
                        type="button"
                        className="mt-1 inline-flex items-center text-sm font-semibold text-emerald-600 hover:text-emerald-500 disabled:opacity-50"
                        onClick={handleResend}
                        disabled={isResending}
                    >
                        {isResending ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-1 h-4 w-4" />
                        )}
                        Gửi lại mã
                    </button>
                )}
            </div>
        </div>
    );
}
