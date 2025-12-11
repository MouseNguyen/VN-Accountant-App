// src/lib/auth.ts
// Authentication helpers với Context integration cho Multi-tenancy

import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { prismaBase } from './prisma';
import { runWithContext, RequestContext } from './context';
import { env } from '@/env';

// ==========================================
// JWT CONFIGURATION
// ==========================================

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);
const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN;

// ==========================================
// PASSWORD FUNCTIONS
// ==========================================

/**
 * Hash password với bcrypt (12 rounds)
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

/**
 * So sánh password với hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

// ==========================================
// JWT TOKEN FUNCTIONS
// ==========================================

/**
 * Payload được lưu trong JWT token
 */
export interface TokenPayload {
    userId: string;
    farmId: string;
    email: string;
    [key: string]: unknown; // Allow index signature for jose compatibility
}

/**
 * Tạo JWT token
 */
export async function createToken(payload: TokenPayload): Promise<string> {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(JWT_EXPIRES_IN)
        .sign(JWT_SECRET);
}

/**
 * Verify JWT token và trả về payload
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as unknown as TokenPayload;
    } catch {
        return null;
    }
}

// ==========================================
// GET CURRENT USER
// ==========================================

/**
 * Lấy token từ Authorization header
 */
export function getTokenFromHeader(request: NextRequest): string | null {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    return authHeader.split(' ')[1];
}

/**
 * Lấy current user từ request
 * Dùng prismaBase để không bị filter theo farm_id
 */
export async function getCurrentUser(request: NextRequest) {
    const token = getTokenFromHeader(request);
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload) return null;

    // Dùng prismaBase để query không bị filter
    const user = await prismaBase.user.findUnique({
        where: { id: payload.userId },
        include: { farm: true },
    });

    return user;
}

/**
 * Type for authenticated user (with farm)
 */
export type AuthUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

// ==========================================
// AUTH MIDDLEWARE WITH CONTEXT
// ==========================================

/**
 * Handler type cho authenticated routes
 */
type AuthenticatedHandler = (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => Promise<NextResponse>;

/**
 * Middleware wrapper cho protected API routes
 * 
 * Tính năng:
 * - Kiểm tra authentication (JWT token)
 * - Kiểm tra user còn active
 * - Tạo request context với farm_id, user_id
 * - Tất cả Prisma queries trong handler sẽ tự động filter theo farm_id
 * 
 * @example
 * export const GET = withAuth(async (request, context, user) => {
 *   // Không cần thêm farm_id vào where clause
 *   const products = await prisma.product.findMany();
 *   // Prisma Extension đã tự động thêm: WHERE farm_id = user.farm_id
 *   
 *   return NextResponse.json({ success: true, data: products });
 * });
 */
export function withAuth(handler: AuthenticatedHandler) {
    return async (
        request: NextRequest,
        routeContext: { params: Promise<Record<string, string>> }
    ) => {
        // 1. Lấy user từ token
        const user = await getCurrentUser(request);

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Vui lòng đăng nhập để tiếp tục',
                    },
                },
                { status: 401 }
            );
        }

        if (!user.is_active) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'ACCOUNT_DISABLED',
                        message: 'Tài khoản đã bị vô hiệu hóa',
                    },
                },
                { status: 403 }
            );
        }

        // 2. Lấy thông tin request cho audit log
        const ipAddress =
            request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';

        // 3. Tạo request context
        const requestContext: RequestContext = {
            farmId: user.farm_id,
            userId: user.id,
            userEmail: user.email,
            ipAddress,
            userAgent,
        };

        // 4. Chạy handler trong context
        // Tất cả Prisma queries trong handler sẽ tự động được filter theo farm_id
        return runWithContext(requestContext, () =>
            handler(request, routeContext, user)
        );
    };
}

// ==========================================
// OPTIONAL AUTH MIDDLEWARE
// ==========================================

/**
 * Handler type cho optional auth routes
 */
type OptionalAuthHandler = (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> },
    user: AuthUser | null
) => Promise<NextResponse>;

/**
 * Middleware cho routes không bắt buộc auth nhưng vẫn cần context
 * 
 * @example
 * export const GET = withOptionalAuth(async (request, context, user) => {
 *   if (user) {
 *     // User đã đăng nhập - có thể truy cập data của farm
 *   } else {
 *     // Guest - trả về public data
 *   }
 * });
 */
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
            ipAddress:
                request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') ||
                'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
        };

        return runWithContext(requestContext, () =>
            handler(request, routeContext, user)
        );
    };
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Tạo response object cho login success
 */
export async function createAuthResponse(user: AuthUser) {
    const token = await createToken({
        userId: user.id,
        farmId: user.farm_id,
        email: user.email,
    });

    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            farm: {
                id: user.farm.id,
                name: user.farm.name,
                business_type: user.farm.business_type,
            },
        },
    };
}
