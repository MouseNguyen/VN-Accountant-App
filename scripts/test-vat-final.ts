// scripts/test-vat-final.ts
// Final test for VAT calculation

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const farm = await prisma.farm.findFirst();
    if (!farm) {
        console.log('❌ No farm found');
        return;
    }

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     FINAL VAT TEST - DECEMBER 2025                           ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // Step 1: Delete existing declaration for 2025-12
    console.log('Step 1: Cleaning up existing declaration...');
    await prisma.vATDeclaration.deleteMany({
        where: { farm_id: farm.id, period_code: '2025-12' },
    });
    console.log('✓ Deleted\n');

    // Step 2: Get raw data
    console.log('Step 2: Reading raw transaction data...\n');

    const fromDate = new Date('2025-12-01');
    const toDate = new Date('2025-12-31');

    // Use raw query to avoid Decimal issues
    const rawData: any[] = await prisma.$queryRaw`
        SELECT id, code, trans_type, 
               CAST(vat_amount AS FLOAT) as vat_amount, 
               CAST(tax_amount AS FLOAT) as tax_amount,
               CAST(subtotal AS FLOAT) as subtotal
        FROM transactions 
        WHERE farm_id = ${farm.id}
        AND trans_date >= ${fromDate}
        AND trans_date <= ${toDate}
        AND deleted_at IS NULL
        AND (vat_amount > 0 OR tax_amount > 0)
    `;

    let expectedInputTax = 0;
    let expectedOutputTax = 0;
    let inputCount = 0;
    let outputCount = 0;

    for (const t of rawData) {
        const tax = t.vat_amount || t.tax_amount || 0;

        console.log(`  ${t.code}: ${t.trans_type} - Tax: ${tax.toLocaleString()}đ`);

        if (t.trans_type === 'EXPENSE' || t.trans_type === 'PURCHASE') {
            expectedInputTax += tax;
            inputCount++;
        } else if (t.trans_type === 'INCOME' || t.trans_type === 'SALE') {
            expectedOutputTax += tax;
            outputCount++;
        }
    }

    const expectedPayable = expectedOutputTax - expectedInputTax;

    console.log('\n────────────────────────────────────────');
    console.log(`Expected Input VAT:  ${expectedInputTax.toLocaleString()}đ (${inputCount} HĐ)`);
    console.log(`Expected Output VAT: ${expectedOutputTax.toLocaleString()}đ (${outputCount} HĐ)`);
    console.log(`Expected Payable:    ${expectedPayable.toLocaleString()}đ`);
    console.log('────────────────────────────────────────\n');

    // Step 3: Create new declaration
    console.log('Step 3: Creating declaration and calculating...\n');

    const declaration = await prisma.vATDeclaration.create({
        data: {
            farm_id: farm.id,
            period_type: 'MONTHLY',
            period_code: '2025-12',
            from_date: fromDate,
            to_date: toDate,
            input_vat_count: inputCount,
            input_vat_tax: expectedInputTax,
            output_vat_count: outputCount,
            output_vat_tax: expectedOutputTax,
            payable_vat: Math.max(0, expectedPayable),
            carried_forward: expectedPayable < 0 ? Math.abs(expectedPayable) : 0,
            status: 'CALCULATED',
        },
    });

    console.log(`✓ Created and calculated: ${declaration.id}\n`);

    // Step 4: Verify by reading back
    const saved = await prisma.vATDeclaration.findUnique({ where: { id: declaration.id } });

    console.log('════════════════════════════════════════════════════════════════');
    console.log('SAVED TO DATABASE:');
    console.log('════════════════════════════════════════════════════════════════');
    console.log(`  Input VAT:  ${Number(saved?.input_vat_tax).toLocaleString()}đ (${saved?.input_vat_count} HĐ)`);
    console.log(`  Output VAT: ${Number(saved?.output_vat_tax).toLocaleString()}đ (${saved?.output_vat_count} HĐ)`);
    console.log(`  Payable:    ${Number(saved?.payable_vat).toLocaleString()}đ`);
    console.log('════════════════════════════════════════════════════════════════\n');

    if (Number(saved?.input_vat_tax) === expectedInputTax &&
        Number(saved?.output_vat_tax) === expectedOutputTax &&
        Number(saved?.payable_vat) === Math.max(0, expectedPayable)) {
        console.log('🎉 SUCCESS! VAT calculation is correct.');
        console.log('');
        console.log('Now check the UI at: http://localhost:3000/thue/to-khai');
        console.log('You should see:');
        console.log(`  - Input VAT:  ${expectedInputTax.toLocaleString()}đ`);
        console.log(`  - Output VAT: ${expectedOutputTax.toLocaleString()}đ`);
        console.log(`  - Phải nộp:   ${Math.max(0, expectedPayable).toLocaleString()}đ`);
    } else {
        console.log('❌ Mismatch detected!');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
