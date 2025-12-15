// src/providers/index.tsx
// Combined providers - wrap this around your app

'use client';

import { QueryProvider } from './query-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/sonner';

interface ProvidersProps {
    children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
        >
            <QueryProvider>
                {children}
                <Toaster
                    position="top-right"
                    richColors
                    closeButton
                    toastOptions={{
                        duration: 4000,
                    }}
                />
            </QueryProvider>
        </ThemeProvider>
    );
}

