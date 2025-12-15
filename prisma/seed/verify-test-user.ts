// prisma/seed/verify-test-user.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.update({
        where: { email: 'test@test.com' },
        data: {
            email_verified: true,
            email_verified_at: new Date(),
        },
    });
    console.log('✅ User verified:', user.email);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
