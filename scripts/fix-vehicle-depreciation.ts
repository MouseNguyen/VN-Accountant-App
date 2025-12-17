// scripts/fix-vehicle-depreciation.ts
// =====================================================
// Fix vehicle depreciation for assets over 1.6B cap (TT96/2015)
// Run: npx tsx scripts/fix-vehicle-depreciation.ts
// =====================================================

import { prisma } from '../src/lib/prisma';

const VEHICLE_CAP = 1_600_000_000; // 1.6 tỷ VND

async function main() {
    console.log('🔧 FIXING VEHICLE DEPRECIATION CAP (TT96/2015)\n');
    console.log('='.repeat(60));

    // Find vehicles over 1.6B that are NOT transport business
    const vehicles = await prisma.asset.findMany({
        where: {
            category: 'VEHICLE',
            is_transport_biz: false,
            purchase_price: { gt: VEHICLE_CAP },
            status: 'ACTIVE',
        },
    });

    console.log(`\n📋 Found ${vehicles.length} vehicles over 1.6B cap\n`);

    if (vehicles.length === 0) {
        console.log('✅ No vehicles need fixing!');
        await prisma.$disconnect();
        return;
    }

    for (const asset of vehicles) {
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`📦 ${asset.code} - ${asset.name}`);
        console.log(`   Purchase Price: ${formatMoney(asset.purchase_price)}`);
        console.log(`   Current Monthly Depreciation: ${formatMoney(asset.monthly_depreciation)}`);

        // Calculate correct depreciation (capped at 1.6B)
        const residualValue = Number(asset.residual_value) || 0;
        const depreciableAmount = VEHICLE_CAP - residualValue;
        const correctMonthly = Math.round(depreciableAmount / asset.useful_life_months);

        console.log(`   Correct Monthly Depreciation: ${formatMoney(correctMonthly)}`);

        // Calculate accumulated (based on how many months depreciated)
        const monthsDepreciated = Number(asset.accumulated_depreciation) > 0
            ? Math.round(Number(asset.accumulated_depreciation) / Number(asset.monthly_depreciation))
            : 0;

        const correctAccumulated = correctMonthly * monthsDepreciated;
        // Book value is still based on original cost (for accounting), but depreciation is capped
        const originalCost = Number(asset.original_cost);
        const correctBookValue = originalCost - correctAccumulated;

        console.log(`\n   📊 Corrections:`);
        console.log(`   Months depreciated: ${monthsDepreciated}`);
        console.log(`   Old accumulated: ${formatMoney(asset.accumulated_depreciation)}`);
        console.log(`   New accumulated: ${formatMoney(correctAccumulated)}`);
        console.log(`   New book value: ${formatMoney(correctBookValue)}`);

        // Update asset
        await prisma.asset.update({
            where: { id: asset.id },
            data: {
                monthly_depreciation: correctMonthly,
                accumulated_depreciation: correctAccumulated,
                book_value: correctBookValue,
                max_deductible_value: VEHICLE_CAP,
            },
        });

        // Update depreciation schedules
        const schedules = await prisma.depreciationSchedule.findMany({
            where: { asset_id: asset.id },
            orderBy: { period: 'asc' },
        });

        let runningAccumulated = 0;
        for (const schedule of schedules) {
            runningAccumulated += correctMonthly;
            const remaining = originalCost - runningAccumulated;

            await prisma.depreciationSchedule.update({
                where: { id: schedule.id },
                data: {
                    depreciation_amount: correctMonthly,
                    accumulated_amount: runningAccumulated,
                    remaining_value: Math.max(0, remaining),
                },
            });
        }

        console.log(`   ✅ Updated asset and ${schedules.length} schedule records`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ ALL FIXES APPLIED!');
    console.log('\nRun test-depreciation-calc.ts to verify.');

    await prisma.$disconnect();
}

function formatMoney(value: number | any): string {
    const num = typeof value === 'number' ? value : Number(value);
    return new Intl.NumberFormat('vi-VN').format(Math.round(num)) + 'đ';
}

main().catch(console.error);
