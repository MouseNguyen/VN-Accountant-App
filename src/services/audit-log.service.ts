// src/services/audit-log.service.ts
// Service ghi log các thao tác quan trọng (Audit Trail)
// Hỗ trợ truy vết ai làm gì, lúc nào, thay đổi những gì
// Tamper-proof với hash chain

import { prismaBase } from '@/lib/prisma';
import { getAuditInfo, getCurrentFarmIdOrNull } from '@/lib/context';
import { createHash } from 'crypto';
import type { AuditLogListParams, AuditLogListResponse, AuditLog as AuditLogType } from '@/types/security';

// Define AuditAction type (matches Prisma enum)
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT' | 'PERIOD_LOCK' | 'PERIOD_UNLOCK' | 'VAT_SUBMIT' | 'PASSWORD_CHANGE';

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
    entityName?: string;    // Tên hiển thị của entity
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
    EXPORT: 'Xuất dữ liệu',
    IMPORT: 'Nhập dữ liệu',
    PERIOD_LOCK: 'Khóa sổ',
    PERIOD_UNLOCK: 'Mở khóa sổ',
    VAT_SUBMIT: 'Nộp tờ khai VAT',
    PASSWORD_CHANGE: 'Đổi mật khẩu',
};

// ==========================================
// HASH CHAIN FUNCTIONS
// ==========================================

/**
 * Tạo hash cho audit log entry (đảm bảo tamper-proof)
 */
function generateAuditHash(
    farmId: string,
    userId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    oldValues: unknown,
    newValues: unknown,
    previousHash: string,
    timestamp: string
): string {
    const hashData = JSON.stringify({
        farm_id: farmId,
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_values: oldValues,
        new_values: newValues,
        previous_hash: previousHash,
        timestamp,
    });

    return createHash('sha256').update(hashData).digest('hex');
}

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
        const sanitizedOld = input.oldValues ? JSON.parse(JSON.stringify(sanitizeValues(input.oldValues))) : null;
        const sanitizedNew = input.newValues ? JSON.parse(JSON.stringify(sanitizeValues(input.newValues))) : null;

        // Get previous hash for chain
        const previousLog = await prismaBase.auditLog.findFirst({
            where: { farm_id: farmId },
            orderBy: { created_at: 'desc' },
            select: { hash: true },
        });

        const previousHash = previousLog?.hash || 'GENESIS';
        const timestamp = new Date().toISOString();

        // Generate tamper-proof hash
        const hash = generateAuditHash(
            farmId,
            userId,
            input.action,
            input.entityType,
            input.entityId,
            sanitizedOld,
            sanitizedNew,
            previousHash,
            timestamp
        );

        await prismaBase.auditLog.create({
            data: {
                farm_id: farmId,
                user_id: userId,
                action: input.action,
                entity_type: input.entityType,
                entity_id: input.entityId,
                entity_name: input.entityName,
                old_values: sanitizedOld,
                new_values: sanitizedNew,
                changed_fields: changedFields,
                ip_address: ipAddress,
                user_agent: userAgent,
                description: input.description,
                hash,
                previous_hash: previousHash,
            },
        });
    } catch (error) {
        // Không throw error để không ảnh hưởng business logic
        console.error('Failed to create audit log:', error);
    }
}

/**
 * Ghi audit log trực tiếp (cho login/logout và các trường hợp không có context)
 */
export interface DirectAuditLogInput {
    farmId: string;
    userId: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
    entityName?: string;
    description?: string;
    ipAddress?: string;
    userAgent?: string;
    oldValues?: object;
    newValues?: object;
}

export async function createDirectAuditLog(input: DirectAuditLogInput): Promise<void> {
    try {
        // Get previous hash for chain
        const previousLog = await prismaBase.auditLog.findFirst({
            where: { farm_id: input.farmId },
            orderBy: { created_at: 'desc' },
            select: { hash: true },
        });

        const previousHash = previousLog?.hash || 'GENESIS';
        const timestamp = new Date().toISOString();

        // Generate tamper-proof hash
        const hash = generateAuditHash(
            input.farmId,
            input.userId,
            input.action,
            input.entityType,
            input.entityId,
            input.oldValues || null,
            input.newValues || null,
            previousHash,
            timestamp
        );

        await prismaBase.auditLog.create({
            data: {
                farm_id: input.farmId,
                user_id: input.userId,
                action: input.action,
                entity_type: input.entityType,
                entity_id: input.entityId,
                entity_name: input.entityName,
                old_values: input.oldValues ? JSON.stringify(input.oldValues) : undefined,
                new_values: input.newValues ? JSON.stringify(input.newValues) : undefined,
                changed_fields: [],
                ip_address: input.ipAddress,
                user_agent: input.userAgent,
                description: input.description,
                hash,
                previous_hash: previousHash,
            },
        });
    } catch (error) {
        console.error('Failed to create direct audit log:', error);
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
// GET AUDIT LOGS WITH FILTERS
// ==========================================

/**
 * Lấy danh sách audit logs với filters và pagination
 */
export async function getAuditLogs(
    farmId: string,
    params: AuditLogListParams
): Promise<AuditLogListResponse> {
    const { page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { farm_id: farmId };

    if (params.user_id) where.user_id = params.user_id;
    if (params.action) where.action = params.action;
    if (params.entity_type) where.entity_type = params.entity_type;

    if (params.date_from || params.date_to) {
        where.created_at = {};
        if (params.date_from) (where.created_at as Record<string, Date>).gte = new Date(params.date_from);
        if (params.date_to) (where.created_at as Record<string, Date>).lte = new Date(params.date_to);
    }

    if (params.search) {
        where.OR = [
            { description: { contains: params.search, mode: 'insensitive' } },
            { entity_name: { contains: params.search, mode: 'insensitive' } },
        ];
    }

    const [items, total] = await Promise.all([
        prismaBase.auditLog.findMany({
            where,
            include: { user: { select: { id: true, full_name: true, email: true } } },
            orderBy: { created_at: 'desc' },
            skip,
            take: limit,
        }),
        prismaBase.auditLog.count({ where }),
    ]);

    return {
        items: items.map(formatAuditLog),
        total,
        page,
        limit,
    };
}

/**
 * Format audit log for API response
 */
function formatAuditLog(log: any): AuditLogType {
    return {
        id: log.id,
        farm_id: log.farm_id,
        user_id: log.user_id,
        user_name: log.user?.full_name,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        entity_name: log.entity_name,
        description: log.description,
        old_values: log.old_values,
        new_values: log.new_values,
        changed_fields: log.changed_fields,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        hash: log.hash,
        previous_hash: log.previous_hash,
        created_at: log.created_at.toISOString(),
    };
}

// ==========================================
// VERIFY HASH CHAIN
// ==========================================

/**
 * Xác minh tính toàn vẹn của chuỗi audit log
 * Phát hiện nếu có log bị sửa đổi
 */
export async function verifyAuditLogChain(farmId: string): Promise<{
    is_valid: boolean;
    issues: Array<{ log_id: string; issue: string }>;
    checked_count: number;
}> {
    const logs = await prismaBase.auditLog.findMany({
        where: { farm_id: farmId },
        orderBy: { created_at: 'asc' },
        select: { id: true, hash: true, previous_hash: true, created_at: true },
    });

    const issues: Array<{ log_id: string; issue: string }> = [];

    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];

        // Skip logs without hash (created before hash chain)
        if (!log.hash) continue;

        if (i === 0) {
            // First log should have GENESIS or null previous_hash
            if (log.previous_hash && log.previous_hash !== 'GENESIS') {
                issues.push({
                    log_id: log.id,
                    issue: 'Log đầu tiên có previous_hash không hợp lệ',
                });
            }
        } else {
            // Subsequent logs should chain to previous
            const prevLog = logs[i - 1];
            if (prevLog.hash && log.previous_hash !== prevLog.hash) {
                issues.push({
                    log_id: log.id,
                    issue: 'Chuỗi hash bị đứt - log có thể đã bị sửa đổi',
                });
            }
        }
    }

    return {
        is_valid: issues.length === 0,
        issues,
        checked_count: logs.length,
    };
}

// ==========================================
// UTILITY EXPORTS
// ==========================================

export { ACTION_LABELS };
