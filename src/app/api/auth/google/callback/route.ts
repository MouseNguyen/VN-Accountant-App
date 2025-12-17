// src/app/api/auth/google/callback/route.ts
// Google OAuth Callback - Phase 4 Task 10

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import {
    getGoogleConfig,
    exchangeGoogleCode,
    getGoogleUser,
    validateOAuthState,
} from '@/lib/oauth';
import {
    createAccessToken,
    createRefreshToken,
    setAuthCookies,
    saveRefreshToken,
} from '@/lib/auth';
import { getClientIp } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const searchParams = request.nextUrl.searchParams;

        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // Handle OAuth error
        if (error) {
            console.error('Google OAuth error:', error);
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/login?error=oauth_denied`
            );
        }

        // Validate code and state
        if (!code || !state) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/login?error=oauth_invalid`
            );
        }

        // Validate state against stored state
        const storedState = cookieStore.get('oauth_state')?.value;
        if (!storedState || !validateOAuthState(state, storedState)) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/login?error=oauth_state`
            );
        }

        // Exchange code for tokens
        const config = getGoogleConfig();
        const tokens = await exchangeGoogleCode(code, config);

        // Get user info from Google
        const googleUser = await getGoogleUser(tokens.access_token);

        // Find or create user
        let user = await prisma.user.findUnique({
            where: { email: googleUser.email },
            include: { farm: true },
        });

        if (!user) {
            // OAuth users need a farm - for now, return error
            // In production, you'd create a default farm or redirect to onboarding
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/login?error=oauth_no_account`
            );
        } else {
            // Update existing user with OAuth info
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    oauth_provider: 'google',
                    oauth_id: googleUser.provider_user_id,
                    avatar_url: googleUser.picture || user.avatar_url,
                    email_verified: true,
                },
            });
        }

        // Get farm ID
        const farmId = user.farm_id || '';

        // Create tokens
        const tokenPayload = {
            userId: user.id,
            farmId,
            email: user.email,
        };

        const accessToken = await createAccessToken(tokenPayload);
        const refreshToken = await createRefreshToken(tokenPayload);

        // Save refresh token
        await saveRefreshToken(
            user.id,
            refreshToken,
            request.headers.get('user-agent') || undefined,
            getClientIp(request)
        );

        // Create response with redirect
        const redirectUrl = cookieStore.get('oauth_redirect')?.value || '/dashboard';
        const response = NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}${redirectUrl}`
        );

        // Set auth cookies
        setAuthCookies(response, accessToken, refreshToken, true);

        // Clear OAuth cookies
        response.cookies.delete('oauth_state');
        response.cookies.delete('oauth_redirect');

        return response;
    } catch (error) {
        console.error('Google OAuth callback error:', error);
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/login?error=oauth_failed`
        );
    }
}
