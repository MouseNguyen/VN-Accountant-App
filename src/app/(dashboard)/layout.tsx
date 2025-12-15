// src/app/(dashboard)/layout.tsx
// Layout cho các trang authenticated

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { BottomNav } from '@/components/shared/bottom-nav';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { isAuthenticated, isLoading, isInitialized, user } = useAuth();

    useEffect(() => {
        if (isInitialized && !isAuthenticated) {
            router.push('/login');
        } else if (isInitialized && isAuthenticated && !user?.email_verified) {
            router.push('/verify-email');
        }
    }, [isInitialized, isAuthenticated, user, router]);

    // Show loading while checking auth
    if (isLoading || !isInitialized) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    <p className="mt-2 text-sm text-muted-foreground">Đang tải...</p>
                </div>
            </div>
        );
    }

    // Don't render if not authenticated
    if (!isAuthenticated || !user?.email_verified) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background">
            {children}
            <BottomNav />
        </div>
    );
}
