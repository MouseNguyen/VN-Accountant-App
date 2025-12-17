const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient();

    try {
        // All time data (since 2020)
        const startDate = new Date('2020-01-01');
        const endDate = new Date('2025-12-31');

        console.log('=== INCOME EXPENSE ALL TIME ===\n');

        // Get all transactions
        const transactions = await prisma.transaction.findMany({
            where: {
                trans_date: { gte: startDate, lte: endDate },
                deleted_at: null
            },
            select: {
                trans_type: true,
                total_amount: true,
                trans_date: true
            }
        });

        console.log(`Total transactions found: ${transactions.length}`);

        // Calculate by type
        const byType = {};
        let totalIncome = 0;
        let totalExpense = 0;

        const INCOME_TYPES = ['INCOME', 'SALE', 'CASH_IN'];
        const EXPENSE_TYPES = ['EXPENSE', 'PURCHASE', 'CASH_OUT'];

        transactions.forEach(t => {
            const type = t.trans_type;
            const amount = Number(t.total_amount);

            byType[type] = (byType[type] || 0) + amount;

            if (INCOME_TYPES.includes(type)) {
                totalIncome += amount;
            }
            if (EXPENSE_TYPES.includes(type)) {
                totalExpense += amount;
            }
        });

        console.log('\nBy transaction type:');
        Object.entries(byType).forEach(([type, amount]) => {
            console.log(`  ${type}: ${amount.toLocaleString()}`);
        });

        console.log('\n=== SUMMARY ===');
        console.log(`Total Income (INCOME+SALE+CASH_IN): ${totalIncome.toLocaleString()}`);
        console.log(`Total Expense (EXPENSE+PURCHASE+CASH_OUT): ${totalExpense.toLocaleString()}`);
        console.log(`Net: ${(totalIncome - totalExpense).toLocaleString()}`);

        // Check for "Hôm nay" filter
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayTrans = await prisma.transaction.findMany({
            where: {
                trans_date: { gte: today, lt: tomorrow },
                deleted_at: null
            },
            select: { trans_type: true, total_amount: true }
        });

        console.log(`\n=== TODAY (${today.toISOString().split('T')[0]}) ===`);
        console.log(`Transactions today: ${todayTrans.length}`);

        let todayIncome = 0, todayExpense = 0;
        todayTrans.forEach(t => {
            const amount = Number(t.total_amount);
            if (INCOME_TYPES.includes(t.trans_type)) todayIncome += amount;
            if (EXPENSE_TYPES.includes(t.trans_type)) todayExpense += amount;
        });
        console.log(`Today Income: ${todayIncome.toLocaleString()}`);
        console.log(`Today Expense: ${todayExpense.toLocaleString()}`);

    } finally {
        await prisma.$disconnect();
    }
}

main();
