// scripts/debug-all-expense.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('\n=== ALL EXPENSE TRANSACTIONS ===\n');

    const all = await prisma.transaction.findMany({
        where: {
            trans_type: 'EXPENSE',
            deleted_at: null,
        },
        orderBy: { created_at: 'desc' },
        take: 20,
        select: {
            id: true,
            code: true,
            trans_type: true,
            payment_status: true,
            total_amount: true,
            paid_amount: true,
            description: true,
            partner: { select: { name: true, partner_type: true } }
        }
    });

    console.log(`Found ${all.length} EXPENSE transactions:\n`);
    all.forEach(t => {
        const balance = Number(t.total_amount) - Number(t.paid_amount);
        console.log(`${t.code}: ${Number(t.total_amount).toLocaleString()}đ | Balance: ${balance.toLocaleString()}đ | Status: ${t.payment_status}`);
        console.log(`   Partner: ${t.partner?.name || 'N/A'} (${t.partner?.partner_type})`);
        console.log(`   Description: ${t.description || 'N/A'}`);
        console.log('');
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
