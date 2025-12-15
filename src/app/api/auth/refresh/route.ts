// src/app/api/auth/refresh/route.ts
// API: Refresh tokens

import { NextRequest, NextResponse } from 'next/server';
import {
    getTokensFromCookies,
    verifyToken,
    validateRefreshToken,
    createAccessToken,
    createRefreshToken,
    deleteRefreshToken,
    saveRefreshToken,
    setAuthCookies,
    clearAuthCookies,
} from '@/lib/auth';
import { getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
    try {
        const { refreshToken } = getTokensFromCookies(request);

        // Check if refresh token exists
        if (!refreshToken) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'NO_TOKEN',
                        message: 'Không tìm thấy token',
                    },
                },
                { status: 401 }
            );
        }

        // Verify refresh token
        const payload = await verifyToken(refreshToken);

        if (!payload || payload.type !== 'refresh') {
            const response = NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_TOKEN',
                        message: 'Token không hợp lệ',
                    },
                },
                { status: 401 }
            );
            clearAuthCookies(response);
            return response;
        }

        // Validate refresh token in database
        const isValid = await validateRefreshToken(refreshToken);

        if (!isValid) {
            const response = NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'TOKEN_REVOKED',
                        message: 'Phiên đăng nhập đã hết hạn',
                    },
                },
                { status: 401 }
            );
            clearAuthCookies(response);
            return response;
        }

        // Delete old refresh token (token rotation)
        await deleteRefreshToken(refreshToken);

        // Create new tokens
        const ip = getClientIp(request);
        const newPayload = {
            userId: payload.userId,
            farmId: payload.farmId,
            email: payload.email,
        };

        const newAccessToken = await createAccessToken(newPayload);
        const newRefreshToken = await createRefreshToken(newPayload);

        // Save new refresh token
        await saveRefreshToken(
            payload.userId,
            newRefreshToken,
            request.headers.get('user-agent') || undefined,
            ip
        );

        // Build response
        const response = NextResponse.json({ success: true });

        // Set new cookies
        setAuthCookies(response, newAccessToken, newRefreshToken, true);

        return response;
    } catch (error) {
        console.error('Refresh token error:', error);

        const response = NextResponse.json(
            {
                success: false,
                error: {
                    code: 'SERVER_ERROR',
                    message: 'Có lỗi xảy ra',
                },
            },
            { status: 500 }
        );

        clearAuthCookies(response);
        return response;
    }
}
