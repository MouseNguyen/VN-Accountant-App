// scripts/check-vat-data.ts
// Verify VAT declaration numbers against transaction data

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const farm = await prisma.farm.findFirst();
    if (!farm) {
        console.log('No farm found');
        return;
    }

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     CHECK VAT DATA FOR DECEMBER 2025                         ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const fromDate = new Date('2025-12-01');
    const toDate = new Date('2025-12-31');

    // Input VAT (Purchases/Expenses)
    console.log('═══ INPUT VAT (Mua hàng / Chi phí) ═══\n');

    const purchases = await prisma.transaction.findMany({
        where: {
            farm_id: farm.id,
            trans_type: { in: ['PURCHASE', 'EXPENSE'] },
            trans_date: { gte: fromDate, lte: toDate },
            deleted_at: null,
        },
        include: {
            items: true,
            partner: { select: { name: true, tax_code: true } },
        },
    });

    let inputCount = 0;
    let inputAmount = 0;
    let inputTax = 0;

    for (const t of purchases) {
        const goodsValue = t.items.reduce((sum, i) => sum + Number(i.sub_total || i.line_total || 0), 0);
        const vatAmount = t.items.reduce((sum, i) => sum + Number(i.vat_amount || i.tax_amount || 0), 0);

        if (vatAmount > 0) {
            inputCount++;
            inputAmount += goodsValue;
            inputTax += vatAmount;
            console.log(`  ${t.code || t.trans_number}: ${t.partner?.name || 'N/A'}`);
            console.log(`    Goods: ${goodsValue.toLocaleString()}đ, VAT: ${vatAmount.toLocaleString()}đ`);
        }
    }

    console.log(`\nTotal Input: ${inputCount} invoices, ${inputAmount.toLocaleString()}đ goods, ${inputTax.toLocaleString()}đ VAT`);

    // Output VAT (Sales/Income)
    console.log('\n═══ OUTPUT VAT (Bán hàng / Thu nhập) ═══\n');

    const sales = await prisma.transaction.findMany({
        where: {
            farm_id: farm.id,
            trans_type: { in: ['SALE', 'INCOME'] },
            trans_date: { gte: fromDate, lte: toDate },
            deleted_at: null,
        },
        include: {
            items: true,
            partner: { select: { name: true, tax_code: true } },
        },
    });

    let outputCount = 0;
    let outputAmount = 0;
    let outputTax = 0;

    for (const t of sales) {
        const goodsValue = t.items.reduce((sum, i) => sum + Number(i.sub_total || i.line_total || 0), 0);
        const vatAmount = t.items.reduce((sum, i) => sum + Number(i.vat_amount || i.tax_amount || 0), 0);

        if (vatAmount > 0) {
            outputCount++;
            outputAmount += goodsValue;
            outputTax += vatAmount;
            console.log(`  ${t.code || t.trans_number}: ${t.partner?.name || 'N/A'}`);
            console.log(`    Goods: ${goodsValue.toLocaleString()}đ, VAT: ${vatAmount.toLocaleString()}đ`);
        }
    }

    console.log(`\nTotal Output: ${outputCount} invoices, ${outputAmount.toLocaleString()}đ goods, ${outputTax.toLocaleString()}đ VAT`);

    // Summary
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('VAT SUMMARY:');
    console.log(`  Input VAT (khấu trừ):  ${inputTax.toLocaleString()}đ`);
    console.log(`  Output VAT (phải nộp): ${outputTax.toLocaleString()}đ`);
    console.log(`  ─────────────────────────────────`);
    const payable = outputTax - inputTax;
    if (payable > 0) {
        console.log(`  PHẢI NỘP:              ${payable.toLocaleString()}đ`);
    } else {
        console.log(`  KHẤU TRỪ:              ${Math.abs(payable).toLocaleString()}đ`);
    }
    console.log('════════════════════════════════════════════════════════════════');
}

main().catch(console.error).finally(() => prisma.$disconnect());
