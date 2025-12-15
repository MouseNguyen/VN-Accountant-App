// scripts/check-vat-final.ts
// Final verification of VAT calculation

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const farm = await prisma.farm.findFirst();
    if (!farm) {
        console.log('No farm found');
        return;
    }

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     FINAL VAT CHECK FOR DECEMBER 2025                        ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const fromDate = new Date('2025-12-01');
    const toDate = new Date('2025-12-31');

    console.log(`Date range: ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}\n`);

    // All transactions in date range
    const allTrans = await prisma.transaction.findMany({
        where: {
            farm_id: farm.id,
            trans_date: { gte: fromDate, lte: toDate },
            deleted_at: null,
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
        },
    });

    console.log(`Total transactions in period: ${allTrans.length}`);
    console.log('');

    for (const t of allTrans) {
        const vatAmt = Number(t.vat_amount || 0);
        const taxAmt = Number(t.tax_amount || 0);
        const taxValue = vatAmt || taxAmt;
        console.log(`${t.trans_date.toISOString().split('T')[0]} | ${t.trans_type.padEnd(10)} | ${t.code}`);
        console.log(`  subtotal: ${Number(t.subtotal).toLocaleString()}đ, vat: ${vatAmt.toLocaleString()}đ, tax: ${taxAmt.toLocaleString()}đ`);
        console.log(`  → Tax value to use: ${taxValue.toLocaleString()}đ`);
        console.log('');
    }

    // Calculate
    let inputTax = 0;
    let outputTax = 0;
    let inputCount = 0;
    let outputCount = 0;

    for (const t of allTrans) {
        const taxValue = Number(t.vat_amount || t.tax_amount || 0);
        if (taxValue === 0) continue;

        if (t.trans_type === 'EXPENSE' || t.trans_type === 'PURCHASE') {
            inputTax += taxValue;
            inputCount++;
        } else if (t.trans_type === 'INCOME' || t.trans_type === 'SALE') {
            outputTax += taxValue;
            outputCount++;
        }
    }

    console.log('════════════════════════════════════════════════════════════════');
    console.log('EXPECTED VAT SUMMARY:');
    console.log(`  Input (${inputCount} HĐ):   ${inputTax.toLocaleString()}đ`);
    console.log(`  Output (${outputCount} HĐ): ${outputTax.toLocaleString()}đ`);
    console.log(`  ─────────────────────────────────`);
    const payable = outputTax - inputTax;
    console.log(`  PHẢI NỘP: ${payable.toLocaleString()}đ`);
    console.log('════════════════════════════════════════════════════════════════');
    console.log('');
    console.log(`COMPARE WITH UI: Payable should be ${payable.toLocaleString()}đ`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
