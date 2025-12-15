// scripts/fix-partner-balances.ts
// Recalculate partner balances from Transaction table

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     FIX PARTNER BALANCES                                     ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // Get all active partners
    const partners = await prisma.partner.findMany({
        where: { deleted_at: null },
        select: {
            id: true,
            code: true,
            name: true,
            balance: true,
            partner_type: true,
        },
    });

    console.log(`Found ${partners.length} partners to recalculate\n`);

    let fixed = 0;
    let skipped = 0;

    for (const partner of partners) {
        // Calculate actual balance from transactions
        // For CUSTOMER: positive balance = they owe us (INCOME unpaid)
        // For VENDOR: negative balance = we owe them (EXPENSE unpaid)

        const transactions = await prisma.transaction.findMany({
            where: {
                partner_id: partner.id,
                deleted_at: null,
            },
            select: {
                trans_type: true,
                total_amount: true,
                paid_amount: true,
            },
        });

        let newBalance = 0;
        for (const t of transactions) {
            const unpaid = Number(t.total_amount) - Number(t.paid_amount);
            if (unpaid > 0) {
                // INCOME (sales) -> customer owes us -> positive
                // EXPENSE (purchase) -> we owe vendor -> negative
                if (t.trans_type === 'INCOME') {
                    newBalance += unpaid;  // Customer owes us
                } else if (t.trans_type === 'EXPENSE') {
                    newBalance -= unpaid;  // We owe vendor
                }
            }
        }

        const oldBalance = Number(partner.balance);

        if (oldBalance !== newBalance) {
            await prisma.partner.update({
                where: { id: partner.id },
                data: { balance: newBalance },
            });

            console.log(`✅ ${partner.code}: ${oldBalance.toLocaleString()}đ → ${newBalance.toLocaleString()}đ`);
            fixed++;
        } else {
            skipped++;
        }
    }

    console.log('\n════════════════════════════════════════════════════════════════');
    console.log(`Fixed: ${fixed} partners`);
    console.log(`Skipped (already correct): ${skipped} partners`);
    console.log('════════════════════════════════════════════════════════════════');
}

main().catch(console.error).finally(() => prisma.$disconnect());
