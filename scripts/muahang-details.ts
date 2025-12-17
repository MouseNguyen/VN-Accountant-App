const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient();

    try {
        console.log('=== MUA HÀNG (94,632,000 đ) BREAKDOWN ===\n');
        console.log('Mua hàng = EXPENSE + PURCHASE transactions\n');

        // EXPENSE transactions
        const expenses = await prisma.transaction.findMany({
            where: {
                trans_type: 'EXPENSE',
                deleted_at: null
            },
            select: {
                code: true,
                description: true,
                total_amount: true,
                trans_date: true,
                partner: { select: { name: true } },
                items: {
                    select: {
                        product: { select: { name: true } },
                        quantity: true,
                        unit_price: true
                    }
                }
            },
            orderBy: { trans_date: 'asc' }
        });

        console.log('=== 1. EXPENSE (Chi phí) ===');
        let expTotal = 0;
        expenses.forEach(t => {
            const amt = Number(t.total_amount);
            expTotal += amt;
            console.log(`${t.code} | ${t.trans_date.toISOString().split('T')[0]} | ${amt.toLocaleString()} đ | ${t.description || t.partner?.name || 'Chi phí'}`);
        });
        console.log(`TỔNG EXPENSE: ${expTotal.toLocaleString()} đ\n`);

        // PURCHASE transactions
        const purchases = await prisma.transaction.findMany({
            where: {
                trans_type: 'PURCHASE',
                deleted_at: null
            },
            select: {
                code: true,
                description: true,
                total_amount: true,
                trans_date: true,
                partner: { select: { name: true } },
                items: {
                    select: {
                        product: { select: { name: true } },
                        quantity: true,
                        unit_price: true
                    }
                }
            },
            orderBy: { trans_date: 'asc' }
        });

        console.log('=== 2. PURCHASE (Mua hàng nhập kho) ===');
        let purchaseTotal = 0;
        purchases.forEach(t => {
            const amt = Number(t.total_amount);
            purchaseTotal += amt;
            console.log(`\n${t.code} | ${t.trans_date.toISOString().split('T')[0]} | ${amt.toLocaleString()} đ`);
            console.log(`  NCC: ${t.partner?.name || 'N/A'}`);
            if (t.items && t.items.length > 0) {
                console.log('  Sản phẩm:');
                t.items.forEach(item => {
                    console.log(`    - ${item.product?.name || 'N/A'}: ${Number(item.quantity)} x ${Number(item.unit_price).toLocaleString()} đ`);
                });
            }
        });
        console.log(`\nTỔNG PURCHASE: ${purchaseTotal.toLocaleString()} đ\n`);

        console.log('=== TỔNG CỘNG ===');
        console.log(`EXPENSE:  ${expTotal.toLocaleString()} đ`);
        console.log(`PURCHASE: ${purchaseTotal.toLocaleString()} đ`);
        console.log(`TOTAL:    ${(expTotal + purchaseTotal).toLocaleString()} đ`);

    } finally {
        await prisma.$disconnect();
    }
}

main();
