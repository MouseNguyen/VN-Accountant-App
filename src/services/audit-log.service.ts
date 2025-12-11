// src/services/audit-log.service.ts
// Service ghi log các thao tác quan trọng (Audit Trail)
// Hỗ trợ truy vết ai làm gì, lúc nào, thay đổi những gì

import { prismaBase } from '@/lib/prisma';
import { getAuditInfo, getCurrentFarmIdOrNull } from '@/lib/context';

// Define AuditAction type (matches Prisma enum)
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'LOGIN' | 'LOGOUT';

// ==========================================
// TYPES
// ==========================================

/**
 * Input để tạo audit log
 */
export interface AuditLogInput {
    action: AuditAction;
    entityType: string;     // Tên model: 'Transaction', 'Product', 'Partner', etc.
    entityId: string;       // ID của record
    oldValues?: object;     // Giá trị cũ (cho UPDATE, DELETE)
    newValues?: object;     // Giá trị mới (cho CREATE, UPDATE)
    description?: string;   // Mô tả thêm
}

/**
 * Kết quả query audit log
 */
export interface AuditLogEntry {
    id: string;
    action: AuditAction;
    entity_type: string;
    entity_id: string | null;
    old_values: unknown;
    new_values: unknown;
    changed_fields: string[];
    description: string | null;
    ip_address: string | null;
    created_at: Date;
    user: {
        id: string;
        full_name: string;
        email: string;
    } | null;
}

// ==========================================
// CONFIGURATION
// ==========================================

/**
 * Danh sách các fields không cần log (sensitive hoặc không quan trọng)
 */
const EXCLUDED_FIELDS = [
    'password_hash',
    'created_at',
    'updated_at',
    'version',
];

/**
 * Mô tả action bằng tiếng Việt
 */
const ACTION_LABELS: Record<AuditAction, string> = {
    CREATE: 'Tạo mới',
    UPDATE: 'Cập nhật',
    DELETE: 'Xóa',
    RESTORE: 'Khôi phục',
    LOGIN: 'Đăng nhập',
    LOGOUT: 'Đăng xuất',
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Tính toán các fields đã thay đổi giữa old và new values
 */
function getChangedFields(oldValues?: object, newValues?: object): string[] {
    if (!oldValues || !newValues) return [];

    const changedFields: string[] = [];
    const allKeys = new Set([
        ...Object.keys(oldValues),
        ...Object.keys(newValues),
    ]);

    for (const key of allKeys) {
        if (EXCLUDED_FIELDS.includes(key)) continue;

        const oldVal = JSON.stringify((oldValues as Record<string, unknown>)[key]);
        const newVal = JSON.stringify((newValues as Record<string, unknown>)[key]);

        if (oldVal !== newVal) {
            changedFields.push(key);
        }
    }

    return changedFields;
}

/**
 * Làm sạch data trước khi lưu (loại bỏ sensitive fields)
 */
function sanitizeValues(values?: object): object | null {
    if (!values) return null;

    const sanitized = { ...values } as Record<string, unknown>;

    // Loại bỏ sensitive fields
    for (const field of EXCLUDED_FIELDS) {
        delete sanitized[field];
    }

    // Convert Decimal/Date sang string để lưu JSON
    for (const key in sanitized) {
        const val = sanitized[key];
        if (val instanceof Date) {
            sanitized[key] = val.toISOString();
        } else if (
            val &&
            typeof val === 'object' &&
            'toNumber' in val &&
            typeof (val as { toNumber: unknown }).toNumber === 'function'
        ) {
            sanitized[key] = (val as { toNumber: () => number }).toNumber();
        }
    }

    return sanitized;
}

// ==========================================
// MAIN FUNCTIONS
// ==========================================

/**
 * Ghi audit log
 * 
 * @example
 * // Khi tạo mới
 * await createAuditLog({
 *   action: 'CREATE',
 *   entityType: 'Transaction',
 *   entityId: transaction.id,
 *   newValues: transaction,
 *   description: 'Tạo phiếu thu PT-202412-001',
 * });
 * 
 * // Khi cập nhật
 * await createAuditLog({
 *   action: 'UPDATE',
 *   entityType: 'Product',
 *   entityId: product.id,
 *   oldValues: oldProduct,
 *   newValues: newProduct,
 * });
 * 
 * // Khi xóa (soft delete)
 * await createAuditLog({
 *   action: 'DELETE',
 *   entityType: 'Partner',
 *   entityId: partner.id,
 *   oldValues: partner,
 * });
 */
export async function createAuditLog(input: AuditLogInput): Promise<void> {
    try {
        const farmId = getCurrentFarmIdOrNull();
        const { userId, ipAddress, userAgent } = getAuditInfo();

        // Không log nếu không có farm context (system operations)
        if (!farmId) {
            console.warn('Audit log skipped: No farm context');
            return;
        }

        const changedFields = getChangedFields(input.oldValues, input.newValues);

        await prismaBase.auditLog.create({
            data: {
                farm_id: farmId,
                user_id: userId,
                action: input.action,
                entity_type: input.entityType,
                entity_id: input.entityId,
                old_values: input.oldValues ? JSON.parse(JSON.stringify(sanitizeValues(input.oldValues))) : undefined,
                new_values: input.newValues ? JSON.parse(JSON.stringify(sanitizeValues(input.newValues))) : undefined,
                changed_fields: changedFields,
                ip_address: ipAddress,
                user_agent: userAgent,
                description: input.description,
            },
        });
    } catch (error) {
        // Không throw error để không ảnh hưởng business logic
        console.error('Failed to create audit log:', error);
    }
}

// ==========================================
// QUERY FUNCTIONS
// ==========================================

/**
 * Lấy lịch sử thay đổi của một entity
 * 
 * @example
 * const history = await getEntityHistory('Transaction', 'trans-id-123');
 */
export async function getEntityHistory(
    entityType: string,
    entityId: string,
    options?: { limit?: number; offset?: number }
): Promise<AuditLogEntry[]> {
    const farmId = getCurrentFarmIdOrNull();
    if (!farmId) return [];

    const logs = await prismaBase.auditLog.findMany({
        where: {
            farm_id: farmId,
            entity_type: entityType,
            entity_id: entityId,
        },
        orderBy: { created_at: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
        include: {
            user: {
                select: { id: true, full_name: true, email: true },
            },
        },
    });

    return logs as AuditLogEntry[];
}

/**
 * Lấy hoạt động gần đây của farm
 * 
 * @example
 * // Lấy 20 hoạt động gần nhất
 * const activities = await getRecentActivities();
 * 
 * // Lấy theo entity type
 * const activities = await getRecentActivities({
 *   entityTypes: ['Transaction', 'Product'],
 *   limit: 10,
 * });
 */
export async function getRecentActivities(
    options?: {
        limit?: number;
        entityTypes?: string[];
        userId?: string;
        fromDate?: Date;
    }
): Promise<AuditLogEntry[]> {
    const farmId = getCurrentFarmIdOrNull();
    if (!farmId) return [];

    const where: Record<string, unknown> = { farm_id: farmId };

    if (options?.entityTypes?.length) {
        where.entity_type = { in: options.entityTypes };
    }

    if (options?.userId) {
        where.user_id = options.userId;
    }

    if (options?.fromDate) {
        where.created_at = { gte: options.fromDate };
    }

    const logs = await prismaBase.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: options?.limit || 20,
        include: {
            user: {
                select: { id: true, full_name: true, email: true },
            },
        },
    });

    return logs as AuditLogEntry[];
}

/**
 * Lấy thống kê hoạt động theo ngày
 */
export async function getActivityStats(
    days: number = 7
): Promise<{ date: string; count: number }[]> {
    const farmId = getCurrentFarmIdOrNull();
    if (!farmId) return [];

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const logs = await prismaBase.auditLog.groupBy({
        by: ['created_at'],
        where: {
            farm_id: farmId,
            created_at: { gte: fromDate },
        },
        _count: { id: true },
    });

    // Group by date string
    const statsMap = new Map<string, number>();
    for (const log of logs) {
        const dateStr = log.created_at.toISOString().split('T')[0];
        statsMap.set(dateStr, (statsMap.get(dateStr) || 0) + log._count.id);
    }

    return Array.from(statsMap.entries()).map(([date, count]) => ({ date, count }));
}

// ==========================================
// UTILITY EXPORTS
// ==========================================

export { ACTION_LABELS };
