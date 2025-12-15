// src/app/(auth)/layout.tsx
// Layout cho các trang authentication

import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'LABA ERP - Đăng nhập',
    description: 'Quản lý tài chính đơn giản cho nông trại và F&B',
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-100">
            {/* Background decoration */}
            <div className="fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-emerald-200 to-green-200 opacity-50 blur-3xl" />
                <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-green-200 to-teal-200 opacity-50 blur-3xl" />
            </div>

            {/* Content */}
            <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
                {/* Logo */}
                <div className="mb-8 text-center">
                    <div className="mb-2 text-4xl">🌾</div>
                    <h1 className="text-2xl font-bold text-gray-900">LABA ERP</h1>
                    <p className="text-sm text-gray-500">Quản lý tài chính đơn giản</p>
                </div>

                {/* Card */}
                <div className="w-full max-w-md">
                    <div className="rounded-2xl bg-white/80 p-8 shadow-xl backdrop-blur-sm">
                        {children}
                    </div>
                </div>

                {/* Footer */}
                <p className="mt-8 text-center text-xs text-gray-500">
                    © 2024 LABA ERP. Bản quyền thuộc về LABA Platform.
                </p>
            </div>
        </div>
    );
}
