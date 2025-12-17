const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient();

    try {
        const farmId = 'test-farm-001';

        console.log('=== CHI PHÍ WITH FARM_ID FILTER ===\n');

        // Get all EXPENSE transactions WITHOUT product items (pure operating expenses)
        const opExpenseTransactions = await prisma.transaction.findMany({
            where: {
                farm_id: farmId,
                trans_type: 'EXPENSE',
                deleted_at: null,
                items: { none: { product_id: { not: null } } },
            },
            select: { id: true, code: true, total_amount: true, description: true },
        });

        console.log('EXPENSE transactions WITHOUT product items (farm: test-farm-001):');
        let opTotal = 0;
        opExpenseTransactions.forEach(t => {
            const amount = Number(t.total_amount);
            opTotal += amount;
            console.log(`  ${t.code}: ${amount.toLocaleString()} - ${t.description || '(no desc)'}`);
        });
        console.log(`Total Operating Expenses: ${opTotal.toLocaleString()}\n`);

        // Exclude payment transactions (PC-* codes)
        const realExpenses = opExpenseTransactions.filter(t => !t.code.startsWith('PC-'));
        const paymentTrans = opExpenseTransactions.filter(t => t.code.startsWith('PC-'));

        console.log('=== BREAKDOWN ===');
        console.log('Real Operating Expenses (CP-*):');
        let realTotal = 0;
        realExpenses.forEach(t => {
            const amount = Number(t.total_amount);
            realTotal += amount;
            console.log(`  ${t.code}: ${amount.toLocaleString()}`);
        });
        console.log(`Subtotal: ${realTotal.toLocaleString()}\n`);

        console.log('Payment Transactions (PC-*) - should NOT be counted:');
        let paymentTotal = 0;
        paymentTrans.forEach(t => {
            const amount = Number(t.total_amount);
            paymentTotal += amount;
            console.log(`  ${t.code}: ${amount.toLocaleString()}`);
        });
        console.log(`Subtotal: ${paymentTotal.toLocaleString()}\n`);

        console.log('=== EXPECTED CHI PHI ===');
        console.log(`If we exclude payments: ${realTotal.toLocaleString()}`);

    } finally {
        await prisma.$disconnect();
    }
}

main();
