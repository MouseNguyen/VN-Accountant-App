// src/lib/authorize.ts
// Authorization Middleware - Phase 4 Task 11

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, AuthUser } from '@/lib/auth';
import { hasPermission, hasAnyPermission, Permission } from '@/lib/permissions';
import { runWithContext, RequestContext } from '@/lib/context';

// ==========================================
// TYPES
// ==========================================

type AuthorizedHandler = (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => Promise<NextResponse>;

// ==========================================
// PERMISSION MIDDLEWARE
// ==========================================

/**
 * Middleware that requires specific permission
 * 
 * @example
 * export const POST = withPermission('ar:create', handler);
 */
export function withPermission(permission: Permission, handler: AuthorizedHandler) {
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

        // Check permission
        if (!hasPermission(user.role, permission)) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: `Bạn không có quyền thực hiện thao tác này (${permission})`
                    }
                },
                { status: 403 }
            );
        }

        // Set up context and run handler
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

/**
 * Middleware that requires any of the specified permissions
 * 
 * @example
 * export const GET = withAnyPermission(['ar:view', 'reports:view'], handler);
 */
export function withAnyPermission(permissions: Permission[], handler: AuthorizedHandler) {
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

        if (!hasAnyPermission(user.role, permissions)) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Bạn không có quyền truy cập'
                    }
                },
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
// OWNER ONLY MIDDLEWARE
// ==========================================

/**
 * Middleware that requires OWNER role
 */
export function withOwnerOnly(handler: AuthorizedHandler) {
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

        if (user.role !== 'OWNER') {
            return NextResponse.json(
                { success: false, error: { code: 'FORBIDDEN', message: 'Chỉ chủ sở hữu có quyền thực hiện' } },
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
