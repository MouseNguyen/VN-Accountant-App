// src/lib/rate-limit.ts
// Rate limiting với Upstash Redis
// Chống brute force attack cho login, register, forgot password

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env, isRateLimitEnabled } from '@/env';

// ==========================================
// REDIS CLIENT
// ==========================================

let redis: Redis | null = null;

if (isRateLimitEnabled()) {
    redis = new Redis({
        url: env.UPSTASH_REDIS_REST_URL!,
        token: env.UPSTASH_REDIS_REST_TOKEN!,
    });
}

// ==========================================
// RATE LIMITERS
// ==========================================

/**
 * Rate limiter cho login
 * 5 lần / 10 phút
 */
export const loginRateLimiter = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '10 m'),
        prefix: 'rl:login',
        analytics: true,
    })
    : null;

/**
 * Rate limiter cho register
 * 3 lần / 1 giờ
 */
export const registerRateLimiter = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, '1 h'),
        prefix: 'rl:register',
        analytics: true,
    })
    : null;

/**
 * Rate limiter cho forgot password
 * 3 lần / 1 giờ
 */
export const forgotPasswordRateLimiter = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, '1 h'),
        prefix: 'rl:forgot',
        analytics: true,
    })
    : null;

/**
 * Rate limiter cho resend verification email
 * 3 lần / 15 phút
 */
export const resendVerificationRateLimiter = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, '15 m'),
        prefix: 'rl:resend',
        analytics: true,
    })
    : null;

/**
 * Rate limiter general cho API
 * 100 requests / 1 phút
 */
export const apiRateLimiter = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, '1 m'),
        prefix: 'rl:api',
        analytics: true,
    })
    : null;

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Lấy client IP từ request headers
 */
export function getClientIp(request: Request): string {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        return realIp.trim();
    }

    return 'unknown';
}

/**
 * Tạo identifier cho rate limiting (IP + optional key)
 */
export function getRateLimitIdentifier(request: Request, additionalKey?: string): string {
    const ip = getClientIp(request);
    return additionalKey ? `${ip}:${additionalKey}` : ip;
}

// ==========================================
// RATE LIMIT CHECK
// ==========================================

export interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number; // Timestamp khi reset
}

/**
 * Kiểm tra rate limit
 * Trả về null nếu rate limiting disabled
 */
export async function checkRateLimit(
    limiter: Ratelimit | null,
    identifier: string
): Promise<RateLimitResult | null> {
    if (!limiter) {
        // Rate limiting disabled - cho phép tất cả
        return null;
    }

    const result = await limiter.limit(identifier);

    return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
    };
}

/**
 * Build rate limit error response
 */
export function buildRateLimitResponse(result: RateLimitResult): {
    code: string;
    message: string;
    retryAfter: number;
} {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
    const minutes = Math.ceil(retryAfter / 60);

    return {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Quá nhiều yêu cầu. Vui lòng thử lại sau ${minutes} phút.`,
        retryAfter,
    };
}
