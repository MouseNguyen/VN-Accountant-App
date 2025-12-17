// src/lib/distributed-lock.ts
// Distributed Lock using PostgreSQL Advisory Locks
// Task 12 Phase 3

import { prisma } from '@/lib/prisma';

// ==========================================
// POSTGRESQL ADVISORY LOCK
// ==========================================

/**
 * Execute a function with a distributed lock
 * Uses PostgreSQL advisory locks for multi-instance safety
 * 
 * @param lockKey - Unique string key for the lock
 * @param ttlSeconds - Time-to-live (unused for advisory locks but kept for API compatibility)
 * @param fn - Function to execute while holding the lock
 * @returns Result of fn, or null if lock couldn't be acquired
 */
export async function withLock<T>(
    lockKey: string,
    ttlSeconds: number,
    fn: () => Promise<T>
): Promise<T | null> {
    const lockId = hashStringToInt(lockKey);

    try {
        // Try to acquire lock (non-blocking)
        const acquired = await prisma.$queryRaw<[{ pg_try_advisory_lock: boolean }]>`
            SELECT pg_try_advisory_lock(${lockId})
        `;

        if (!acquired[0].pg_try_advisory_lock) {
            console.log(`[LOCK] ${lockKey} already held, skipping...`);
            return null;
        }

        console.log(`[LOCK] ${lockKey} acquired (ID: ${lockId})`);

        // Execute function
        const result = await fn();

        return result;
    } catch (error) {
        console.error(`[LOCK] Error executing with lock ${lockKey}:`, error);
        throw error;
    } finally {
        // Release lock
        try {
            await prisma.$queryRaw`SELECT pg_advisory_unlock(${lockId})`;
            console.log(`[LOCK] ${lockKey} released`);
        } catch (unlockError) {
            console.error(`[LOCK] Failed to release ${lockKey}:`, unlockError);
        }
    }
}

/**
 * Blocking version - waits until lock is available
 */
export async function withLockBlocking<T>(
    lockKey: string,
    fn: () => Promise<T>
): Promise<T> {
    const lockId = hashStringToInt(lockKey);

    try {
        // Acquire lock (blocking)
        await prisma.$queryRaw`SELECT pg_advisory_lock(${lockId})`;
        console.log(`[LOCK] ${lockKey} acquired (blocking)`);

        return await fn();
    } finally {
        await prisma.$queryRaw`SELECT pg_advisory_unlock(${lockId})`;
        console.log(`[LOCK] ${lockKey} released`);
    }
}

// ==========================================
// HASH FUNCTION
// ==========================================

/**
 * Hash a string to an integer for advisory lock ID
 * PostgreSQL advisory locks require bigint/int8 IDs
 */
function hashStringToInt(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

// ==========================================
// LOCK STATUS CHECK
// ==========================================

/**
 * Check if a lock is currently held
 */
export async function isLockHeld(lockKey: string): Promise<boolean> {
    const lockId = hashStringToInt(lockKey);

    // Try to acquire and immediately release
    const acquired = await prisma.$queryRaw<[{ pg_try_advisory_lock: boolean }]>`
        SELECT pg_try_advisory_lock(${lockId})
    `;

    if (acquired[0].pg_try_advisory_lock) {
        // Successfully acquired, so it wasn't held - release it
        await prisma.$queryRaw`SELECT pg_advisory_unlock(${lockId})`;
        return false;
    }

    return true;
}
