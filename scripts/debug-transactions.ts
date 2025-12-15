// scripts/debug-transactions.ts
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
    const t = await p.transaction.findMany({
        where: {
            deleted_at: null,
            OR: [
                { vat_amount: { gt: 0 } },
                { tax_amount: { gt: 0 } }
            ]
        },
        select: {
            id: true,
            code: true,
            trans_type: true,
            trans_date: true,
            vat_amount: true,
            tax_amount: true,
            subtotal: true,
            amount: true,
        }
    });
    console.log('Transactions with tax/vat > 0:');
    console.log(JSON.stringify(t, null, 2));
}

main().catch(console.error).finally(() => p.$disconnect());
