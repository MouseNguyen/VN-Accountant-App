// scripts/debug-phase2-issues.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('=== DEBUG PHASE 2 ISSUES ===\n');

    // Issue 1: AP Balance mismatch
    console.log('--- AP TRANSACTIONS ---');
    const apRecords = await prisma.aPTransaction.findMany({ take: 10 });

    if (apRecords.length === 0) {
        console.log('No AP records found.');
    } else {
        for (const ap of apRecords) {
            const expected = Number(ap.amount) - Number(ap.paid_amount);
            const actual = Number(ap.balance);
            const match = Math.abs(expected - actual) < 1 ? '✅' : '❌';
            console.log(`${ap.code}: amt=${ap.amount}, paid=${ap.paid_amount}, balance=${ap.balance}, expected=${expected} ${match}`);
        }
    }

    // Issue 2: PaymentHistory
    console.log('\n--- PAYMENT HISTORY ---');
    const paymentCount = await prisma.paymentHistory.count();
    console.log(`PaymentHistory records: ${paymentCount}`);

    if (paymentCount > 0) {
        const samples = await prisma.paymentHistory.findMany({ take: 5 });
        samples.forEach(p => console.log(`  ${p.id.substring(0, 8)}... amount=${p.amount}`));
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
