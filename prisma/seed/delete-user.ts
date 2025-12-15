// prisma/seed/delete-user.ts
// Delete a specific user by email

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'mousenguyen@gmail.com';

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        console.log('❌ User not found:', email);
        return;
    }

    const farmId = user.farm_id;

    // Delete user (will cascade delete related tokens)
    await prisma.user.delete({
        where: { email },
    });

    // Delete farm
    await prisma.farm.delete({
        where: { id: farmId },
    });

    console.log('✅ Deleted user:', email);
    console.log('✅ Deleted farm:', farmId);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
