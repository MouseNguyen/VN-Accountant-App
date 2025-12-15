// scripts/cleanup-legacy-ar-ap.ts
// Remove legacy AR/AP data - they are no longer needed

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     CLEANUP LEGACY AR/AP TABLES                              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const now = new Date();

    // Soft-delete all AR transactions
    const arResult = await prisma.aRTransaction.updateMany({
        where: { deleted_at: null },
        data: { deleted_at: now },
    });
    console.log(`✅ Soft-deleted ${arResult.count} ar_transactions records`);

    // Soft-delete all AP transactions
    const apResult = await prisma.aPTransaction.updateMany({
        where: { deleted_at: null },
        data: { deleted_at: now },
    });
    console.log(`✅ Soft-deleted ${apResult.count} ap_transactions records`);

    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('DONE! Legacy tables have been cleaned up.');
    console.log('');
    console.log('The Transaction table is now the ONLY source of truth.');
    console.log('════════════════════════════════════════════════════════════════');
}

main().catch(console.error).finally(() => prisma.$disconnect());
