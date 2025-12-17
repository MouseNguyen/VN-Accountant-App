// scripts/reset-password.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const newPassword = 'Test@123';
    const hash = await bcrypt.hash(newPassword, 12);

    // Update test user
    await prisma.user.update({
        where: { email: 'test@labaerp.com' },
        data: {
            password_hash: hash,
            email_verified: true,
            is_active: true,
        }
    });
    console.log('✅ Password reset for test@labaerp.com');
    console.log('   New password: Test@123');

    // Also update admin
    await prisma.user.update({
        where: { email: 'admin@laba.vn' },
        data: {
            password_hash: await bcrypt.hash('Admin123@', 12),
            email_verified: true,
            is_active: true,
        }
    });
    console.log('✅ Password reset for admin@laba.vn');
    console.log('   New password: Admin123@');
}

main().catch(console.error).finally(() => prisma.$disconnect());
