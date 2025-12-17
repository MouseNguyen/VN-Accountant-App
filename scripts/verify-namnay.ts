const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient();

    try {
        // This Year 2025 filter
        const startDate = new Date('2025-01-01');
        const endDate = new Date('2025-12-31');
        endDate.setHours(23, 59, 59, 999);

        console.log('=== VERIFICATION FOR "NĂM NAY" (2025) ===\n');
        console.log(`Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\n`);

        // 1. Chi phí (EXPENSE transactions - all)
        const expenses = await prisma.transaction.findMany({
            where: {
                trans_type: 'EXPENSE',
                trans_date: { gte: startDate, lte: endDate },
                deleted_at: null
            },
            select: { code: true, total_amount: true }
        });

        let expTotal = 0;
        console.log('1. CHI PHÍ (EXPENSE transactions in 2025):');
        expenses.forEach(t => {
            const amt = Number(t.total_amount);
            expTotal += amt;
            console.log(`   ${t.code}: ${amt.toLocaleString()}`);
        });
        console.log(`   TOTAL: ${expTotal.toLocaleString()}\n`);

        // 2. Mua hàng (PURCHASE + EXPENSE = all expense types)
        const purchases = await prisma.transaction.findMany({
            where: {
                trans_type: 'PURCHASE',
                trans_date: { gte: startDate, lte: endDate },
                deleted_at: null
            },
            select: { code: true, total_amount: true }
        });

        let purchaseTotal = 0;
        console.log('2. MUA HÀNG (PURCHASE transactions in 2025):');
        purchases.forEach(t => {
            const amt = Number(t.total_amount);
            purchaseTotal += amt;
            console.log(`   ${t.code}: ${amt.toLocaleString()}`);
        });
        console.log(`   PURCHASE TOTAL: ${purchaseTotal.toLocaleString()}`);
        console.log(`   Combined (EXPENSE + PURCHASE): ${(expTotal + purchaseTotal).toLocaleString()}\n`);

        // 3. Phải trả (AP balance > 0)
        const apBalance = await prisma.aPTransaction.aggregate({
            where: {
                type: 'INVOICE',
                balance: { gt: 0 },
                deleted_at: null
            },
            _sum: { balance: true }
        });
        console.log('3. PHẢI TRẢ (AP current balance):',
            apBalance._sum.balance ? Number(apBalance._sum.balance).toLocaleString() : 0);

        // List individual AP invoices
        const apInvoices = await prisma.aPTransaction.findMany({
            where: { type: 'INVOICE', balance: { gt: 0 }, deleted_at: null },
            select: { code: true, balance: true }
        });
        apInvoices.forEach(ap => {
            console.log(`   ${ap.code}: ${Number(ap.balance).toLocaleString()}`);
        });

        console.log('\n=== VERIFICATION SUMMARY ===');
        console.log(`Chi phí (EXPENSE): ${expTotal.toLocaleString()} - UI shows: 36,882,000`);
        console.log(`Mua hàng (EXPENSE+PURCHASE): ${(expTotal + purchaseTotal).toLocaleString()} - UI shows: 94,632,000`);
        console.log(`Phải trả (AP balance): ${apBalance._sum.balance ? Number(apBalance._sum.balance).toLocaleString() : 0} - UI shows: ~2,400,000`);

    } finally {
        await prisma.$disconnect();
    }
}

main();
