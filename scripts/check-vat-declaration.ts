// scripts/check-vat-declaration.ts
// Check what's stored in VAT Declaration table

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     CHECK VAT DECLARATIONS IN DATABASE                       ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const declarations = await prisma.vATDeclaration.findMany({
        orderBy: { period_code: 'desc' },
    });

    if (declarations.length === 0) {
        console.log('No VAT declarations found');
        return;
    }

    for (const d of declarations) {
        console.log(`\n═══ ${d.period_code} (${d.period_type}) ═══`);
        console.log(`Status: ${d.status}`);
        console.log(`From: ${d.from_date.toISOString().split('T')[0]} To: ${d.to_date.toISOString().split('T')[0]}`);
        console.log(`\nInput VAT:`);
        console.log(`  Count: ${d.input_vat_count}`);
        console.log(`  Amount: ${Number(d.input_vat_amount).toLocaleString()}đ`);
        console.log(`  Tax: ${Number(d.input_vat_tax).toLocaleString()}đ`);
        console.log(`\nOutput VAT:`);
        console.log(`  Count: ${d.output_vat_count}`);
        console.log(`  Amount: ${Number(d.output_vat_amount).toLocaleString()}đ`);
        console.log(`  Tax: ${Number(d.output_vat_tax).toLocaleString()}đ`);
        console.log(`\nResult:`);
        console.log(`  Payable: ${Number(d.payable_vat).toLocaleString()}đ`);
        console.log(`  Carried Forward: ${Number(d.carried_forward).toLocaleString()}đ`);
    }

    // Also check all transactions with VAT
    console.log('\n\n════════════════════════════════════════════════════════════════');
    console.log('ALL TRANSACTIONS WITH TAX AMOUNTS:');
    console.log('════════════════════════════════════════════════════════════════\n');

    const farm = await prisma.farm.findFirst();
    const transactions = await prisma.transaction.findMany({
        where: {
            farm_id: farm?.id,
            OR: [
                { vat_amount: { gt: 0 } },
                { tax_amount: { gt: 0 } },
            ],
            deleted_at: null,
        },
        include: {
            items: true,
        },
        orderBy: { trans_date: 'desc' },
        take: 20,
    });

    for (const t of transactions) {
        console.log(`${t.trans_date.toISOString().split('T')[0]} | ${t.trans_type} | ${t.code || t.trans_number}`);
        console.log(`  Total: ${Number(t.total_amount).toLocaleString()}đ`);
        console.log(`  VAT (header): ${Number(t.vat_amount).toLocaleString()}đ`);
        console.log(`  Tax (header): ${Number(t.tax_amount).toLocaleString()}đ`);

        if (t.items.length > 0) {
            console.log(`  Items:`);
            for (const i of t.items) {
                console.log(`    - ${i.product_name}: subtotal=${Number(i.sub_total).toLocaleString()}đ, vat=${Number(i.vat_amount).toLocaleString()}đ`);
            }
        }
        console.log('');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
