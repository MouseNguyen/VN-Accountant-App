// scripts/hunt-vat-difference.ts
// Deep analysis of VAT calculation difference

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to safely convert Decimal to number
const toNum = (val: any): number => {
    if (val === null || val === undefined) return 0;
    const n = Number(val);
    return isNaN(n) ? 0 : n;
};

async function main() {
    console.log('=== HUNTING VAT DIFFERENCE ===\n');

    // Screenshot values
    const screenshotInput = {
        count: 5,
        goods: 41500000,
        vat: 4150000
    };

    const screenshotOutput = {
        count: 2,
        goods: 48000000,
        vat: 4800000
    };

    console.log('SCREENSHOT VALUES:');
    console.log(`  Input: ${screenshotInput.count} invoices, ${screenshotInput.goods.toLocaleString()}đ goods, ${screenshotInput.vat.toLocaleString()}đ VAT`);
    console.log(`  Output: ${screenshotOutput.count} invoices, ${screenshotOutput.goods.toLocaleString()}đ goods, ${screenshotOutput.vat.toLocaleString()}đ VAT`);
    console.log(`  Payable: ${(screenshotOutput.vat - screenshotInput.vat).toLocaleString()}đ`);

    // Get stored VAT declaration for period 2025-12
    console.log('\n--- STORED VAT DECLARATION ---');
    const declaration = await prisma.vATDeclaration.findFirst({
        where: { period_code: { contains: '2025-12' } }
    });

    if (declaration) {
        console.log(`Period: ${declaration.period_code}`);
        console.log(`From: ${declaration.from_date} To: ${declaration.to_date}`);
        console.log(`Input: ${declaration.input_vat_count} invoices, ${toNum(declaration.input_vat_amount).toLocaleString()}đ, VAT: ${toNum(declaration.input_vat_tax).toLocaleString()}đ`);
        console.log(`Output: ${declaration.output_vat_count} invoices, ${toNum(declaration.output_vat_amount).toLocaleString()}đ, VAT: ${toNum(declaration.output_vat_tax).toLocaleString()}đ`);
        console.log(`Payable: ${toNum(declaration.payable_vat).toLocaleString()}đ`);

        // Use date range from declaration
        const fromDate = declaration.from_date;
        const toDate = declaration.to_date;

        console.log('\n--- RECALCULATING WITH EXACT FILTERS ---');

        // Get INPUT transactions (PURCHASE/EXPENSE with VAT > 0)
        console.log('\n[INPUT VAT - Purchases/Expenses with VAT > 0]');
        const inputTrans = await prisma.transaction.findMany({
            where: {
                trans_type: { in: ['PURCHASE', 'EXPENSE'] },
                trans_date: { gte: fromDate, lte: toDate },
                payment_status: { not: 'CANCELLED' },
                deleted_at: null,
            },
            include: {
                partner: { select: { name: true, tax_code: true } },
                items: true
            }
        });

        let countWithVAT = 0;
        let totalGoodsWithVAT = 0;
        let totalVATWithVAT = 0;
        let countDeductible = 0;
        let totalDeductibleGoods = 0;
        let totalDeductibleVAT = 0;

        console.log('\nAll PURCHASE/EXPENSE transactions in period:');
        for (const trans of inputTrans) {
            // Calculate VAT from items or header
            let goodsValue = (trans.items || []).reduce((sum, i) => sum + toNum(i.sub_total) + toNum(i.line_total), 0);
            let vatAmount = (trans.items || []).reduce((sum, i) => sum + toNum(i.vat_amount) + toNum(i.tax_amount), 0);

            if (vatAmount === 0) {
                vatAmount = toNum(trans.vat_amount) || toNum(trans.tax_amount);
            }
            if (goodsValue === 0) {
                goodsValue = toNum(trans.subtotal) || toNum(trans.amount);
            }

            const hasVAT = vatAmount > 0;
            const hasTaxCode = !!trans.partner?.tax_code;
            const isDeductible = hasVAT && hasTaxCode;

            const status = hasVAT
                ? (isDeductible ? '✅ INCLUDED' : '⚠️ NO TAX CODE')
                : '❌ NO VAT';

            console.log(`  ${trans.code}: goods=${goodsValue.toLocaleString()}, VAT=${vatAmount.toLocaleString()}, partner=${trans.partner?.name || 'N/A'}, taxCode=${trans.partner?.tax_code || 'MISSING'} → ${status}`);

            if (hasVAT) {
                countWithVAT++;
                totalGoodsWithVAT += goodsValue;
                totalVATWithVAT += vatAmount;

                if (isDeductible) {
                    countDeductible++;
                    totalDeductibleGoods += goodsValue;
                    totalDeductibleVAT += vatAmount;
                }
            }
        }

        console.log('\n--- SUMMARY ---');
        console.log(`Total transactions: ${inputTrans.length}`);
        console.log(`With VAT > 0: ${countWithVAT}, goods=${totalGoodsWithVAT.toLocaleString()}, VAT=${totalVATWithVAT.toLocaleString()}`);
        console.log(`Deductible (has tax code): ${countDeductible}, goods=${totalDeductibleGoods.toLocaleString()}, VAT=${totalDeductibleVAT.toLocaleString()}`);

        console.log('\n--- COMPARISON ---');
        console.log(`Screenshot Input VAT: ${screenshotInput.vat.toLocaleString()}đ (${screenshotInput.count} invoices)`);
        console.log(`DB All with VAT: ${totalVATWithVAT.toLocaleString()}đ (${countWithVAT} invoices)`);
        console.log(`DB Deductible only: ${totalDeductibleVAT.toLocaleString()}đ (${countDeductible} invoices)`);
        console.log(`Stored declaration: ${toNum(declaration.input_vat_tax).toLocaleString()}đ (${declaration.input_vat_count} invoices)`);

        const diffWithVAT = screenshotInput.vat - totalVATWithVAT;
        const diffDeductible = screenshotInput.vat - totalDeductibleVAT;
        const diffStored = screenshotInput.vat - toNum(declaration.input_vat_tax);

        console.log(`\nDifference (screenshot - all with VAT): ${diffWithVAT.toLocaleString()}đ`);
        console.log(`Difference (screenshot - deductible): ${diffDeductible.toLocaleString()}đ`);
        console.log(`Difference (screenshot - stored): ${diffStored.toLocaleString()}đ`);

        // Check if stored matches screenshot
        if (Math.abs(diffStored) < 1000) {
            console.log('\n✅ STORED DECLARATION MATCHES SCREENSHOT!');
        } else {
            console.log('\n⚠️ There is a difference between stored and screenshot');
        }

    } else {
        console.log('No VAT declaration found for 2025-12');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
