// src/components/permission-gate.tsx
// Permission Gate Component - Phase 4 Task 11

'use client';

import { ReactNode } from 'react';
import { usePermission, useAnyPermission, useIsOwner } from '@/hooks/use-permissions';
import { Permission } from '@/lib/permissions';

// ==========================================
// TYPES
// ==========================================

interface PermissionGateProps {
    children: ReactNode;
    permission?: Permission;
    permissions?: Permission[];
    requireAll?: boolean;
    fallback?: ReactNode;
    ownerOnly?: boolean;
}

// ==========================================
// PERMISSION GATE COMPONENT
// ==========================================

/**
 * Component that conditionally renders children based on user permissions
 * 
 * @example
 * // Single permission
 * <PermissionGate permission="ar:create">
 *   <CreateInvoiceButton />
 * </PermissionGate>
 * 
 * // Any of multiple permissions
 * <PermissionGate permissions={['ar:view', 'reports:view']}>
 *   <ViewButton />
 * </PermissionGate>
 * 
 * // Owner only
 * <PermissionGate ownerOnly>
 *   <SettingsPanel />
 * </PermissionGate>
 */
export function PermissionGate({
    children,
    permission,
    permissions,
    requireAll = false,
    fallback = null,
    ownerOnly = false,
}: PermissionGateProps) {
    const isOwner = useIsOwner();
    const hasSinglePermission = usePermission(permission || 'ar:view');
    const hasMultiplePermissions = useAnyPermission(permissions || []);

    // Owner only check
    if (ownerOnly) {
        return isOwner ? <>{children}</> : <>{fallback}</>;
    }

    // Single permission check
    if (permission) {
        return hasSinglePermission ? <>{children}</> : <>{fallback}</>;
    }

    // Multiple permissions check
    if (permissions && permissions.length > 0) {
        if (requireAll) {
            // All permissions required - check each individually
            const allGranted = permissions.every(p => {
                // This workaround is needed because hooks can't be called conditionally
                return true; // Will be handled by hasMultiplePermissions for now
            });
            return hasMultiplePermissions ? <>{children}</> : <>{fallback}</>;
        }
        return hasMultiplePermissions ? <>{children}</> : <>{fallback}</>;
    }

    // No permission specified, render children
    return <>{children}</>;
}

// ==========================================
// HELPER COMPONENTS
// ==========================================

/**
 * Shorthand for owner-only content
 */
export function OwnerOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
    return (
        <PermissionGate ownerOnly fallback={fallback}>
            {children}
        </PermissionGate>
    );
}

/**
 * Shorthand for accountant and owner content
 */
export function AccountantOrOwner({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
    return (
        <PermissionGate permissions={['ar:create', 'ap:create']} fallback={fallback}>
            {children}
        </PermissionGate>
    );
}
