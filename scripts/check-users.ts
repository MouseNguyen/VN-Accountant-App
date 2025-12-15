// scripts/check-users.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        take: 5,
        select: {
            id: true,
            email: true,
            is_active: true,
            email_verified: true,
            farm_id: true,
        }
    });

    console.log('Users in database:');
    console.table(users);

    // Check if any user is verified
    const verifiedUsers = users.filter(u => u.email_verified);
    console.log('\nVerified users:', verifiedUsers.length);

    // If no verified admin, let's mark admin as verified
    const admin = await prisma.user.findFirst({
        where: { email: { contains: 'admin' } }
    });

    if (admin && !admin.email_verified) {
        console.log('\nMarking admin as verified...');
        await prisma.user.update({
            where: { id: admin.id },
            data: { email_verified: true }
        });
        console.log('Done! Admin is now verified.');
    } else if (admin) {
        console.log('\nAdmin already verified:', admin.email);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
