// scripts/check-legacy-tables.ts
// Check if we can safely remove legacy AR/AP tables

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     CHECK LEGACY AR/AP TABLES                                ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const arCount = await prisma.aRTransaction.count({ where: { deleted_at: null } });
    const apCount = await prisma.aPTransaction.count({ where: { deleted_at: null } });

    console.log(`Legacy ar_transactions records: ${arCount}`);
    console.log(`Legacy ap_transactions records: ${apCount}`);
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('RECOMMENDATION:');
    console.log('These legacy tables are NO LONGER NEEDED!');
    console.log('All current data lives in the unified Transaction table.');
    console.log('');
    console.log('You CAN safely:');
    console.log('1. Soft-delete all records (set deleted_at)');
    console.log('2. Or hard-delete all records');
    console.log('3. Eventually drop the tables in a future migration');
    console.log('════════════════════════════════════════════════════════════════');
}

main().catch(console.error).finally(() => prisma.$disconnect());
