// src/lib/totp.ts
// TOTP (Time-based One-Time Password) for 2FA - Phase 4 Task 10

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

const APP_NAME = 'LABA ERP';

// ==========================================
// TYPES
// ==========================================

export interface TOTPSecret {
    base32: string;
    hex: string;
    ascii: string;
    otpauth_url: string;
}

export interface Setup2FAResult {
    secret: string;
    otpauth_url: string;
    qr_code_data_url: string;
    backup_codes: string[];
}

// ==========================================
// GENERATE 2FA SECRET
// ==========================================

export function generate2FASecret(userEmail: string): TOTPSecret {
    const secret = speakeasy.generateSecret({
        name: `${APP_NAME} (${userEmail})`,
        length: 20,
        issuer: APP_NAME,
    });

    return {
        base32: secret.base32,
        hex: secret.hex || '',
        ascii: secret.ascii || '',
        otpauth_url: secret.otpauth_url || '',
    };
}

// ==========================================
// GENERATE QR CODE
// ==========================================

export async function generateQRCode(otpauthUrl: string): Promise<string> {
    try {
        const dataUrl = await QRCode.toDataURL(otpauthUrl, {
            errorCorrectionLevel: 'M',
            margin: 2,
            width: 200,
            color: {
                dark: '#000000',
                light: '#ffffff',
            },
        });
        return dataUrl;
    } catch (error) {
        console.error('QR Code generation error:', error);
        throw new Error('Failed to generate QR code');
    }
}

// ==========================================
// VERIFY TOTP TOKEN
// ==========================================

export function verifyTOTP(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 1, // Allow 1 step before/after for clock drift
    });
}

// ==========================================
// GENERATE BACKUP CODES
// ==========================================

export function generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
        // Generate 8-character alphanumeric codes
        const code = Array.from({ length: 8 }, () =>
            'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
        ).join('');
        codes.push(code.slice(0, 4) + '-' + code.slice(4));
    }
    return codes;
}

// ==========================================
// SETUP 2FA (FULL FLOW)
// ==========================================

export async function setup2FA(userEmail: string): Promise<Setup2FAResult> {
    const secret = generate2FASecret(userEmail);
    const qrCodeDataUrl = await generateQRCode(secret.otpauth_url);
    const backupCodes = generateBackupCodes(10);

    return {
        secret: secret.base32,
        otpauth_url: secret.otpauth_url,
        qr_code_data_url: qrCodeDataUrl,
        backup_codes: backupCodes,
    };
}

// ==========================================
// HASH BACKUP CODES (for storage)
// ==========================================

import crypto from 'crypto';

export function hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code.replace('-', '')).digest('hex');
}

export function verifyBackupCode(inputCode: string, hashedCodes: string[]): boolean {
    const inputHash = hashBackupCode(inputCode);
    return hashedCodes.includes(inputHash);
}
