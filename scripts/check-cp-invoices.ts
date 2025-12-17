// scripts/check-cp-invoices.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('=== CP-2412-001 and CP-2412-002 Details ===\n');

    const transactions = await prisma.transaction.findMany({
        where: { code: { in: ['CP-2412-001', 'CP-2412-002'] } },
        include: {
            partner: true,
            items: true
        }
    });

    for (const t of transactions) {
        console.log(`\n=== ${t.code} ===`);
        console.log(`Type: ${t.trans_type}`);
        console.log(`Description: ${t.description}`);
        console.log(`Date: ${t.trans_date.toISOString().split('T')[0]}`);
        console.log(`Amount: ${Number(t.total_amount).toLocaleString()}đ`);
        console.log(`VAT: ${Number(t.tax_amount || 0).toLocaleString()}đ`);
        console.log(`Partner ID: ${t.partner_id || 'NULL - NO PARTNER LINKED'}`);
        console.log(`Partner Name: ${t.partner?.name || 'N/A'}`);
        console.log(`Partner Tax Code: ${t.partner?.tax_code || 'MISSING'}`);

        console.log(`\nWHY EXCLUDED FROM VAT DECLARATION:`);
        if (!t.partner_id) {
            console.log('  → Transaction has NO partner_id (not linked to any vendor)');
        } else if (!t.partner?.tax_code) {
            console.log('  → Partner exists but has NO TAX CODE (Mã số thuế)');
        }
        console.log('  → Vietnam tax law: Cannot claim VAT credit without vendor tax code');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
