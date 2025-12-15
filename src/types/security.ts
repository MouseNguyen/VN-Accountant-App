// src/types/security.ts
// Security & Audit types for Task 10

// ==========================================
// SESSION
// ==========================================

export interface UserSession {
    id: string;
    user_id: string;

    // Token info
    refresh_token_hash?: string;

    // Device info
    device_type: 'WEB' | 'MOBILE' | 'API';
    device_name?: string;
    ip_address?: string;
    user_agent?: string;

    // Status
    is_active: boolean;

    // Timestamps
    created_at: string;
    last_active_at: string;
    expires_at: string;
}

export interface SessionListResponse {
    sessions: UserSession[];
    current_session_id: string;
}

// ==========================================
// FAILED LOGIN
// ==========================================

export type FailureReason =
    | 'WRONG_PASSWORD'
    | 'USER_NOT_FOUND'
    | 'ACCOUNT_LOCKED'
    | 'ACCOUNT_INACTIVE'
    | 'EMAIL_NOT_VERIFIED';

export interface FailedLoginAttempt {
    id: string;
    login_identifier: string;  // Email hoặc phone
    ip_address: string;
    user_agent?: string;
    failure_reason: FailureReason;
    attempted_at: string;
}

export interface LoginLockStatus {
    login_identifier: string;
    is_locked: boolean;
    lock_until?: string;
    failed_attempts: number;
    last_attempt_at?: string;
    remaining_attempts: number;
}

// ==========================================
// AUDIT LOG
// ==========================================

export type AuditAction =
    | 'LOGIN'
    | 'LOGOUT'
    | 'PASSWORD_CHANGE'
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'RESTORE'
    | 'EXPORT'
    | 'IMPORT'
    | 'PERIOD_LOCK'
    | 'PERIOD_UNLOCK'
    | 'VAT_SUBMIT';

export interface AuditLog {
    id: string;
    farm_id: string;
    user_id: string;
    user_name?: string;

    action: AuditAction;
    entity_type: string;
    entity_id?: string;
    entity_name?: string;

    description: string;

    // Old/new values for UPDATE
    old_values?: Record<string, unknown>;
    new_values?: Record<string, unknown>;
    changed_fields?: string[];

    // Request info
    ip_address?: string;
    user_agent?: string;

    // Tamper-proof
    hash?: string;
    previous_hash?: string;

    created_at: string;
}

export interface AuditLogListParams {
    page?: number;
    limit?: number;
    user_id?: string;
    action?: AuditAction;
    entity_type?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
}

export interface AuditLogListResponse {
    items: AuditLog[];
    total: number;
    page: number;
    limit: number;
}

// ==========================================
// PERIOD LOCK
// ==========================================

export type PeriodLockType = 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';

export type LockStatus = 'OPEN' | 'LOCKED' | 'PERMANENTLY_LOCKED';

export interface PeriodLock {
    id: string;
    farm_id: string;

    period_type: PeriodLockType;
    period_code: string;
    from_date: string;
    to_date: string;

    status: LockStatus;

    locked_by?: string;
    locked_by_name?: string;
    locked_at?: string;
    lock_reason?: string;

    unlocked_by?: string;
    unlocked_by_name?: string;
    unlocked_at?: string;
    unlock_reason?: string;

    // Tamper-proof hash chain
    hash?: string;
    previous_hash?: string;

    created_at: string;
}

export interface PeriodLockStatus {
    current_lock_date?: string;
    earliest_editable_date: string;
    locks: PeriodLock[];
}

export interface LockPeriodInput {
    period_type: PeriodLockType;
    period_code: string;
    from_date: string;
    to_date: string;
    reason?: string;
}

export interface UnlockPeriodInput {
    lock_id: string;
    reason: string;
}

// ==========================================
// ROLE & PERMISSION
// ==========================================

export type UserRole = 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'STAFF' | 'VIEWER';

export type PermissionAction = 'view' | 'create' | 'update' | 'delete' | 'export';

export interface Permission {
    module: string;
    actions: PermissionAction[];
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    OWNER: [
        { module: '*', actions: ['view', 'create', 'update', 'delete', 'export'] },
    ],
    ADMIN: [
        { module: 'transactions', actions: ['view', 'create', 'update', 'delete', 'export'] },
        { module: 'reports', actions: ['view', 'export'] },
        { module: 'users', actions: ['view', 'create', 'update'] },
        { module: 'settings', actions: ['view', 'update'] },
        { module: 'audit', actions: ['view'] },
        { module: 'period-lock', actions: ['view', 'create'] },
    ],
    ACCOUNTANT: [
        { module: 'transactions', actions: ['view', 'create', 'update', 'export'] },
        { module: 'reports', actions: ['view', 'export'] },
        { module: 'vat', actions: ['view', 'create', 'update', 'export'] },
        { module: 'period-lock', actions: ['view', 'create'] },
        { module: 'audit', actions: ['view'] },
    ],
    STAFF: [
        { module: 'transactions', actions: ['view', 'create'] },
        { module: 'products', actions: ['view', 'create', 'update'] },
        { module: 'inventory', actions: ['view', 'create'] },
    ],
    VIEWER: [
        { module: 'transactions', actions: ['view'] },
        { module: 'reports', actions: ['view'] },
        { module: 'dashboard', actions: ['view'] },
    ],
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Check if a role has permission for a specific module and action
 */
export function hasPermission(
    role: UserRole,
    module: string,
    action: PermissionAction
): boolean {
    const permissions = ROLE_PERMISSIONS[role] || [];

    for (const perm of permissions) {
        if (perm.module === '*' || perm.module === module) {
            if (perm.actions.includes(action)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Get all modules a role has access to
 */
export function getAccessibleModules(role: UserRole): string[] {
    const permissions = ROLE_PERMISSIONS[role] || [];
    const modules = new Set<string>();

    for (const perm of permissions) {
        if (perm.module !== '*') {
            modules.add(perm.module);
        }
    }

    return Array.from(modules);
}
