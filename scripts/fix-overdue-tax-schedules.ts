// scripts/fix-overdue-tax-schedules.ts
// Marks past TaxSchedule records as SUBMITTED to clear overdue warnings

import { prisma } from '../src/lib/prisma';

async function main() {
    console.log('🔧 Fixing Overdue Tax Schedule Records...\n');

    const today = new Date();
    console.log(`Today: ${today.toISOString().split('T')[0]}\n`);

    // Find all PENDING items that are overdue
    const overdueItems = await prisma.taxSchedule.findMany({
        where: {
            due_date: { lt: today },
            status: { in: ['PENDING', 'REMINDED'] }
        },
        orderBy: { due_date: 'asc' }
    });

    console.log(`Found ${overdueItems.length} overdue PENDING items:\n`);
    overdueItems.forEach(item => {
        console.log(`  ${item.tax_type.padEnd(5)} ${item.period.padEnd(10)} due: ${item.due_date?.toISOString().split('T')[0]}`);
    });

    if (overdueItems.length === 0) {
        console.log('\n✅ No overdue items to fix!');
        return;
    }

    // Update all overdue items to SUBMITTED
    const result = await prisma.taxSchedule.updateMany({
        where: {
            due_date: { lt: today },
            status: { in: ['PENDING', 'REMINDED'] }
        },
        data: {
            status: 'SUBMITTED'
        }
    });

    console.log(`\n✅ Updated ${result.count} records to SUBMITTED`);

    // Show remaining PENDING (future items)
    const remaining = await prisma.taxSchedule.findMany({
        where: { status: 'PENDING' },
        orderBy: { due_date: 'asc' }
    });

    console.log(`\n📅 Remaining PENDING (future deadlines):`);
    remaining.forEach(item => {
        console.log(`  ${item.tax_type.padEnd(5)} ${item.period.padEnd(10)} due: ${item.due_date?.toISOString().split('T')[0]}`);
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
