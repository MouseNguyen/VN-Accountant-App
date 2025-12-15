// prisma/seed/seed-tax-rules-for-all-farms.ts
// Script to seed tax rules for all existing farms

import { PrismaClient } from '@prisma/client';
import { seedTaxRulesForFarm } from './tax-rules';

const prisma = new PrismaClient();

async function main() {
    console.log('🏛️ Seeding tax rules for all existing farms...\n');

    const farms = await prisma.farm.findMany();

    if (farms.length === 0) {
        console.log('❌ No farms found');
        return;
    }

    for (const farm of farms) {
        await seedTaxRulesForFarm(prisma, farm.id);
    }

    console.log(`\n✅ Done! Seeded tax rules for ${farms.length} farms`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
