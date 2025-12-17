const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient();

    try {
        // Last 30 days filter (matching UI default)
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);

        console.log('=== VERIFICATION OF BAO CAO PAGE (Last 30 Days) ===');
        console.log(`Date Range: ${thirtyDaysAgo.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}\n`);

        // 1. Chi phí (EXPENSE transactions in last 30 days)
        const expenses = await prisma.transaction.aggregate({
            where: {
                trans_type: 'EXPENSE',
                trans_date: { gte: thirtyDaysAgo, lte: today },
                deleted_at: null
            },
            _sum: { total_amount: true }
        });
        console.log('1. CHI PHÍ (EXPENSE, last 30 days):',
            expenses._sum.total_amount ? Number(expenses._sum.total_amount).toLocaleString() : 0);

        // 2. Mua hàng (PURCHASE transactions in last 30 days)
        const purchases = await prisma.transaction.aggregate({
            where: {
                trans_type: 'PURCHASE',
                trans_date: { gte: thirtyDaysAgo, lte: today },
                deleted_at: null
            },
            _sum: { total_amount: true }
        });
        console.log('2. MUA HÀNG (PURCHASE, last 30 days):',
            purchases._sum.total_amount ? Number(purchases._sum.total_amount).toLocaleString() : 0);

        // 3. Doanh thu (SALE transactions in last 30 days)
        const sales = await prisma.transaction.aggregate({
            where: {
                trans_type: 'SALE',
                trans_date: { gte: thirtyDaysAgo, lte: today },
                deleted_at: null
            },
            _sum: { total_amount: true }
        });
        console.log('3. BÁN HÀNG (SALE, last 30 days):',
            sales._sum.total_amount ? Number(sales._sum.total_amount).toLocaleString() : 0);

        // 4. INCOME (last 30 days)
        const income = await prisma.transaction.aggregate({
            where: {
                trans_type: 'INCOME',
                trans_date: { gte: thirtyDaysAgo, lte: today },
                deleted_at: null
            },
            _sum: { total_amount: true }
        });
        console.log('4. THU NHẬP (INCOME, last 30 days):',
            income._sum.total_amount ? Number(income._sum.total_amount).toLocaleString() : 0);

        // 5. Phải trả (AP balance - this is current, not date-filtered)
        const apBalance = await prisma.aPTransaction.aggregate({
            where: {
                type: 'INVOICE',
                balance: { gt: 0 },
                deleted_at: null
            },
            _sum: { balance: true }
        });
        console.log('\n5. PHẢI TRẢ (AP current balance):',
            apBalance._sum.balance ? Number(apBalance._sum.balance).toLocaleString() : 0);

        // 6. Phải thu (AR balance - current)
        const arBalance = await prisma.aRTransaction.aggregate({
            where: {
                type: 'INVOICE',
                balance: { gt: 0 },
                deleted_at: null
            },
            _sum: { balance: true }
        });
        console.log('6. PHẢI THU (AR current balance):',
            arBalance._sum.balance ? Number(arBalance._sum.balance).toLocaleString() : 0);

        // 7. List transactions in last 30 days
        console.log('\n=== TRANSACTIONS IN LAST 30 DAYS ===');
        const recentTrans = await prisma.transaction.findMany({
            where: {
                trans_date: { gte: thirtyDaysAgo, lte: today },
                deleted_at: null
            },
            select: { code: true, trans_type: true, trans_date: true, total_amount: true },
            orderBy: { trans_date: 'desc' },
            take: 20
        });
        recentTrans.forEach(t => {
            console.log(`   ${t.code}: ${t.trans_type} - ${Number(t.total_amount).toLocaleString()} (${t.trans_date.toISOString().split('T')[0]})`);
        });

    } finally {
        await prisma.$disconnect();
    }
}

main();
