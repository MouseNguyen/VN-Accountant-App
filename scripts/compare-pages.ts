// scripts/compare-pages.ts
const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient();

    try {
        const startDate = new Date('2025-01-01');
        const endDate = new Date('2025-12-31');

        console.log('=== COMPARING GIAO DỊCH vs BÁO CÁO ===\n');
        console.log('Date range: 2025-01-01 to 2025-12-31 (Năm nay)\n');

        // Get transactions by type
        const transactions = await prisma.transaction.findMany({
            where: { trans_date: { gte: startDate, lte: endDate }, deleted_at: null },
            select: { code: true, trans_type: true, total_amount: true }
        });

        // Group by type
        const byType: Record<string, number> = {};
        transactions.forEach(t => {
            byType[t.trans_type] = (byType[t.trans_type] || 0) + Number(t.total_amount);
        });

        console.log('=== TRANSACTION BY TYPE ===');
        Object.entries(byType).forEach(([type, amount]) => {
            console.log(`${type}: ${amount.toLocaleString()} đ`);
        });

        // Giao dịch page "Mua hàng" filter
        const purchase = byType['PURCHASE'] || 0;
        console.log('\n=== GIAO DỊCH PAGE ===');
        console.log(`"Mua hàng" filter (PURCHASE only): ${purchase.toLocaleString()} đ`);

        // Báo cáo page uses incomeExpenseData
        // total_expense = all expense types (EXPENSE + PURCHASE + CASH_OUT)
        const expense = byType['EXPENSE'] || 0;
        const cashOut = byType['CASH_OUT'] || 0;
        const totalExpense = purchase + expense + cashOut;

        console.log('\n=== BÁO CÁO PAGE ===');
        console.log(`PURCHASE: ${purchase.toLocaleString()} đ`);
        console.log(`EXPENSE: ${expense.toLocaleString()} đ`);
        console.log(`CASH_OUT: ${(cashOut).toLocaleString()} đ`);
        console.log(`Chi phí/Mua hàng (PURCHASE + EXPENSE + CASH_OUT): ${totalExpense.toLocaleString()} đ`);

        // List EXPENSE transactions
        console.log('\n=== EXPENSE TRANSACTIONS (included in Báo cáo but not in Giao dịch "Mua hàng") ===');
        const expenseTransactions = transactions.filter(t => t.trans_type === 'EXPENSE');
        expenseTransactions.forEach(t => {
            console.log(`  ${t.code}: ${Number(t.total_amount).toLocaleString()} đ`);
        });
        console.log(`  TOTAL: ${expense.toLocaleString()} đ`);

        console.log('\n=== EXPLANATION ===');
        console.log(`Giao dịch "Mua hàng" shows only PURCHASE = ${purchase.toLocaleString()} đ`);
        console.log(`Báo cáo "Chi phí" includes PURCHASE + EXPENSE = ${totalExpense.toLocaleString()} đ`);
        console.log(`Difference: ${(totalExpense - purchase).toLocaleString()} đ (the EXPENSE transactions)`);

    } finally {
        await prisma.$disconnect();
    }
}

main();
