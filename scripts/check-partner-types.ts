// scripts/check-partner-types.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Check CoopMart partner_type
    const coopmart = await prisma.partner.findFirst({
        where: { name: { contains: 'CoopMart' } }
    });
    console.log('CoopMart partner:', JSON.stringify(coopmart, null, 2));

    // Check all partners with EXPENSE transactions
    const expensePartners = await prisma.transaction.findMany({
        where: { trans_type: 'EXPENSE', deleted_at: null },
        select: {
            code: true,
            partner: { select: { id: true, name: true, partner_type: true } }
        },
        distinct: ['partner_id']
    });
    console.log('\nPartners with EXPENSE transactions:');
    expensePartners.forEach(t => {
        console.log(`  - ${t.partner?.name}: partner_type = ${t.partner?.partner_type}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
