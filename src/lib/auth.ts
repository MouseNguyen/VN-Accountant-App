// src/lib/auth.ts
// Authentication helpers với Cookie-based authentication
// HttpOnly cookies for security

import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prismaBase } from './prisma';
import { runWithContext, RequestContext } from './context';
import { env } from '@/env';

// ==========================================
// JWT CONFIGURATION
// ==========================================

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);
const ACCESS_TOKEN_EXPIRES_IN = env.ACCESS_TOKEN_EXPIRES_IN;
const REFRESH_TOKEN_EXPIRES_IN = env.REFRESH_TOKEN_EXPIRES_IN;

// Cookie names
const ACCESS_COOKIE = 'laba_access_token';
const REFRESH_COOKIE = 'laba_refresh_token';

// ==========================================
// PASSWORD FUNCTIONS
// ==========================================

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

// ==========================================
// TOKEN GENERATION
// ==========================================

/**
 * Generate OTP 6 số
 */
export function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate secure random token cho password reset
 */
export function generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash token trước khi lưu database
 */
export function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// ==========================================
// JWT TOKEN FUNCTIONS
// ==========================================

export interface TokenPayload {
    userId: string;
    farmId: string;
    email: string;
    type: 'access' | 'refresh';
    [key: string]: unknown;
}

/**
 * Parse expiration string to milliseconds
 */
function parseExpiration(exp: string): number {
    const match = exp.match(/^(\d+)([smhd])$/);
    if (!match) return 15 * 60 * 1000; // default 15 min

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return 15 * 60 * 1000;
    }
}

export async function createAccessToken(payload: Omit<TokenPayload, 'type'>): Promise<string> {
    return new SignJWT({ ...payload, type: 'access' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(ACCESS_TOKEN_EXPIRES_IN)
        .sign(JWT_SECRET);
}

export async function createRefreshToken(payload: Omit<TokenPayload, 'type'>): Promise<string> {
    return new SignJWT({ ...payload, type: 'refresh' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(REFRESH_TOKEN_EXPIRES_IN)
        .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as unknown as TokenPayload;
    } catch {
        return null;
    }
}

// ==========================================
// COOKIE FUNCTIONS
// ==========================================

export function setAuthCookies(
    response: NextResponse,
    accessToken: string,
    refreshToken: string,
    rememberMe: boolean = false
): void {
    const isProduction = env.NODE_ENV === 'production';
    const accessMaxAge = parseExpiration(ACCESS_TOKEN_EXPIRES_IN) / 1000;
    const refreshMaxAge = parseExpiration(REFRESH_TOKEN_EXPIRES_IN) / 1000;

    response.cookies.set(ACCESS_COOKIE, accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: accessMaxAge,
    });

    response.cookies.set(REFRESH_COOKIE, refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: rememberMe ? refreshMaxAge : undefined, // Session cookie if not remember
    });
}

export function clearAuthCookies(response: NextResponse): void {
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
}

export function getTokensFromCookies(request: NextRequest): {
    accessToken: string | undefined;
    refreshToken: string | undefined;
} {
    return {
        accessToken: request.cookies.get(ACCESS_COOKIE)?.value,
        refreshToken: request.cookies.get(REFRESH_COOKIE)?.value,
    };
}

// ==========================================
// REFRESH TOKEN DATABASE FUNCTIONS
// ==========================================

export async function saveRefreshToken(
    userId: string,
    token: string,
    deviceInfo?: string,
    ipAddress?: string
): Promise<void> {
    const expiresAt = new Date(Date.now() + parseExpiration(REFRESH_TOKEN_EXPIRES_IN));

    await prismaBase.refreshToken.create({
        data: {
            user_id: userId,
            token: hashToken(token),
            device_info: deviceInfo,
            ip_address: ipAddress,
            expires_at: expiresAt,
        },
    });
}

export async function deleteRefreshToken(token: string): Promise<void> {
    await prismaBase.refreshToken.deleteMany({
        where: { token: hashToken(token) },
    });
}

export async function deleteAllRefreshTokens(userId: string): Promise<void> {
    await prismaBase.refreshToken.deleteMany({
        where: { user_id: userId },
    });
}

export async function validateRefreshToken(token: string): Promise<boolean> {
    const storedToken = await prismaBase.refreshToken.findFirst({
        where: {
            token: hashToken(token),
            expires_at: { gt: new Date() },
        },
    });
    return !!storedToken;
}

// ==========================================
// REFRESH TOKEN ROTATION
// ==========================================

/**
 * Rotate refresh token - invalidate old token, issue new one
 * This prevents token reuse attacks
 */
export async function rotateRefreshToken(
    oldToken: string,
    userId: string,
    deviceInfo?: string,
    ipAddress?: string
): Promise<{ newRefreshToken: string; newAccessToken: string } | null> {
    const hashedOldToken = hashToken(oldToken);

    // Find the stored token
    const storedToken = await prismaBase.refreshToken.findFirst({
        where: {
            token: hashedOldToken,
            user_id: userId,
            expires_at: { gt: new Date() },
        },
    });

    if (!storedToken) {
        // Token not found or expired - possible token reuse attack
        console.warn(`[SECURITY] Refresh token not found or expired for user ${userId}`, {
            timestamp: new Date().toISOString(),
            ip: ipAddress,
        });
        return null;
    }

    // Check if token was already used (rotation detection)
    if (storedToken.used_at) {
        // TOKEN REUSE DETECTED - possible theft!
        console.error(`[SECURITY] Refresh token reuse detected for user ${userId}!`, {
            timestamp: new Date().toISOString(),
            originalIP: storedToken.ip_address,
            currentIP: ipAddress,
        });

        // Invalidate ALL tokens for this user as a safety measure
        await deleteAllRefreshTokens(userId);
        return null;
    }

    // Get user data for new tokens
    const user = await prismaBase.user.findUnique({
        where: { id: userId },
        include: { farm: true },
    });

    if (!user) return null;

    const farmId = user.farm_id || '';
    const tokenPayload = { userId, farmId, email: user.email };

    // Mark old token as used
    await prismaBase.refreshToken.update({
        where: { id: storedToken.id },
        data: { used_at: new Date() },
    });

    // Generate new tokens
    const newAccessToken = await createAccessToken(tokenPayload);
    const newRefreshToken = await createRefreshToken(tokenPayload);

    // Save new refresh token
    await saveRefreshToken(userId, newRefreshToken, deviceInfo, ipAddress);

    // Delete the old token after successful rotation
    await prismaBase.refreshToken.delete({
        where: { id: storedToken.id },
    });

    return { newRefreshToken, newAccessToken };
}

// ==========================================
// GET CURRENT USER (Cookie-based)
// ==========================================

export async function getCurrentUser(request: NextRequest) {
    const { accessToken } = getTokensFromCookies(request);
    if (!accessToken) return null;

    const payload = await verifyToken(accessToken);
    if (!payload || payload.type !== 'access') return null;

    const user = await prismaBase.user.findUnique({
        where: { id: payload.userId },
        include: { farm: true },
    });

    return user;
}

export type AuthUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

// ==========================================
// AUTH MIDDLEWARE - Requires email verified
// ==========================================

type AuthenticatedHandler = (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => Promise<NextResponse>;

export function withAuth(handler: AuthenticatedHandler) {
    return async (
        request: NextRequest,
        routeContext: { params: Promise<Record<string, string>> }
    ) => {
        const user = await getCurrentUser(request);

        if (!user) {
            return NextResponse.json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập' } },
                { status: 401 }
            );
        }

        if (!user.is_active) {
            return NextResponse.json(
                { success: false, error: { code: 'ACCOUNT_DISABLED', message: 'Tài khoản bị vô hiệu hóa' } },
                { status: 403 }
            );
        }

        if (!user.email_verified) {
            return NextResponse.json(
                { success: false, error: { code: 'EMAIL_NOT_VERIFIED', message: 'Vui lòng xác thực email' } },
                { status: 403 }
            );
        }

        const requestContext: RequestContext = {
            farmId: user.farm_id,
            userId: user.id,
            userEmail: user.email,
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
        };

        return runWithContext(requestContext, async () => {
            return await handler(request, routeContext, user);
        });
    };
}

// ==========================================
// AUTH MIDDLEWARE - Allows unverified email
// ==========================================

export function withAuthUnverified(handler: AuthenticatedHandler) {
    return async (
        request: NextRequest,
        routeContext: { params: Promise<Record<string, string>> }
    ) => {
        const user = await getCurrentUser(request);

        if (!user) {
            return NextResponse.json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập' } },
                { status: 401 }
            );
        }

        if (!user.is_active) {
            return NextResponse.json(
                { success: false, error: { code: 'ACCOUNT_DISABLED', message: 'Tài khoản bị vô hiệu hóa' } },
                { status: 403 }
            );
        }

        const requestContext: RequestContext = {
            farmId: user.farm_id,
            userId: user.id,
            userEmail: user.email,
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
        };

        return runWithContext(requestContext, async () => {
            return await handler(request, routeContext, user);
        });
    };
}

// ==========================================
// OPTIONAL AUTH MIDDLEWARE
// ==========================================

type OptionalAuthHandler = (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> },
    user: AuthUser | null
) => Promise<NextResponse>;

export function withOptionalAuth(handler: OptionalAuthHandler) {
    return async (
        request: NextRequest,
        routeContext: { params: Promise<Record<string, string>> }
    ) => {
        const user = await getCurrentUser(request);

        const requestContext: RequestContext = {
            farmId: user?.farm_id || null,
            userId: user?.id || null,
            userEmail: user?.email || null,
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
        };

        return runWithContext(requestContext, async () => {
            return await handler(request, routeContext, user);
        });
    };
}
