// src/services/period-lock.service.ts
// Period Lock Service - Khóa sổ kế toán
// Tamper-proof với hash chain

import { prismaBase } from '@/lib/prisma';
import { getCurrentFarmIdOrNull, getCurrentUserIdOrNull, getAuditInfo } from '@/lib/context';
import { createHash } from 'crypto';
import { createAuditLog } from './audit-log.service';
import type { PeriodLock, PeriodLockStatus, LockPeriodInput, LockStatus } from '@/types/security';

// ==========================================
// TYPES
// ==========================================

type PeriodLockType = 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';

// ==========================================
// HASH CHAIN
// ==========================================

function generateLockHash(
    farmId: string,
    periodType: string,
    periodCode: string,
    lockedBy: string,
    previousHash: string,
    timestamp: string
): string {
    const hashData = JSON.stringify({
        farm_id: farmId,
        period_type: periodType,
        period_code: periodCode,
        locked_by: lockedBy,
        previous_hash: previousHash,
        timestamp,
    });

    return createHash('sha256').update(hashData).digest('hex');
}

// ==========================================
// LOCK PERIOD
// ==========================================

export async function lockPeriod(
    farmId: string,
    userId: string,
    input: LockPeriodInput
): Promise<PeriodLock> {
    const { period_type, period_code, from_date, to_date, reason } = input;

    // Check if already locked
    const existing = await prismaBase.periodLock.findFirst({
        where: {
            farm_id: farmId,
            period_code,
            status: { in: ['LOCKED', 'PERMANENTLY_LOCKED'] },
        },
    });

    if (existing) {
        throw new Error(`Kỳ ${period_code} đã được khóa`);
    }

    // Get previous hash for chain
    const previousLock = await prismaBase.periodLock.findFirst({
        where: { farm_id: farmId },
        orderBy: { created_at: 'desc' },
        select: { hash: true },
    });

    const previousHash = previousLock?.hash || 'GENESIS';
    const timestamp = new Date().toISOString();

    const hash = generateLockHash(
        farmId,
        period_type,
        period_code,
        userId,
        previousHash,
        timestamp
    );

    const lock = await prismaBase.periodLock.upsert({
        where: {
            farm_id_period_code: {
                farm_id: farmId,
                period_code,
            },
        },
        update: {
            status: 'LOCKED',
            locked_at: new Date(),
            locked_by: userId,
            lock_reason: reason,
            hash,
            previous_hash: previousHash,
            unlocked_at: null,
            unlocked_by: null,
            unlock_reason: null,
        },
        create: {
            farm_id: farmId,
            period_type,
            period_code,
            from_date: new Date(from_date),
            to_date: new Date(to_date),
            status: 'LOCKED',
            locked_at: new Date(),
            locked_by: userId,
            lock_reason: reason,
            hash,
            previous_hash: previousHash,
        },
        include: {
            locked_by_user: { select: { full_name: true } },
        },
    });

    // Audit log
    await createAuditLog({
        action: 'PERIOD_LOCK',
        entityType: 'PeriodLock',
        entityId: lock.id,
        entityName: `Kỳ ${period_code}`,
        description: `Khóa sổ ${period_type} kỳ ${period_code}`,
        newValues: { period_code, from_date, to_date, reason },
    });

    return formatPeriodLock(lock);
}

// ==========================================
// UNLOCK PERIOD
// ==========================================

export async function unlockPeriod(
    farmId: string,
    userId: string,
    lockId: string,
    reason: string
): Promise<PeriodLock> {
    const lock = await prismaBase.periodLock.findFirst({
        where: {
            id: lockId,
            farm_id: farmId,
            status: 'LOCKED',
        },
    });

    if (!lock) {
        throw new Error('Khóa sổ không tồn tại hoặc đã được mở');
    }

    if (lock.status === 'PERMANENTLY_LOCKED') {
        throw new Error('Không thể mở khóa sổ vĩnh viễn');
    }

    const updated = await prismaBase.periodLock.update({
        where: { id: lockId },
        data: {
            status: 'OPEN',
            unlocked_at: new Date(),
            unlocked_by: userId,
            unlock_reason: reason,
        },
        include: {
            locked_by_user: { select: { full_name: true } },
            unlocked_by_user: { select: { full_name: true } },
        },
    });

    // Audit log
    await createAuditLog({
        action: 'PERIOD_UNLOCK',
        entityType: 'PeriodLock',
        entityId: lock.id,
        entityName: `Kỳ ${lock.period_code}`,
        description: `Mở khóa sổ kỳ ${lock.period_code}: ${reason}`,
        oldValues: { status: 'LOCKED' },
        newValues: { status: 'OPEN', unlock_reason: reason },
    });

    return formatPeriodLock(updated);
}

// ==========================================
// GET LOCK STATUS
// ==========================================

export async function getPeriodLockStatus(farmId: string): Promise<PeriodLockStatus> {
    const locks = await prismaBase.periodLock.findMany({
        where: {
            farm_id: farmId,
            status: { in: ['LOCKED', 'PERMANENTLY_LOCKED'] },
        },
        orderBy: { to_date: 'desc' },
        include: {
            locked_by_user: { select: { full_name: true } },
        },
    });

    // Find the latest lock date
    const currentLockDate = locks.length > 0
        ? locks[0].to_date.toISOString().split('T')[0]
        : undefined;

    // Calculate earliest editable date
    let earliestEditableDate = '2000-01-01';
    if (currentLockDate) {
        const d = new Date(currentLockDate);
        d.setDate(d.getDate() + 1);
        earliestEditableDate = d.toISOString().split('T')[0];
    }

    return {
        current_lock_date: currentLockDate,
        earliest_editable_date: earliestEditableDate,
        locks: locks.map(formatPeriodLock),
    };
}

// ==========================================
// GET ALL LOCKS FOR FARM
// ==========================================

export async function getPeriodLocks(
    farmId: string,
    options?: { status?: LockStatus; limit?: number }
): Promise<PeriodLock[]> {
    const where: Record<string, unknown> = { farm_id: farmId };

    if (options?.status) {
        where.status = options.status;
    }

    const locks = await prismaBase.periodLock.findMany({
        where,
        orderBy: { to_date: 'desc' },
        take: options?.limit,
        include: {
            locked_by_user: { select: { full_name: true } },
            unlocked_by_user: { select: { full_name: true } },
        },
    });

    return locks.map(formatPeriodLock);
}

// ==========================================
// CHECK IF DATE IS LOCKED
// ==========================================

export async function isDateLocked(farmId: string, date: Date): Promise<boolean> {
    const lock = await prismaBase.periodLock.findFirst({
        where: {
            farm_id: farmId,
            from_date: { lte: date },
            to_date: { gte: date },
            status: { in: ['LOCKED', 'PERMANENTLY_LOCKED'] },
        },
    });

    return !!lock;
}

/**
 * Check if a date range overlaps with any locked period
 */
export async function isDateRangeLocked(
    farmId: string,
    fromDate: Date,
    toDate: Date
): Promise<{ is_locked: boolean; locked_period?: string }> {
    const lock = await prismaBase.periodLock.findFirst({
        where: {
            farm_id: farmId,
            status: { in: ['LOCKED', 'PERMANENTLY_LOCKED'] },
            OR: [
                // fromDate falls within lock
                { from_date: { lte: fromDate }, to_date: { gte: fromDate } },
                // toDate falls within lock
                { from_date: { lte: toDate }, to_date: { gte: toDate } },
                // Lock is entirely within range
                { from_date: { gte: fromDate }, to_date: { lte: toDate } },
            ],
        },
    });

    if (lock) {
        return {
            is_locked: true,
            locked_period: lock.period_code,
        };
    }

    return { is_locked: false };
}

// ==========================================
// PERMANENTLY LOCK (for final closing)
// ==========================================

export async function permanentlyLockPeriod(
    farmId: string,
    userId: string,
    lockId: string,
    reason: string
): Promise<PeriodLock> {
    const lock = await prismaBase.periodLock.findFirst({
        where: {
            id: lockId,
            farm_id: farmId,
            status: 'LOCKED',
        },
    });

    if (!lock) {
        throw new Error('Khóa sổ không tồn tại hoặc chưa được khóa');
    }

    const updated = await prismaBase.periodLock.update({
        where: { id: lockId },
        data: {
            status: 'PERMANENTLY_LOCKED',
            lock_reason: `${lock.lock_reason || ''} | Khóa vĩnh viễn: ${reason}`,
        },
        include: {
            locked_by_user: { select: { full_name: true } },
        },
    });

    // Audit log
    await createAuditLog({
        action: 'PERIOD_LOCK',
        entityType: 'PeriodLock',
        entityId: lock.id,
        entityName: `Kỳ ${lock.period_code}`,
        description: `Khóa vĩnh viễn kỳ ${lock.period_code}: ${reason}`,
        oldValues: { status: 'LOCKED' },
        newValues: { status: 'PERMANENTLY_LOCKED' },
    });

    return formatPeriodLock(updated);
}

// ==========================================
// HELPER
// ==========================================

function formatPeriodLock(lock: any): PeriodLock {
    return {
        id: lock.id,
        farm_id: lock.farm_id,
        period_type: lock.period_type as any,
        period_code: lock.period_code,
        from_date: lock.from_date.toISOString().split('T')[0],
        to_date: lock.to_date.toISOString().split('T')[0],
        status: lock.status,
        locked_by: lock.locked_by,
        locked_by_name: lock.locked_by_user?.full_name,
        locked_at: lock.locked_at?.toISOString(),
        lock_reason: lock.lock_reason,
        unlocked_by: lock.unlocked_by,
        unlocked_by_name: lock.unlocked_by_user?.full_name,
        unlocked_at: lock.unlocked_at?.toISOString(),
        unlock_reason: lock.unlock_reason,
        hash: lock.hash,
        previous_hash: lock.previous_hash,
        created_at: lock.created_at.toISOString(),
    };
}
