// scripts/debug-ap-types.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('=== AP RECORDS BY TYPE ===\n');

    // INVOICE type - should have balance = amount - paid
    console.log('--- INVOICES (should have balance = amt - paid) ---');
    const invoices = await prisma.aPTransaction.findMany({
        where: { type: 'INVOICE' },
        take: 5
    });

    for (const ap of invoices) {
        const expected = Number(ap.amount) - Number(ap.paid_amount);
        const actual = Number(ap.balance);
        const match = Math.abs(expected - actual) < 1 ? '✅' : '❌';
        console.log(`${ap.code}: amt=${ap.amount}, paid=${ap.paid_amount}, balance=${ap.balance}, expected=${expected} ${match}`);
    }

    // PAYMENT type - should have balance = 0
    console.log('\n--- PAYMENTS (should have balance = 0) ---');
    const payments = await prisma.aPTransaction.findMany({
        where: { type: 'PAYMENT' },
        take: 5
    });

    for (const ap of payments) {
        const match = Number(ap.balance) === 0 ? '✅' : '❌';
        console.log(`${ap.code}: amt=${ap.amount}, balance=${ap.balance} ${match}`);
    }

    console.log('\n--- COUNTS ---');
    const invCount = await prisma.aPTransaction.count({ where: { type: 'INVOICE' } });
    const payCount = await prisma.aPTransaction.count({ where: { type: 'PAYMENT' } });
    console.log(`INVOICE: ${invCount}, PAYMENT: ${payCount}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
