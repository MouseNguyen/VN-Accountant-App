// scripts/check-data.ts
// Check data in database

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking database...\n');

    // Check users
    const users = await prisma.user.findMany();
    console.log('📧 Users:');
    for (const u of users) {
        console.log(`   - ${u.email} (verified: ${u.email_verified})`);
    }

    // Check farms  
    const farms = await prisma.farm.findMany();
    console.log('\n🏠 Farms:');
    for (const f of farms) {
        console.log(`   - ${f.name} (id: ${f.id.substring(0, 8)}...)`);
    }

    // Check data per farm
    console.log('\n📊 Data per farm:');
    for (const f of farms) {
        const products = await prisma.product.count({ where: { farm_id: f.id } });
        const partners = await prisma.partner.count({ where: { farm_id: f.id } });
        const transactions = await prisma.transaction.count({ where: { farm_id: f.id } });

        console.log(`\n   ${f.name} (${f.id.substring(0, 8)}...):`);
        console.log(`     Products: ${products}`);
        console.log(`     Partners: ${partners}`);
        console.log(`     Transactions: ${transactions}`);
    }

    // Check which user owns which farm
    console.log('\n🔗 Farm ownership:');
    for (const f of farms) {
        const owner = await prisma.user.findFirst({ where: { id: f.owner_id } });
        console.log(`   - ${f.name} → owner: ${owner?.email || 'unknown'}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
