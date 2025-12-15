// src/app/api/auth/logout/route.ts
// API: Đăng xuất

import { NextRequest, NextResponse } from 'next/server';
import {
    getTokensFromCookies,
    clearAuthCookies,
    deleteRefreshToken,
} from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const { refreshToken } = getTokensFromCookies(request);

        // Delete refresh token from database if exists
        if (refreshToken) {
            await deleteRefreshToken(refreshToken);
        }

        // Build response
        const response = NextResponse.json({
            success: true,
            message: 'Đăng xuất thành công',
        });

        // Clear cookies
        clearAuthCookies(response);

        return response;
    } catch (error) {
        console.error('Logout error:', error);

        // Still clear cookies even if there's an error
        const response = NextResponse.json({
            success: true,
            message: 'Đăng xuất thành công',
        });

        clearAuthCookies(response);

        return response;
    }
}
