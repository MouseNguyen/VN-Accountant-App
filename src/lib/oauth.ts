// src/lib/oauth.ts
// OAuth Providers - Phase 4 Task 10

import crypto from 'crypto';

// ==========================================
// TYPES
// ==========================================

export interface OAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scope: string[];
}

export interface OAuthUser {
    provider: 'google' | 'facebook';
    provider_user_id: string;
    email: string;
    name: string;
    picture?: string;
    email_verified: boolean;
}

export interface OAuthState {
    state: string;
    nonce: string;
    redirect_after?: string;
}

// ==========================================
// STATE MANAGEMENT
// ==========================================

export function generateOAuthState(): OAuthState {
    return {
        state: crypto.randomBytes(32).toString('hex'),
        nonce: crypto.randomBytes(16).toString('hex'),
    };
}

export function validateOAuthState(
    receivedState: string,
    storedState: string
): boolean {
    return receivedState === storedState;
}

// ==========================================
// GOOGLE OAUTH
// ==========================================

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

export function getGoogleAuthUrl(config: OAuthConfig, state: string): string {
    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: config.scope.join(' '),
        state,
        access_type: 'offline',
        prompt: 'consent',
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(
    code: string,
    config: OAuthConfig
): Promise<{ access_token: string; refresh_token?: string; id_token?: string }> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uri: config.redirectUri,
            grant_type: 'authorization_code',
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google token exchange failed: ${error}`);
    }

    return response.json();
}

export async function getGoogleUser(accessToken: string): Promise<OAuthUser> {
    const response = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch Google user info');
    }

    const data = await response.json();

    return {
        provider: 'google',
        provider_user_id: data.sub,
        email: data.email,
        name: data.name,
        picture: data.picture,
        email_verified: data.email_verified,
    };
}

// ==========================================
// GOOGLE CONFIG HELPER
// ==========================================

export function getGoogleConfig(): OAuthConfig {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI ||
        `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;

    if (!clientId || !clientSecret) {
        throw new Error('Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
    }

    return {
        clientId,
        clientSecret,
        redirectUri,
        scope: ['openid', 'email', 'profile'],
    };
}
