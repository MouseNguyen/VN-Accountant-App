// scripts/check-ar-data.ts
// Check Accounts Receivable data

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     CHECK ACCOUNTS RECEIVABLE (PHẢI THU) DATA                ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // Get INCOME transactions that are not fully paid
    console.log('═══ FROM TRANSACTION TABLE ═══\n');
    const transactions = await prisma.transaction.findMany({
        where: {
            deleted_at: null,
            trans_type: 'INCOME',
            payment_status: { in: ['PENDING', 'PARTIAL', 'UNPAID'] },
        },
        include: {
            partner: { select: { id: true, code: true, name: true } },
        },
        orderBy: { trans_date: 'desc' },
    });

    console.log(`Found ${transactions.length} unpaid INCOME transactions:\n`);

    let total = 0;
    for (const t of transactions) {
        const remaining = Number(t.total_amount) - Number(t.paid_amount);
        total += remaining;
        console.log(`  ${t.code || t.trans_number}`);
        console.log(`    - Customer: ${t.partner?.name || 'N/A'}`);
        console.log(`    - Total: ${Number(t.total_amount).toLocaleString()}đ`);
        console.log(`    - Paid: ${Number(t.paid_amount).toLocaleString()}đ`);
        console.log(`    - Remaining: ${remaining.toLocaleString()}đ`);
        console.log(`    - Status: ${t.payment_status}`);
        console.log('');
    }

    console.log('════════════════════════════════════════════════════════════════');
    console.log(`Total Receivable (from Transaction): ${total.toLocaleString()}đ`);
    console.log('════════════════════════════════════════════════════════════════');

    // Check legacy AR table
    console.log('\n═══ FROM LEGACY AR_TRANSACTIONS TABLE ═══\n');

    const arTransactions = await prisma.aRTransaction.findMany({
        where: {
            deleted_at: null,
            status: { in: ['UNPAID', 'PARTIAL'] },
        },
        include: {
            customer: { select: { code: true, name: true } },
        },
    });

    console.log(`Found ${arTransactions.length} unpaid legacy AR transactions:\n`);

    let legacyTotal = 0;
    for (const ar of arTransactions) {
        const balance = Number(ar.amount) - Number(ar.paid_amount);
        legacyTotal += balance;
        console.log(`  ${ar.code}: ${ar.customer?.name || 'N/A'} - Balance: ${balance.toLocaleString()}đ`);
    }

    console.log(`\nTotal from Legacy AR: ${legacyTotal.toLocaleString()}đ`);

    // Compare
    console.log('\n════════════════════════════════════════════════════════════════');
    if (total !== legacyTotal) {
        console.log('❌ MISMATCH DETECTED!');
        console.log(`   Transaction table: ${total.toLocaleString()}đ`);
        console.log(`   Legacy AR table:   ${legacyTotal.toLocaleString()}đ`);
        console.log('   → Báo cáo should use Transaction table, NOT legacy AR!');
    } else {
        console.log('✅ Values match');
    }
    console.log('════════════════════════════════════════════════════════════════');
}

main().catch(console.error).finally(() => prisma.$disconnect());
