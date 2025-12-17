// src/app/api/auth/2fa/verify/route.ts
// 2FA Verification Endpoint - Phase 4 Task 10

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { verifyTOTP, verifyBackupCode } from '@/lib/totp';
import prisma from '@/lib/prisma';

export const POST = withAuth(
    async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: AuthUser) => {
        try {
            const body = await req.json();
            const { token, is_backup_code } = body;

            if (!token) {
                return NextResponse.json(
                    { success: false, error: { message: 'Vui lòng nhập mã xác thực' } },
                    { status: 400 }
                );
            }

            const dbUser = await prisma.user.findUnique({
                where: { id: user.user_id },
                select: {
                    two_factor_secret: true,
                    two_factor_enabled: true,
                    backup_codes: true,
                },
            });

            if (!dbUser?.two_factor_secret) {
                return NextResponse.json(
                    { success: false, error: { message: '2FA chưa được cài đặt' } },
                    { status: 400 }
                );
            }

            let isValid = false;

            if (is_backup_code) {
                // Verify backup code
                const backupCodes = dbUser.backup_codes as string[] || [];
                isValid = verifyBackupCode(token, backupCodes);

                if (isValid) {
                    // Remove used backup code
                    const updatedCodes = backupCodes.filter(
                        (code) => code !== token.replace('-', '')
                    );
                    await prisma.user.update({
                        where: { id: user.user_id },
                        data: { backup_codes: updatedCodes },
                    });
                }
            } else {
                // Verify TOTP
                isValid = verifyTOTP(dbUser.two_factor_secret, token);
            }

            if (!isValid) {
                return NextResponse.json(
                    { success: false, error: { message: 'Mã xác thực không đúng' } },
                    { status: 401 }
                );
            }

            // If this is the first verification, enable 2FA
            if (!dbUser.two_factor_enabled) {
                await prisma.user.update({
                    where: { id: user.user_id },
                    data: { two_factor_enabled: true },
                });

                return NextResponse.json({
                    success: true,
                    data: {
                        message: '2FA đã được kích hoạt thành công!',
                        two_factor_enabled: true,
                    },
                });
            }

            return NextResponse.json({
                success: true,
                data: {
                    message: 'Xác thực thành công',
                    verified: true,
                },
            });
        } catch (error) {
            console.error('2FA verify error:', error);
            return NextResponse.json(
                { success: false, error: { message: 'Lỗi xác thực 2FA' } },
                { status: 500 }
            );
        }
    }
);
