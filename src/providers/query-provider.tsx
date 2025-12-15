// src/providers/query-provider.tsx
// React Query Provider for client-side data fetching

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                // Data được coi là fresh trong 1 phút
                staleTime: 60 * 1000,
                // Retry 1 lần nếu lỗi mạng
                retry: 1,
                // Refetch khi window focus (tốt cho real-time)
                refetchOnWindowFocus: false,
            },
            mutations: {
                // Retry 0 lần cho mutations
                retry: 0,
            },
        },
    });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
    if (typeof window === 'undefined') {
        // Server: always make a new query client
        return makeQueryClient();
    } else {
        // Browser: make a new query client if we don't already have one
        if (!browserQueryClient) browserQueryClient = makeQueryClient();
        return browserQueryClient;
    }
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
    // NOTE: Avoid useState when initializing the query client if you don't
    // have a suspense boundary between this and the code that may suspend
    // because React will throw away the client on the initial render if it
    // suspends and there is no boundary
    const queryClient = getQueryClient();

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {process.env.NODE_ENV === 'development' && (
                <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
            )}
        </QueryClientProvider>
    );
}
