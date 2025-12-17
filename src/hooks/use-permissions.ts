// src/hooks/use-permissions.ts
// Permission Hooks for UI - Phase 4 Task 11

'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getRolePermissions,
    Permission
} from '@/lib/permissions';

// ==========================================
// TYPES
// ==========================================

interface CurrentUser {
    id: string;
    email: string;
    role: string;
    farm_id: string;
}

// ==========================================
// FETCH CURRENT USER
// ==========================================

async function fetchCurrentUser(): Promise<CurrentUser | null> {
    try {
        const response = await fetch('/api/auth/me', {
            credentials: 'include',
        });

        if (!response.ok) return null;

        const data = await response.json();
        return data.success ? data.data : null;
    } catch {
        return null;
    }
}

// ==========================================
// HOOKS
// ==========================================

/**
 * Hook to get current user with role
 */
export function useCurrentUser() {
    return useQuery({
        queryKey: ['currentUser'],
        queryFn: fetchCurrentUser,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: false,
    });
}

/**
 * Hook to check if current user has a specific permission
 */
export function usePermission(permission: Permission): boolean {
    const { data: user } = useCurrentUser();

    return useMemo(() => {
        if (!user) return false;
        return hasPermission(user.role, permission);
    }, [user, permission]);
}

/**
 * Hook to check if current user has any of the specified permissions
 */
export function useAnyPermission(permissions: Permission[]): boolean {
    const { data: user } = useCurrentUser();

    return useMemo(() => {
        if (!user) return false;
        return hasAnyPermission(user.role, permissions);
    }, [user, permissions]);
}

/**
 * Hook to check if current user has all of the specified permissions
 */
export function useAllPermissions(permissions: Permission[]): boolean {
    const { data: user } = useCurrentUser();

    return useMemo(() => {
        if (!user) return false;
        return hasAllPermissions(user.role, permissions);
    }, [user, permissions]);
}

/**
 * Hook to get all permissions for current user
 */
export function useUserPermissions(): Permission[] {
    const { data: user } = useCurrentUser();

    return useMemo(() => {
        if (!user) return [];
        return getRolePermissions(user.role);
    }, [user]);
}

/**
 * Hook to check if current user is owner
 */
export function useIsOwner(): boolean {
    const { data: user } = useCurrentUser();
    return user?.role === 'OWNER';
}

/**
 * Hook to get current user's role
 */
export function useUserRole(): string | null {
    const { data: user } = useCurrentUser();
    return user?.role ?? null;
}
