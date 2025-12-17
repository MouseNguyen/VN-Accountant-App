// scripts/fix-phase3-issues.ts
// Fix Phase 3 verification issues

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('=== FIXING PHASE 3 ISSUES ===\n');

    // Get first farm for context
    const farm = await prisma.farm.findFirst();
    if (!farm) {
        console.log('No farm found, cannot create rule');
        return;
    }

    // Fix 1: Add missing PIT_PERSONAL_DEDUCTION rule
    console.log('1. Adding PIT_PERSONAL_DEDUCTION rule...');

    const existingRule = await prisma.taxRule.findFirst({
        where: { code: 'PIT_PERSONAL_DEDUCTION' }
    });

    if (!existingRule) {
        await prisma.taxRule.create({
            data: {
                farm_id: farm.id,
                code: 'PIT_PERSONAL_DEDUCTION',
                rule_type: 'PIT_DEDUCTION',
                category: 'PIT',
                action: 'DEDUCT',
                value: 11000000, // 11M VND personal deduction
                name: 'Giảm trừ bản thân',
                description: 'Mức giảm trừ bản thân cho người nộp thuế TNCN',
                reference: 'TT111/2013/TT-BTC',
                effective_from: new Date('2020-07-01'),
                is_active: true,
                is_system: true,
                priority: 10,
            }
        });
        console.log('   ✅ Created PIT_PERSONAL_DEDUCTION rule (11,000,000 VND)');
    } else {
        console.log('   ℹ️ Rule already exists');
    }

    // Fix 2: Flag cash >= 20M transactions as non-deductible
    console.log('\n2. Flagging cash>=20M transactions as non-deductible...');

    const unflagged = await prisma.transaction.findMany({
        where: {
            payment_method: 'CASH',
            total_amount: { gte: 20000000 },
            trans_type: { in: ['PURCHASE', 'EXPENSE'] },
            vat_deductible: { not: false }
        },
        select: { id: true, code: true, total_amount: true }
    });

    console.log(`   Found ${unflagged.length} unflagged transaction(s)`);

    for (const t of unflagged) {
        await prisma.transaction.update({
            where: { id: t.id },
            data: { vat_deductible: false }
        });
        console.log(`   ✅ Flagged: ${t.code} (${Number(t.total_amount).toLocaleString()}đ)`);
    }

    console.log('\n=== FIXES COMPLETE ===');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
