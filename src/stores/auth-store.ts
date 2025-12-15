// src/stores/auth-store.ts
// Zustand store cho authentication state

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ==========================================
// TYPES
// ==========================================

export interface User {
    id: string;
    email: string;
    full_name: string;
    email_verified: boolean;
    role: string;
    avatar_url?: string | null;
    phone?: string | null;
}

export interface Farm {
    id: string;
    name: string;
    business_type: 'FARM' | 'RETAIL_FNB';
    owner_name?: string;
}

interface AuthState {
    // State
    user: User | null;
    farm: Farm | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isInitialized: boolean;

    // Actions
    setAuth: (user: User, farm: Farm) => void;
    clearAuth: () => void;
    setLoading: (loading: boolean) => void;
    setInitialized: (initialized: boolean) => void;
    updateUser: (data: Partial<User>) => void;
    updateFarm: (data: Partial<Farm>) => void;
}

// ==========================================
// STORE
// ==========================================

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            // Initial state
            user: null,
            farm: null,
            isAuthenticated: false,
            isLoading: true,
            isInitialized: false,

            // Set auth state after login/register
            setAuth: (user, farm) =>
                set({
                    user,
                    farm,
                    isAuthenticated: true,
                    isLoading: false,
                    isInitialized: true,
                }),

            // Clear auth state on logout
            clearAuth: () =>
                set({
                    user: null,
                    farm: null,
                    isAuthenticated: false,
                    isLoading: false,
                    isInitialized: true,
                }),

            // Set loading state
            setLoading: (isLoading) => set({ isLoading }),

            // Set initialized state
            setInitialized: (isInitialized) => set({ isInitialized, isLoading: false }),

            // Update user partially
            updateUser: (data) =>
                set((state) => ({
                    user: state.user ? { ...state.user, ...data } : null,
                })),

            // Update farm partially
            updateFarm: (data) =>
                set((state) => ({
                    farm: state.farm ? { ...state.farm, ...data } : null,
                })),
        }),
        {
            name: 'laba-auth-storage',
            storage: createJSONStorage(() => localStorage),
            // Only persist user and farm data, not loading states
            partialize: (state) => ({
                user: state.user,
                farm: state.farm,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);

// ==========================================
// SELECTORS
// ==========================================

/**
 * Check if user needs to verify email
 */
export const selectNeedsEmailVerification = (state: AuthState) =>
    state.isAuthenticated && state.user && !state.user.email_verified;

/**
 * Check if user is fully authenticated (including email verified)
 */
export const selectIsFullyAuthenticated = (state: AuthState) =>
    state.isAuthenticated && state.user?.email_verified;

/**
 * Get user display name
 */
export const selectDisplayName = (state: AuthState) =>
    state.user?.full_name || state.user?.email || 'Người dùng';

/**
 * Get user initials for avatar
 */
export const selectUserInitials = (state: AuthState) => {
    if (!state.user?.full_name) return 'U';
    const names = state.user.full_name.split(' ');
    if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return state.user.full_name.substring(0, 2).toUpperCase();
};
