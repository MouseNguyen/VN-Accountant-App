// scripts/test-vat-calculation.ts
// Test VAT calculation with the fix

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const farm = await prisma.farm.findFirst();
    if (!farm) {
        console.log('❌ No farm found');
        return;
    }

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     TEST VAT CALCULATION - DECEMBER 2025                     ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // Step 1: Delete existing declaration for 2025-12
    console.log('Step 1: Cleaning up existing declaration...');
    await prisma.vATDeclaration.deleteMany({
        where: { farm_id: farm.id, period_code: '2025-12' },
    });
    console.log('✓ Deleted existing 2025-12 declaration\n');

    // Step 2: Verify raw transaction data
    console.log('Step 2: Verifying raw transaction data...\n');

    const fromDate = new Date('2025-12-01');
    const toDate = new Date('2025-12-31');

    const transactions = await prisma.transaction.findMany({
        where: {
            farm_id: farm.id,
            trans_date: { gte: fromDate, lte: toDate },
            deleted_at: null,
            OR: [
                { vat_amount: { gt: 0 } },
                { tax_amount: { gt: 0 } },
            ],
        },
        select: {
            code: true,
            trans_type: true,
            vat_amount: true,
            tax_amount: true,
            subtotal: true,
        },
    });

    let expectedInputTax = 0;
    let expectedOutputTax = 0;

    for (const t of transactions) {
        const tax = Number(t.vat_amount || t.tax_amount || 0);
        const type = t.trans_type;

        console.log(`  ${t.code}: ${type} - Tax: ${tax.toLocaleString()}đ`);

        if (type === 'EXPENSE' || type === 'PURCHASE') {
            expectedInputTax += tax;
        } else if (type === 'INCOME' || type === 'SALE') {
            expectedOutputTax += tax;
        }
    }

    const expectedPayable = expectedOutputTax - expectedInputTax;

    console.log('\n────────────────────────────────────────');
    console.log(`Expected Input VAT:  ${expectedInputTax.toLocaleString()}đ`);
    console.log(`Expected Output VAT: ${expectedOutputTax.toLocaleString()}đ`);
    console.log(`Expected Payable:    ${expectedPayable.toLocaleString()}đ`);
    console.log('────────────────────────────────────────\n');

    // Step 3: Create new declaration via API simulation
    console.log('Step 3: Creating new VAT declaration...\n');

    const declaration = await prisma.vATDeclaration.create({
        data: {
            farm_id: farm.id,
            period_type: 'MONTHLY',
            period_code: '2025-12',
            from_date: fromDate,
            to_date: toDate,
            status: 'DRAFT',
        },
    });

    console.log(`✓ Created declaration: ${declaration.id}\n`);

    // Step 4: Calculate using the service logic (inline)
    console.log('Step 4: Calculating VAT (with fix)...\n');

    const purchaseTransactions = await prisma.transaction.findMany({
        where: {
            farm_id: farm.id,
            trans_type: { in: ['PURCHASE', 'EXPENSE'] },
            trans_date: { gte: fromDate, lte: toDate },
            payment_status: { not: 'CANCELLED' },
            deleted_at: null,
        },
    });

    let actualInputTax = 0;
    let inputCount = 0;

    for (const trans of purchaseTransactions) {
        // Use header-level tax (the fix)
        const vatAmount = Number(trans.vat_amount || trans.tax_amount || 0);
        if (vatAmount > 0) {
            actualInputTax += vatAmount;
            inputCount++;
        }
    }

    const saleTransactions = await prisma.transaction.findMany({
        where: {
            farm_id: farm.id,
            trans_type: { in: ['SALE', 'INCOME'] },
            trans_date: { gte: fromDate, lte: toDate },
            payment_status: { not: 'CANCELLED' },
            deleted_at: null,
        },
    });

    let actualOutputTax = 0;
    let outputCount = 0;

    for (const trans of saleTransactions) {
        // Use header-level tax (the fix)
        const vatAmount = Number(trans.vat_amount || trans.tax_amount || 0);
        if (vatAmount > 0) {
            actualOutputTax += vatAmount;
            outputCount++;
        }
    }

    const actualPayable = Math.max(0, actualOutputTax - actualInputTax);
    const carriedForward = actualOutputTax - actualInputTax < 0 ? Math.abs(actualOutputTax - actualInputTax) : 0;

    // Update declaration
    await prisma.vATDeclaration.update({
        where: { id: declaration.id },
        data: {
            input_vat_count: inputCount,
            input_vat_tax: actualInputTax,
            output_vat_count: outputCount,
            output_vat_tax: actualOutputTax,
            payable_vat: actualPayable,
            carried_forward: carriedForward,
            status: 'CALCULATED',
        },
    });

    console.log(`Calculated Input VAT:  ${actualInputTax.toLocaleString()}đ (${inputCount} HĐ)`);
    console.log(`Calculated Output VAT: ${actualOutputTax.toLocaleString()}đ (${outputCount} HĐ)`);
    console.log(`Calculated Payable:    ${actualPayable.toLocaleString()}đ\n`);

    // Step 5: Verify
    console.log('════════════════════════════════════════════════════════════════');
    console.log('VERIFICATION:');
    console.log('════════════════════════════════════════════════════════════════\n');

    const inputMatch = actualInputTax === expectedInputTax;
    const outputMatch = actualOutputTax === expectedOutputTax;
    const payableMatch = actualPayable === expectedPayable;

    console.log(`Input VAT:  ${inputMatch ? '✅' : '❌'} Expected ${expectedInputTax.toLocaleString()}đ, Got ${actualInputTax.toLocaleString()}đ`);
    console.log(`Output VAT: ${outputMatch ? '✅' : '❌'} Expected ${expectedOutputTax.toLocaleString()}đ, Got ${actualOutputTax.toLocaleString()}đ`);
    console.log(`Payable:    ${payableMatch ? '✅' : '❌'} Expected ${expectedPayable.toLocaleString()}đ, Got ${actualPayable.toLocaleString()}đ`);

    console.log('\n');
    if (inputMatch && outputMatch && payableMatch) {
        console.log('🎉 ALL TESTS PASSED! VAT calculation is correct.');
    } else {
        console.log('⚠️  Some tests failed. Check the calculation logic.');
    }
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('Now refresh the UI at http://localhost:3000/thue/to-khai to see the result!');
    console.log('════════════════════════════════════════════════════════════════\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());
