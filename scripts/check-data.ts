// scripts/check-data.ts
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
    console.log('=== TRANSACTIONS ===');
    const transactions = await p.transaction.findMany({
        take: 10,
        orderBy: { trans_date: 'desc' },
        select: {
            trans_number: true,
            trans_type: true,
            trans_date: true,
            total_amount: true,
            farm_id: true,
        }
    });
    console.table(transactions.map(t => ({
        code: t.trans_number,
        type: t.trans_type,
        date: t.trans_date.toISOString().split('T')[0],
        amount: Number(t.total_amount),
        farm: t.farm_id?.substring(0, 8),
    })));

    console.log('\n=== FARMS ===');
    const farms = await p.farm.findMany();
    console.table(farms.map(f => ({ id: f.id, name: f.name })));

    console.log('\n=== USERS + FARM ===');
    const users = await p.user.findMany({ include: { farm: { select: { name: true } } } });
    console.table(users.map(u => ({ email: u.email, farm: u.farm?.name })));
}

main().catch(console.error).finally(() => p.$disconnect());
