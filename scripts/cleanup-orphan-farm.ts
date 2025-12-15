// scripts/cleanup-orphan-farm.ts
// Delete the orphan farm that has no user

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ORPHAN_FARM_ID = 'f6832964-829c-4af7-8ba1-cbd5af5ade70';

async function main() {
    console.log('🧹 Cleaning up orphan farm...\n');

    // Check if any users belong to this farm
    const usersInFarm = await prisma.user.count({
        where: { farm_id: ORPHAN_FARM_ID },
    });

    if (usersInFarm > 0) {
        console.log(`❌ Cannot delete: ${usersInFarm} users belong to this farm`);
        return;
    }

    console.log('✅ No users in this farm, safe to delete\n');

    // Delete related data first (due to foreign key constraints)
    console.log('Deleting related data...');

    // AR data
    const arAllocations = await prisma.aRPaymentAllocation.deleteMany({ where: { farm_id: ORPHAN_FARM_ID } });
    console.log(`  - AR Allocations: ${arAllocations.count}`);

    const arTrans = await prisma.aRTransaction.deleteMany({ where: { farm_id: ORPHAN_FARM_ID } });
    console.log(`  - AR Transactions: ${arTrans.count}`);

    // AP data
    const apAllocations = await prisma.aPPaymentAllocation.deleteMany({ where: { farm_id: ORPHAN_FARM_ID } });
    console.log(`  - AP Allocations: ${apAllocations.count}`);

    const apTrans = await prisma.aPTransaction.deleteMany({ where: { farm_id: ORPHAN_FARM_ID } });
    console.log(`  - AP Transactions: ${apTrans.count}`);

    // Stock data
    const stockMovements = await prisma.stockMovement.deleteMany({ where: { farm_id: ORPHAN_FARM_ID } });
    console.log(`  - Stock Movements: ${stockMovements.count}`);

    // Transactions
    const transItems = await prisma.transactionItem.deleteMany({
        where: { transaction: { farm_id: ORPHAN_FARM_ID } },
    });
    console.log(`  - Transaction Items: ${transItems.count}`);

    const transactions = await prisma.transaction.deleteMany({ where: { farm_id: ORPHAN_FARM_ID } });
    console.log(`  - Transactions: ${transactions.count}`);

    // Partners
    const partners = await prisma.partner.deleteMany({ where: { farm_id: ORPHAN_FARM_ID } });
    console.log(`  - Partners: ${partners.count}`);

    // Products
    const products = await prisma.product.deleteMany({ where: { farm_id: ORPHAN_FARM_ID } });
    console.log(`  - Products: ${products.count}`);

    // Finally delete the farm
    const farm = await prisma.farm.delete({
        where: { id: ORPHAN_FARM_ID },
    });

    console.log(`\n✅ Deleted farm: ${farm.name} (${farm.id})`);

    // Verify remaining farms
    const remainingFarms = await prisma.farm.findMany({
        select: { id: true, name: true },
    });
    console.log('\n📋 Remaining farms:');
    remainingFarms.forEach((f) => console.log(`  - ${f.name}: ${f.id}`));
}

main()
    .catch((e) => {
        console.error('❌ Error:', e.message);
    })
    .finally(() => prisma.$disconnect());
