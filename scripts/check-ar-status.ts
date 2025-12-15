// scripts/check-ar-status.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({
        where: { email: 'test@test.com' },
    });

    if (!user?.farm_id) {
        console.log('No user farm found');
        return;
    }

    console.log('📋 AR TRANSACTION STATUS\n');

    const items = await prisma.aRTransaction.findMany({
        where: { farm_id: user.farm_id },
        include: { customer: { select: { name: true, code: true } } },
        orderBy: [{ type: 'asc' }, { trans_date: 'asc' }],
    });

    // Group by type
    const invoices = items.filter((i) => i.type === 'INVOICE');
    const payments = items.filter((i) => i.type === 'PAYMENT');

    console.log('📄 INVOICES:');
    for (const inv of invoices) {
        console.log(
            `  ${inv.code} | ${inv.customer?.name} | Amount: ${Number(inv.amount).toLocaleString()}đ | Paid: ${Number(inv.paid_amount).toLocaleString()}đ | Balance: ${Number(inv.balance).toLocaleString()}đ | Status: ${inv.status}`
        );
    }

    console.log('\n💵 PAYMENTS:');
    for (const pay of payments) {
        console.log(
            `  ${pay.code} | ${pay.customer?.name} | Amount: ${Number(pay.amount).toLocaleString()}đ | ${pay.description}`
        );
    }

    // Summary
    const totalReceivable = invoices.reduce((sum, i) => sum + Number(i.balance), 0);
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    console.log('\n📊 SUMMARY:');
    console.log(`  Total Receivable: ${totalReceivable.toLocaleString()}đ`);
    console.log(`  Total Collected: ${totalPaid.toLocaleString()}đ`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
