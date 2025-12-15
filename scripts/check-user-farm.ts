// scripts/check-user-farm.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Find user test@test.com
    const user = await prisma.user.findFirst({
        where: { email: 'test@test.com' },
        include: { farm: true },
    });

    console.log('👤 User:', user?.email);
    console.log('🏠 Farm ID:', user?.farm_id);
    console.log('🏠 Farm Name:', user?.farm?.name);

    // List all farms
    const farms = await prisma.farm.findMany({
        select: { id: true, name: true },
    });
    console.log('\n📋 All farms:');
    farms.forEach((f) => console.log(`  - ${f.name}: ${f.id}`));

    // Check AR data in user's farm
    if (user?.farm_id) {
        const arCount = await prisma.aRTransaction.count({
            where: { farm_id: user.farm_id },
        });
        console.log(`\n📄 AR transactions in user's farm: ${arCount}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
