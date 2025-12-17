// src/app/api/auth/2fa/setup/route.ts
// 2FA Setup Endpoint - Phase 4 Task 10

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { setup2FA, hashBackupCode } from '@/lib/totp';
import prisma from '@/lib/prisma';

export const POST = withAuth(
    async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: AuthUser) => {
        try {
            // Check if 2FA already enabled
            const dbUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { two_factor_enabled: true, two_factor_secret: true },
            });

            if (dbUser?.two_factor_enabled) {
                return NextResponse.json(
                    { success: false, error: { message: '2FA đã được bật' } },
                    { status: 400 }
                );
            }

            // Generate 2FA secret and QR code
            const result = await setup2FA(user.email);

            // Hash backup codes for storage
            const hashedBackupCodes = result.backup_codes.map(hashBackupCode);

            // Store secret temporarily (not enabled yet)
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    two_factor_secret: result.secret,
                    backup_codes: hashedBackupCodes,
                    // two_factor_enabled remains false until verified
                },
            });

            return NextResponse.json({
                success: true,
                data: {
                    qr_code: result.qr_code_data_url,
                    backup_codes: result.backup_codes, // Show once, user must save
                    message: 'Quét mã QR bằng ứng dụng Authenticator',
                },
            });
        } catch (error) {
            console.error('2FA setup error:', error);
            return NextResponse.json(
                { success: false, error: { message: 'Không thể cài đặt 2FA' } },
                { status: 500 }
            );
        }
    }
);
