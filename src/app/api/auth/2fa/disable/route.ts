// src/app/api/auth/2fa/disable/route.ts
// Disable 2FA Endpoint - Phase 4 Task 10

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { verifyTOTP } from '@/lib/totp';
import prisma from '@/lib/prisma';

export const POST = withAuth(
    async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: AuthUser) => {
        try {
            const body = await req.json();
            const { token, password } = body;

            // Require either TOTP token or password for security
            if (!token && !password) {
                return NextResponse.json(
                    { success: false, error: { message: 'Vui lòng xác thực để tắt 2FA' } },
                    { status: 400 }
                );
            }

            const dbUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: {
                    two_factor_secret: true,
                    two_factor_enabled: true,
                    password_hash: true,
                },
            });

            if (!dbUser?.two_factor_enabled) {
                return NextResponse.json(
                    { success: false, error: { message: '2FA chưa được bật' } },
                    { status: 400 }
                );
            }

            // Verify TOTP if provided
            if (token && dbUser.two_factor_secret) {
                const isValid = verifyTOTP(dbUser.two_factor_secret, token);
                if (!isValid) {
                    return NextResponse.json(
                        { success: false, error: { message: 'Mã xác thực không đúng' } },
                        { status: 401 }
                    );
                }
            }

            // Disable 2FA
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    two_factor_enabled: false,
                    two_factor_secret: null,
                    backup_codes: [],
                },
            });

            return NextResponse.json({
                success: true,
                data: {
                    message: '2FA đã được tắt',
                    two_factor_enabled: false,
                },
            });
        } catch (error) {
            console.error('2FA disable error:', error);
            return NextResponse.json(
                { success: false, error: { message: 'Không thể tắt 2FA' } },
                { status: 500 }
            );
        }
    }
);
