// src/middleware.ts
// Next.js Middleware cho route protection
// Kiểm tra authentication và redirect routes

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// ==========================================
// ROUTE CONFIGURATION
// ==========================================

/**
 * Public routes - không cần đăng nhập
 */
const publicRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
];

/**
 * Guest-only routes - chỉ cho user CHƯA đăng nhập
 * User đã đăng nhập sẽ bị redirect về dashboard
 */
const guestRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
];

/**
 * Public API routes - không cần auth
 */
const publicApiRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/refresh',
    '/api/auth/verify-email',
    '/api/auth/resend-verification',
];

// ==========================================
// TOKEN VERIFICATION
// ==========================================

const ACCESS_COOKIE = 'laba_access_token';

async function verifyAccessToken(token: string): Promise<boolean> {
    try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        await jwtVerify(token, secret);
        return true;
    } catch {
        return false;
    }
}

// ==========================================
// ROUTE MATCHING HELPERS
// ==========================================

function isPublicRoute(pathname: string): boolean {
    return publicRoutes.some((route) => pathname.startsWith(route));
}

function isGuestRoute(pathname: string): boolean {
    return guestRoutes.some((route) => pathname.startsWith(route));
}

function isPublicApiRoute(pathname: string): boolean {
    return publicApiRoutes.some((route) => pathname.startsWith(route));
}

function isStaticResource(pathname: string): boolean {
    return (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/static') ||
        pathname.includes('.') // Files like .ico, .png, .svg
    );
}

// ==========================================
// MIDDLEWARE FUNCTION
// ==========================================

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip static resources
    if (isStaticResource(pathname)) {
        return NextResponse.next();
    }

    // Get access token from cookie
    const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
    const isAuthenticated = accessToken ? await verifyAccessToken(accessToken) : false;

    // ==========================================
    // API ROUTES
    // ==========================================
    if (pathname.startsWith('/api')) {
        // Allow public API routes
        if (isPublicApiRoute(pathname)) {
            return NextResponse.next();
        }

        // Protected API routes - return 401 if not authenticated
        if (!isAuthenticated) {
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

        return NextResponse.next();
    }

    // ==========================================
    // PAGE ROUTES
    // ==========================================

    // Redirect authenticated users away from guest routes (login, register)
    if (isAuthenticated && isGuestRoute(pathname)) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Redirect unauthenticated users to login (except public routes)
    if (!isAuthenticated && !isPublicRoute(pathname)) {
        const loginUrl = new URL('/login', request.url);
        // Save the original URL to redirect back after login
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Redirect root to dashboard or login based on auth status
    if (pathname === '/') {
        return NextResponse.redirect(
            new URL(isAuthenticated ? '/dashboard' : '/login', request.url)
        );
    }

    return NextResponse.next();
}

// ==========================================
// MIDDLEWARE CONFIG
// ==========================================

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - Files with extensions (e.g., .png, .jpg, .svg)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
    ],
};
