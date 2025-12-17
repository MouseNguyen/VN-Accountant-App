// src/app/api/auth/google/route.ts
// Google OAuth Initiation - Phase 4 Task 10

import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuthUrl, getGoogleConfig, generateOAuthState } from '@/lib/oauth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
    try {
        const config = getGoogleConfig();
        const oauthState = generateOAuthState();

        // Store state in cookie for validation on callback
        const cookieStore = await cookies();
        cookieStore.set('oauth_state', oauthState.state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 10, // 10 minutes
            path: '/',
        });

        // Get optional redirect URL from query params
        const searchParams = request.nextUrl.searchParams;
        const redirectAfter = searchParams.get('redirect') || '/dashboard';

        cookieStore.set('oauth_redirect', redirectAfter, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 10,
            path: '/',
        });

        const authUrl = getGoogleAuthUrl(config, oauthState.state);

        return NextResponse.redirect(authUrl);
    } catch (error) {
        console.error('Google OAuth init error:', error);
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/login?error=oauth_config`
        );
    }
}
