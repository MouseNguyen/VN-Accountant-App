// scripts/list-expenses.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     ALL EXPENSE TRANSACTIONS                                 ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const expenses = await prisma.transaction.findMany({
        where: { trans_type: 'EXPENSE', deleted_at: null },
        select: {
            code: true,
            trans_number: true,
            description: true,
            total_amount: true,
            paid_amount: true,
            payment_method: true,
            payment_status: true,
            trans_date: true,
        },
        orderBy: { trans_date: 'desc' },
    });

    let totalExpense = 0;
    let salaryTotal = 0;

    expenses.forEach(e => {
        const amt = Number(e.total_amount);
        totalExpense += amt;
        const isSalary = (e.code || '').includes('LUONG');
        if (isSalary) salaryTotal += amt;

        const status = e.payment_status === 'PAID' ? '✅ Paid' : '⏳ ' + e.payment_status;
        console.log(`${e.code || e.trans_number}: ${amt.toLocaleString()}đ`);
        console.log(`   ${e.description?.substring(0, 50) || 'N/A'}`);
        console.log(`   Method: ${e.payment_method} | Status: ${status}`);
        console.log('');
    });

    console.log('════════════════════════════════════════════════════════════════');
    console.log(`Total EXPENSE: ${totalExpense.toLocaleString()}đ`);
    console.log(`  - Salary (LUONG): ${salaryTotal.toLocaleString()}đ`);
    console.log(`  - Other: ${(totalExpense - salaryTotal).toLocaleString()}đ`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
