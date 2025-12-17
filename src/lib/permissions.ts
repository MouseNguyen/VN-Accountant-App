// src/lib/permissions.ts
// Permission Definitions and Role Mappings - Phase 4 Task 11

// ==========================================
// PERMISSION CONSTANTS
// ==========================================

export const PERMISSIONS = {
    // AR - Accounts Receivable
    'ar:view': 'Xem hóa đơn bán',
    'ar:create': 'Tạo hóa đơn bán',
    'ar:edit': 'Sửa hóa đơn bán',
    'ar:post': 'Ghi sổ hóa đơn bán',
    'ar:void': 'Hủy hóa đơn bán',
    'ar:payment': 'Xử lý thanh toán AR',

    // AP - Accounts Payable
    'ap:view': 'Xem hóa đơn mua',
    'ap:create': 'Tạo hóa đơn mua',
    'ap:edit': 'Sửa hóa đơn mua',
    'ap:post': 'Ghi sổ hóa đơn mua',
    'ap:void': 'Hủy hóa đơn mua',
    'ap:payment': 'Xử lý thanh toán AP',

    // Stock / Inventory
    'stock:view': 'Xem tồn kho',
    'stock:adjust': 'Điều chỉnh tồn kho',
    'stock:count': 'Kiểm kê kho',

    // Products
    'products:view': 'Xem sản phẩm',
    'products:create': 'Tạo sản phẩm',
    'products:edit': 'Sửa sản phẩm',
    'products:delete': 'Xóa sản phẩm',

    // Partners (Customers/Vendors)
    'partners:view': 'Xem đối tác',
    'partners:create': 'Tạo đối tác',
    'partners:edit': 'Sửa đối tác',
    'partners:delete': 'Xóa đối tác',

    // Reports
    'reports:view': 'Xem báo cáo',
    'reports:export': 'Xuất báo cáo',
    'reports:financial': 'Xem báo cáo tài chính',

    // Tax
    'tax:view': 'Xem thuế',
    'tax:declare': 'Khai thuế',
    'tax:export': 'Xuất hồ sơ thuế',

    // Settings
    'settings:view': 'Xem cài đặt',
    'settings:edit': 'Sửa cài đặt',

    // Users
    'users:view': 'Xem người dùng',
    'users:manage': 'Quản lý người dùng',
    'users:roles': 'Phân quyền',

    // Audit
    'audit:view': 'Xem lịch sử',

    // Fixed Assets
    'assets:view': 'Xem tài sản cố định',
    'assets:create': 'Tạo tài sản',
    'assets:depreciate': 'Tính khấu hao',
    'assets:dispose': 'Thanh lý tài sản',
} as const;

export type Permission = keyof typeof PERMISSIONS;

// ==========================================
// ROLE PERMISSION MAPPINGS
// ==========================================

// Wildcard pattern matcher
function matchesWildcard(permission: string, pattern: string): boolean {
    if (pattern.endsWith(':*')) {
        const prefix = pattern.slice(0, -1); // Remove '*'
        return permission.startsWith(prefix);
    }
    return permission === pattern;
}

// Role definitions
const ROLE_PERMISSIONS: Record<string, string[]> = {
    // OWNER - Full access to everything
    OWNER: ['*'],

    // ACCOUNTANT - AR, AP, Reports, Tax, Stock, Products, Partners
    ACCOUNTANT: [
        'ar:*',
        'ap:*',
        'stock:*',
        'products:view',
        'products:edit',
        'partners:*',
        'reports:*',
        'tax:*',
        'settings:view',
        'assets:*',
        'audit:view',
    ],

    // STAFF - Limited view access
    STAFF: [
        'ar:view',
        'ap:view',
        'stock:view',
        'products:view',
        'partners:view',
        'reports:view',
    ],
};

// ==========================================
// PERMISSION CHECK FUNCTIONS
// ==========================================

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: string, permission: Permission): boolean {
    const rolePermissions = ROLE_PERMISSIONS[role];

    if (!rolePermissions) {
        console.warn(`Unknown role: ${role}`);
        return false;
    }

    // OWNER has all permissions
    if (rolePermissions.includes('*')) {
        return true;
    }

    // Check if any pattern matches
    return rolePermissions.some(pattern => matchesWildcard(permission, pattern));
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: string, permissions: Permission[]): boolean {
    return permissions.some(p => hasPermission(role, p));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: string, permissions: Permission[]): boolean {
    return permissions.every(p => hasPermission(role, p));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: string): Permission[] {
    const rolePermissions = ROLE_PERMISSIONS[role];

    if (!rolePermissions) return [];

    if (rolePermissions.includes('*')) {
        return Object.keys(PERMISSIONS) as Permission[];
    }

    return (Object.keys(PERMISSIONS) as Permission[]).filter(p =>
        rolePermissions.some(pattern => matchesWildcard(p, pattern))
    );
}

/**
 * Get human-readable description for a permission
 */
export function getPermissionLabel(permission: Permission): string {
    return PERMISSIONS[permission] || permission;
}

/**
 * Group permissions by module
 */
export function getPermissionsByModule(): Record<string, Permission[]> {
    const modules: Record<string, Permission[]> = {};

    for (const permission of Object.keys(PERMISSIONS) as Permission[]) {
        const [module] = permission.split(':');
        if (!modules[module]) {
            modules[module] = [];
        }
        modules[module].push(permission);
    }

    return modules;
}

// ==========================================
// EXPORTS
// ==========================================

export { ROLE_PERMISSIONS };
