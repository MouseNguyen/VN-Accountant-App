// scripts/check-partner-balance.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     CHECK PARTNER BALANCES                                   ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // Get partners from database
    const partners = await prisma.partner.findMany({
        where: { deleted_at: null },
        select: {
            id: true,
            code: true,
            name: true,
            balance: true,
            partner_type: true,
        },
        orderBy: { code: 'asc' },
    });

    console.log('Partner Balances from DB:');
    let total = 0;
    partners.forEach(p => {
        const bal = Number(p.balance);
        total += bal;
        console.log(`  ${p.code}: ${bal.toLocaleString()}đ - ${p.name} (${p.partner_type})`);
    });
    console.log(`\nTotal: ${total.toLocaleString()}đ`);

    // Now calculate actual balances from transactions
    console.log('\n═══ ACTUAL BALANCES FROM TRANSACTIONS ═══\n');

    for (const partner of partners) {
        const transactions = await prisma.transaction.findMany({
            where: {
                partner_id: partner.id,
                deleted_at: null,
            },
            select: {
                code: true,
                trans_type: true,
                total_amount: true,
                paid_amount: true,
                payment_status: true,
            },
        });

        let outstanding = 0;
        transactions.forEach(t => {
            const unpaid = Number(t.total_amount) - Number(t.paid_amount);
            if (unpaid > 0) {
                outstanding += t.trans_type === 'INCOME' ? unpaid : -unpaid;
            }
        });

        const dbBalance = Number(partner.balance);
        const match = dbBalance === outstanding ? '✅' : '❌';

        if (dbBalance !== 0 || outstanding !== 0) {
            console.log(`${partner.code}: DB=${dbBalance.toLocaleString()}đ, Actual=${outstanding.toLocaleString()}đ ${match}`);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
