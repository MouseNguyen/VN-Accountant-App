const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
    const trans = await p.transaction.findMany({
        where: {
            trans_type: { in: ['EXPENSE', 'PURCHASE'] },
            deleted_at: null
        },
        select: {
            code: true,
            trans_type: true,
            expense_type: true,
            vat_deductible: true,
            total_amount: true,
            tax_amount: true,
        },
        orderBy: { created_at: 'desc' },
        take: 5
    });

    console.log('=== Latest EXPENSE/PURCHASE Transactions ===');
    trans.forEach(t => {
        console.log(`${t.code}: ${t.trans_type} | expense=${t.expense_type} | vat_deductible=${t.vat_deductible} | amt=${Number(t.total_amount)}`);
    });

    await p.$disconnect();
}

check();
