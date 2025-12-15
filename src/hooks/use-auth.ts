// src/hooks/use-auth.ts
// React hook cho authentication

'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, User, Farm } from '@/stores/auth-store';

// ==========================================
// TYPES
// ==========================================

interface LoginInput {
    email: string;
    password: string;
    remember_me?: boolean;
}

interface RegisterInput {
    email: string;
    password: string;
    confirm_password: string;
    full_name: string;
    farm_name: string;
    business_type: 'FARM' | 'RETAIL_FNB';
    phone?: string;
}

interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: Record<string, string[]>;
    };
}

// ==========================================
// HOOK
// ==========================================

export function useAuth() {
    const router = useRouter();
    const {
        user,
        farm,
        isAuthenticated,
        isLoading,
        isInitialized,
        setAuth,
        clearAuth,
        setLoading,
        setInitialized,
        updateUser,
    } = useAuthStore();

    // ==========================================
    // FETCH CURRENT USER ON MOUNT
    // ==========================================

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await fetch('/api/auth/me', {
                    credentials: 'include',
                });

                if (response.ok) {
                    const data: ApiResponse<{ user: User; farm: Farm }> =
                        await response.json();
                    if (data.success && data.data) {
                        setAuth(data.data.user, data.data.farm);
                    } else {
                        clearAuth();
                    }
                } else {
                    clearAuth();
                }
            } catch (error) {
                console.error('Failed to fetch user:', error);
                clearAuth();
            } finally {
                setInitialized(true);
            }
        };

        // Only fetch if not initialized
        if (!isInitialized) {
            fetchUser();
        }
    }, [isInitialized, setAuth, clearAuth, setInitialized]);

    // ==========================================
    // LOGIN
    // ==========================================

    const login = useCallback(
        async (input: LoginInput): Promise<ApiResponse> => {
            setLoading(true);

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(input),
                });

                const data: ApiResponse<{ user: User; farm: Farm }> =
                    await response.json();

                if (data.success && data.data) {
                    setAuth(data.data.user, data.data.farm);

                    // Redirect based on email verification status
                    if (data.data.user.email_verified) {
                        router.push('/dashboard');
                    } else {
                        router.push('/verify-email');
                    }
                }

                return data;
            } catch (error) {
                console.error('Login error:', error);
                return {
                    success: false,
                    error: {
                        code: 'NETWORK_ERROR',
                        message: 'Không thể kết nối đến server',
                    },
                };
            } finally {
                setLoading(false);
            }
        },
        [router, setAuth, setLoading]
    );

    // ==========================================
    // REGISTER
    // ==========================================

    const register = useCallback(
        async (input: RegisterInput): Promise<ApiResponse> => {
            setLoading(true);

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(input),
                });

                const data: ApiResponse<{ user: User; farm: Farm }> =
                    await response.json();

                if (data.success && data.data) {
                    setAuth(data.data.user, data.data.farm);
                    router.push('/verify-email');
                }

                return data;
            } catch (error) {
                console.error('Register error:', error);
                return {
                    success: false,
                    error: {
                        code: 'NETWORK_ERROR',
                        message: 'Không thể kết nối đến server',
                    },
                };
            } finally {
                setLoading(false);
            }
        },
        [router, setAuth, setLoading]
    );

    // ==========================================
    // LOGOUT
    // ==========================================

    const logout = useCallback(async (): Promise<void> => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            clearAuth();
            router.push('/login');
        }
    }, [router, clearAuth]);

    // ==========================================
    // VERIFY EMAIL
    // ==========================================

    const verifyEmail = useCallback(
        async (otp: string): Promise<ApiResponse> => {
            setLoading(true);

            try {
                const response = await fetch('/api/auth/verify-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ token: otp }),
                });

                const data: ApiResponse = await response.json();

                if (data.success) {
                    updateUser({ email_verified: true });
                    router.push('/dashboard');
                }

                return data;
            } catch (error) {
                console.error('Verify email error:', error);
                return {
                    success: false,
                    error: {
                        code: 'NETWORK_ERROR',
                        message: 'Không thể kết nối đến server',
                    },
                };
            } finally {
                setLoading(false);
            }
        },
        [router, updateUser, setLoading]
    );

    // ==========================================
    // RESEND VERIFICATION
    // ==========================================

    const resendVerification = useCallback(async (): Promise<ApiResponse> => {
        try {
            const response = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                credentials: 'include',
            });

            return await response.json();
        } catch (error) {
            console.error('Resend verification error:', error);
            return {
                success: false,
                error: {
                    code: 'NETWORK_ERROR',
                    message: 'Không thể kết nối đến server',
                },
            };
        }
    }, []);

    // ==========================================
    // FORGOT PASSWORD
    // ==========================================

    const forgotPassword = useCallback(
        async (email: string): Promise<ApiResponse> => {
            try {
                const response = await fetch('/api/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                });

                return await response.json();
            } catch (error) {
                console.error('Forgot password error:', error);
                return {
                    success: false,
                    error: {
                        code: 'NETWORK_ERROR',
                        message: 'Không thể kết nối đến server',
                    },
                };
            }
        },
        []
    );

    // ==========================================
    // RESET PASSWORD
    // ==========================================

    const resetPassword = useCallback(
        async (
            token: string,
            password: string,
            confirm_password: string
        ): Promise<ApiResponse> => {
            try {
                const response = await fetch('/api/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, password, confirm_password }),
                });

                const data: ApiResponse = await response.json();

                if (data.success) {
                    router.push('/login');
                }

                return data;
            } catch (error) {
                console.error('Reset password error:', error);
                return {
                    success: false,
                    error: {
                        code: 'NETWORK_ERROR',
                        message: 'Không thể kết nối đến server',
                    },
                };
            }
        },
        [router]
    );

    // ==========================================
    // RETURN
    // ==========================================

    return {
        // State
        user,
        farm,
        isAuthenticated,
        isLoading,
        isInitialized,

        // Computed
        needsEmailVerification: isAuthenticated && user && !user.email_verified,
        isFullyAuthenticated: isAuthenticated && user?.email_verified,

        // Actions
        login,
        register,
        logout,
        verifyEmail,
        resendVerification,
        forgotPassword,
        resetPassword,
    };
}
