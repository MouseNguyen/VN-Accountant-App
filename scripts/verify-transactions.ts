// scripts/verify-transactions.ts
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
    const farmId = '6a1cdfc3-7a55-43a7-9e96-21eb7be5ac7a';

    const transactions = await p.transaction.findMany({
        where: { farm_id: farmId },
        orderBy: { trans_date: 'desc' }
    });

    let income = 0, expense = 0;
    console.log('All Transactions:\n');
    for (const t of transactions) {
        const amt = Number(t.amount);
        if (t.trans_type === 'INCOME') income += amt;
        else expense += amt;
        console.log(`  ${t.trans_type.padEnd(8)} ${amt.toLocaleString().padStart(12)}đ - ${t.description}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('INCOME:  ', income.toLocaleString() + 'đ');
    console.log('EXPENSE: ', expense.toLocaleString() + 'đ');
    console.log('PROFIT:  ', (income - expense).toLocaleString() + 'đ');
}
main().finally(() => p.$disconnect());
