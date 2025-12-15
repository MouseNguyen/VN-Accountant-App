// scripts/verify-test-user.ts
// Mark test@test.com as email verified

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Verifying test@test.com...\n');

    const user = await prisma.user.findUnique({
        where: { email: 'test@test.com' }
    });

    if (!user) {
        console.log('❌ User test@test.com not found');
        return;
    }

    console.log('Found user:', user.email);
    console.log('Current email_verified:', user.email_verified);

    if (user.email_verified) {
        console.log('\n✅ Already verified!');
        return;
    }

    await prisma.user.update({
        where: { email: 'test@test.com' },
        data: { email_verified: true }
    });

    console.log('\n✅ Updated email_verified to true');
    console.log('\n📋 Login with test@test.com now works without OTP!');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
