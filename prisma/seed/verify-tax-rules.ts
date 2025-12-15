// prisma/seed/verify-tax-rules.ts
// Script to verify tax rules in database

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('📊 Verifying database...\n');

    const taxRuleCount = await prisma.taxRule.count();
    console.log('Tax Rules count:', taxRuleCount);

    const sample = await prisma.taxRule.findFirst({
        where: { code: 'VAT_CASH_LIMIT' }
    });

    if (sample) {
        console.log('\nSample rule (VAT_CASH_LIMIT):');
        console.log('  - Code:', sample.code);
        console.log('  - Rule Type:', sample.rule_type);
        console.log('  - Action:', sample.action);
        console.log('  - Value:', sample.value);
        console.log('  - Condition:', sample.condition);
        console.log('  - Is Active:', sample.is_active);
    }

    // Check new tables
    console.log('\n--- Phase 3 Tables ---');
    console.log('CIT Calculations:', await prisma.cITCalculation.count());
    console.log('PIT Calculations:', await prisma.pITCalculation.count());
    console.log('Assets:', await prisma.asset.count());
    console.log('Depreciation Schedules:', await prisma.depreciationSchedule.count());
    console.log('Tax Schedules:', await prisma.taxSchedule.count());
    console.log('Tax Rule Histories:', await prisma.taxRuleHistory.count());
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
