import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Check payroll records
    const payrolls = await prisma.payroll.findMany({
        orderBy: { period_start: 'desc' },
    });

    console.log('=== PAYROLL RECORDS ===');
    console.log(`Total: ${payrolls.length} records\n`);

    let totalPayroll = 0;
    for (const pay of payrolls) {
        console.log(`Period: ${pay.period_start.toISOString().split('T')[0]} - ${pay.period_end.toISOString().split('T')[0]}`);
        console.log(`  Status: ${pay.status}`);
        console.log(`  Total Net: ${Number(pay.total_net).toLocaleString()}đ`);
        console.log('');
        if (pay.status === 'CONFIRMED' || pay.status === 'PAID') {
            totalPayroll += Number(pay.total_net);
        }
    }

    console.log(`Total Payroll Confirmed/Paid: ${totalPayroll.toLocaleString()}đ\n`);

    // Check expense transactions to see if payroll creates expense
    console.log('=== EXPENSE TRANSACTIONS ===');
    const expenses = await prisma.transaction.findMany({
        where: {
            trans_type: 'EXPENSE',
            deleted_at: null,
        },
        select: {
            code: true,
            trans_number: true,
            description: true,
            total_amount: true,
            partner_name: true,
        },
        orderBy: { trans_date: 'desc' },
        take: 15,
    });

    let totalExpense = 0;
    expenses.forEach(e => {
        const amt = Number(e.total_amount);
        totalExpense += amt;
        console.log(`${e.code || e.trans_number}: ${amt.toLocaleString()}đ - ${e.description || e.partner_name || 'N/A'}`);
    });

    console.log(`\nTotal from EXPENSE transactions: ${totalExpense.toLocaleString()}đ`);
    console.log('\n=== ANALYSIS ===');
    console.log(`If payroll is NOT in expenses, it should be added separately to reports`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
