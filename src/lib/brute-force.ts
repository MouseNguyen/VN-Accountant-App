// src/lib/brute-force.ts
// Brute Force Protection - Phase 4 Task 10

import prisma from '@/lib/prisma';
import { subMinutes } from 'date-fns';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// ==========================================
// TYPES
// ==========================================

export interface BruteForceCheckResult {
    allowed: boolean;
    remaining_attempts: number;
    locked_until?: Date;
    message?: string;
}

// ==========================================
// CHECK IF LOGIN ALLOWED
// ==========================================

export async function checkLoginAllowed(
    loginIdentifier: string,
    ipAddress: string
): Promise<BruteForceCheckResult> {
    const lockoutTime = subMinutes(new Date(), LOCKOUT_MINUTES);

    // Count recent failed attempts for this identifier OR IP
    const recentFails = await prisma.failedLogin.count({
        where: {
            OR: [
                { login_identifier: loginIdentifier },
                { ip_address: ipAddress },
            ],
            attempted_at: { gte: lockoutTime },
        },
    });

    if (recentFails >= MAX_FAILED_ATTEMPTS) {
        // Find the most recent attempt to calculate unlock time
        const lastAttempt = await prisma.failedLogin.findFirst({
            where: {
                OR: [
                    { login_identifier: loginIdentifier },
                    { ip_address: ipAddress },
                ],
            },
            orderBy: { attempted_at: 'desc' },
        });

        const lockedUntil = lastAttempt
            ? new Date(lastAttempt.attempted_at.getTime() + LOCKOUT_MINUTES * 60 * 1000)
            : new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);

        return {
            allowed: false,
            remaining_attempts: 0,
            locked_until: lockedUntil,
            message: `Tài khoản tạm khóa. Vui lòng thử lại sau ${LOCKOUT_MINUTES} phút.`,
        };
    }

    return {
        allowed: true,
        remaining_attempts: MAX_FAILED_ATTEMPTS - recentFails,
    };
}

// ==========================================
// RECORD FAILED LOGIN
// ==========================================

export async function recordFailedLogin(
    loginIdentifier: string,
    ipAddress: string,
    userAgent?: string,
    reason: string = 'WRONG_PASSWORD'
): Promise<void> {
    await prisma.failedLogin.create({
        data: {
            login_identifier: loginIdentifier,
            ip_address: ipAddress,
            user_agent: userAgent,
            failure_reason: reason,
        },
    });

    // Log for security monitoring
    console.warn(`[SECURITY] Failed login attempt: ${loginIdentifier} from ${ipAddress}`, {
        timestamp: new Date().toISOString(),
        reason,
    });
}

// ==========================================
// CLEAR FAILED LOGINS ON SUCCESS
// ==========================================

export async function clearFailedLogins(loginIdentifier: string): Promise<void> {
    await prisma.failedLogin.deleteMany({
        where: { login_identifier: loginIdentifier },
    });
}

// ==========================================
// GET FAILED LOGIN STATS
// ==========================================

export async function getFailedLoginStats(loginIdentifier: string): Promise<{
    total_attempts: number;
    recent_attempts: number;
    last_attempt?: Date;
    unique_ips: number;
}> {
    const lockoutTime = subMinutes(new Date(), LOCKOUT_MINUTES);

    const [totalCount, recentCount, lastAttempt, uniqueIps] = await Promise.all([
        prisma.failedLogin.count({ where: { login_identifier: loginIdentifier } }),
        prisma.failedLogin.count({
            where: { login_identifier: loginIdentifier, attempted_at: { gte: lockoutTime } },
        }),
        prisma.failedLogin.findFirst({
            where: { login_identifier: loginIdentifier },
            orderBy: { attempted_at: 'desc' },
            select: { attempted_at: true },
        }),
        prisma.failedLogin.findMany({
            where: { login_identifier: loginIdentifier },
            distinct: ['ip_address'],
            select: { ip_address: true },
        }),
    ]);

    return {
        total_attempts: totalCount,
        recent_attempts: recentCount,
        last_attempt: lastAttempt?.attempted_at,
        unique_ips: uniqueIps.length,
    };
}

// ==========================================
// CHECK SUSPICIOUS ACTIVITY
// ==========================================

export async function checkSuspiciousActivity(loginIdentifier: string): Promise<{
    is_suspicious: boolean;
    reasons: string[];
}> {
    const reasons: string[] = [];
    const stats = await getFailedLoginStats(loginIdentifier);

    // Multiple IPs trying to login
    if (stats.unique_ips > 3) {
        reasons.push(`${stats.unique_ips} địa chỉ IP khác nhau đã thử đăng nhập`);
    }

    // High volume of attempts
    if (stats.total_attempts > 10) {
        reasons.push(`${stats.total_attempts} lần thử đăng nhập thất bại`);
    }

    return {
        is_suspicious: reasons.length > 0,
        reasons,
    };
}
