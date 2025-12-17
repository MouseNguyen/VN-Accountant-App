const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient();

    try {
        // Check partner balances (negative = we owe them)
        const partners = await prisma.partner.findMany({
            where: { balance: { lt: 0 } },
            select: { id: true, name: true, balance: true }
        });
        console.log('=== Partners with Negative Balance (We owe them) ===');
        console.log(JSON.stringify(partners, null, 2));

        // Get unpaid PURCHASE/EXPENSE transactions  
        const trans = await prisma.transaction.findMany({
            where: {
                trans_type: { in: ['PURCHASE', 'EXPENSE'] },
                payment_status: { not: 'PAID' }
            },
            select: {
                id: true,
                code: true,
                trans_type: true,
                payment_status: true,
                total_amount: true,
                paid_amount: true
            },
            take: 10
        });
        console.log('\n=== Unpaid PURCHASE/EXPENSE Transactions ===');
        console.log(JSON.stringify(trans, null, 2));

        // Get ALL AP transactions
        const allAPs = await prisma.aPTransaction.findMany({
            select: {
                code: true,
                type: true,
                status: true,
                amount: true,
                balance: true
            },
            orderBy: { trans_date: 'desc' },
            take: 20
        });
        console.log('\n=== ALL AP Transactions (last 20) ===');
        console.log(JSON.stringify(allAPs, null, 2));

    } finally {
        await prisma.$disconnect();
    }
}

main();
