import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const txs = await prisma.transaction.findMany({
        where: { deleted_at: null },
        select: {
            code: true,
            trans_type: true,
            payment_status: true,
            total_amount: true,
        },
        orderBy: { trans_type: 'asc' },
    });

    console.log('\n=== ALL TRANSACTIONS ===\n');
    console.log('Code\t\tType\t\tStatus\t\tAmount');
    console.log('─'.repeat(60));

    let incomeTotal = 0;
    let expenseTotal = 0;
    let cashInTotal = 0;
    let cashOutTotal = 0;
    let incomePaidTotal = 0;
    let cashInPaidTotal = 0;

    for (const t of txs) {
        const amount = Number(t.total_amount);
        console.log(`${t.code}\t\t${t.trans_type}\t\t${t.payment_status}\t\t${amount.toLocaleString()}`);

        if (t.trans_type === 'INCOME') {
            incomeTotal += amount;
            if (t.payment_status === 'PAID') incomePaidTotal += amount;
        }
        if (t.trans_type === 'EXPENSE') expenseTotal += amount;
        if (t.trans_type === 'CASH_IN') {
            cashInTotal += amount;
            if (t.payment_status === 'PAID') cashInPaidTotal += amount;
        }
        if (t.trans_type === 'CASH_OUT') cashOutTotal += amount;
    }

    console.log('\n=== SUMMARY ===\n');
    console.log(`INCOME total: ${incomeTotal.toLocaleString()}`);
    console.log(`INCOME PAID only: ${incomePaidTotal.toLocaleString()}`);
    console.log(`EXPENSE total: ${expenseTotal.toLocaleString()}`);
    console.log(`CASH_IN total: ${cashInTotal.toLocaleString()}`);
    console.log(`CASH_IN PAID only: ${cashInPaidTotal.toLocaleString()}`);
    console.log(`CASH_OUT total: ${cashOutTotal.toLocaleString()}`);
    console.log('\n');
    console.log(`Tổng thu (INCOME + CASH_IN): ${(incomeTotal + cashInTotal).toLocaleString()}`);
    console.log(`Tổng thu PAID only: ${(incomePaidTotal + cashInPaidTotal).toLocaleString()}`);
    console.log(`Tổng chi (EXPENSE + CASH_OUT): ${(expenseTotal + cashOutTotal).toLocaleString()}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
