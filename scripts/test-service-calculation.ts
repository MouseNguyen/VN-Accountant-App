// scripts/test-service-calculation.ts
// Test the actual VAT service calculation

import { calculateVATDeclaration, createVATDeclaration } from '../src/services/vat.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const farm = await prisma.farm.findFirst();
    if (!farm) {
        console.log('❌ No farm found');
        return;
    }

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     TEST VAT SERVICE CALCULATION                             ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // Delete existing
    await prisma.vATDeclaration.deleteMany({
        where: { farm_id: farm.id, period_code: '2025-12' },
    });
    console.log('✓ Cleaned up existing declaration\n');

    // Create new
    const decl = await prisma.vATDeclaration.create({
        data: {
            farm_id: farm.id,
            period_type: 'MONTHLY',
            period_code: '2025-12',
            from_date: new Date('2025-12-01'),
            to_date: new Date('2025-12-31'),
            status: 'DRAFT',
        },
    });
    console.log('✓ Created declaration:', decl.id, '\n');

    // Calculate using the service
    console.log('Calling calculateVATDeclaration()...\n');

    try {
        const result = await calculateVATDeclaration(farm.id, decl.id);

        console.log('════════════════════════════════════════════════════════════════');
        console.log('SERVICE RESULT:');
        console.log('════════════════════════════════════════════════════════════════');
        console.log(`  Input VAT:  ${result.input_vat.tax.toLocaleString()}đ (${result.input_vat.count} HĐ)`);
        console.log(`  Output VAT: ${result.output_vat.tax.toLocaleString()}đ (${result.output_vat.count} HĐ)`);
        console.log(`  Payable:    ${result.payable_vat.toLocaleString()}đ`);
        console.log(`  Carried:    ${result.carried_forward.toLocaleString()}đ`);
        console.log('════════════════════════════════════════════════════════════════\n');

        // Verify
        const expectedInput = 15000;
        const expectedOutput = 23200;
        const expectedPayable = 8200;

        const inputOk = result.input_vat.tax === expectedInput;
        const outputOk = result.output_vat.tax === expectedOutput;
        const payableOk = result.payable_vat === expectedPayable;

        console.log('VERIFICATION:');
        console.log(`  Input:   ${inputOk ? '✅' : '❌'} (expected ${expectedInput.toLocaleString()}đ)`);
        console.log(`  Output:  ${outputOk ? '✅' : '❌'} (expected ${expectedOutput.toLocaleString()}đ)`);
        console.log(`  Payable: ${payableOk ? '✅' : '❌'} (expected ${expectedPayable.toLocaleString()}đ)`);
        console.log('');

        if (inputOk && outputOk && payableOk) {
            console.log('🎉 ALL TESTS PASSED! Service fix is working!');
        } else {
            console.log('⚠️  Some tests failed.');
        }

        if (result.issues.length > 0) {
            console.log('\nIssues found:');
            for (const issue of result.issues) {
                console.log(`  - ${issue.message}`);
            }
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
