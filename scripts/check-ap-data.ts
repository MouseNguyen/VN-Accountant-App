// scripts/check-ap-data.ts
// Check Accounts Payable data

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     CHECK ACCOUNTS PAYABLE (PHẢI TRẢ) DATA                   ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // Get EXPENSE transactions that are not fully paid
    const transactions = await prisma.transaction.findMany({
        where: {
            deleted_at: null,
            trans_type: 'EXPENSE',
            payment_status: { in: ['PENDING', 'PARTIAL', 'UNPAID'] },
        },
        include: {
            partner: { select: { id: true, code: true, name: true } },
        },
        orderBy: { trans_date: 'desc' },
    });

    console.log(`Found ${transactions.length} unpaid EXPENSE transactions:\n`);

    let total = 0;
    for (const t of transactions) {
        const remaining = Number(t.total_amount) - Number(t.paid_amount);
        total += remaining;
        console.log(`  ${t.code || t.trans_number}`);
        console.log(`    - Vendor: ${t.partner?.name || 'N/A'}`);
        console.log(`    - Total: ${Number(t.total_amount).toLocaleString()}đ`);
        console.log(`    - Paid: ${Number(t.paid_amount).toLocaleString()}đ`);
        console.log(`    - Remaining: ${remaining.toLocaleString()}đ`);
        console.log(`    - Status: ${t.payment_status}`);
        console.log('');
    }

    console.log('════════════════════════════════════════════════════════════════');
    console.log(`Total Payable: ${total.toLocaleString()}đ`);
    console.log('════════════════════════════════════════════════════════════════');

    // Also check if there are any with PAID status but paid_amount < total_amount
    console.log('\n═══ CHECK FOR INCONSISTENCIES ═══\n');

    const inconsistent = await prisma.transaction.findMany({
        where: {
            deleted_at: null,
            trans_type: 'EXPENSE',
        },
        select: {
            code: true,
            trans_number: true,
            total_amount: true,
            paid_amount: true,
            payment_status: true,
        },
    });

    let issues = 0;
    for (const t of inconsistent) {
        const total = Number(t.total_amount);
        const paid = Number(t.paid_amount);

        // Status should be PAID if paid >= total
        if (paid >= total && t.payment_status !== 'PAID') {
            console.log(`❌ ${t.code || t.trans_number}: paid=${paid}, total=${total}, status=${t.payment_status} (should be PAID)`);
            issues++;
        }
        // Status should NOT be PAID if paid < total
        if (paid < total && t.payment_status === 'PAID') {
            console.log(`❌ ${t.code || t.trans_number}: paid=${paid}, total=${total}, status=${t.payment_status} (should NOT be PAID)`);
            issues++;
        }
    }

    if (issues === 0) {
        console.log('✅ No payment status inconsistencies found');
    } else {
        console.log(`\n❌ Found ${issues} inconsistencies`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
