// scripts/debug-schedule.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('\n=== DEBUG PAYMENT SCHEDULE ===\n');

    // Get all EXPENSE transactions with unpaid status
    const transactions = await prisma.transaction.findMany({
        where: {
            trans_type: 'EXPENSE',
            payment_status: { in: ['PENDING', 'PARTIAL', 'UNPAID'] },
            deleted_at: null,
        },
        include: {
            partner: { select: { id: true, name: true, payment_term_days: true } },
        },
        orderBy: { trans_date: 'asc' },
    });

    console.log(`Found ${transactions.length} EXPENSE unpaid transactions:`);

    transactions.forEach(t => {
        const balance = Number(t.total_amount) - Number(t.paid_amount);
        const paymentTermDays = t.partner?.payment_term_days || 30;
        const dueDate = new Date(t.trans_date);
        dueDate.setDate(dueDate.getDate() + paymentTermDays);

        console.log(`\n  Code: ${t.code}`);
        console.log(`  Partner: ${t.partner?.name} (term: ${paymentTermDays} days)`);
        console.log(`  Trans Date: ${t.trans_date.toISOString()}`);
        console.log(`  Due Date: ${dueDate.toISOString()}`);
        console.log(`  Total: ${Number(t.total_amount).toLocaleString()}đ`);
        console.log(`  Paid: ${Number(t.paid_amount).toLocaleString()}đ`);
        console.log(`  Balance: ${balance.toLocaleString()}đ`);
        console.log(`  Status: ${t.payment_status}`);
        console.log(`  Farm ID: ${t.farm_id}`);
    });

    // List farm IDs
    const farms = await prisma.farm.findMany({ select: { id: true, name: true } });
    console.log('\n\nFarms:', farms);
}

main().catch(console.error).finally(() => prisma.$disconnect());
