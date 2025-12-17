// scripts/test-depreciation-calc.ts
// =====================================================
// Test Asset Depreciation Calculations
// Run: npx tsx scripts/test-depreciation-calc.ts
// =====================================================

import { prisma } from '../src/lib/prisma';
import Decimal from 'decimal.js';

const VEHICLE_CAP = 1_600_000_000; // 1.6 tỷ VND

interface TestResult {
    asset: string;
    status: 'PASS' | 'FAIL' | 'WARN';
    message: string;
    expected?: number;
    actual?: number;
    diff?: number;
}

async function main() {
    console.log('🔍 DEPRECIATION CALCULATION TEST\n');
    console.log('='.repeat(60));

    const results: TestResult[] = [];

    // Get all assets with depreciation
    const assets = await prisma.asset.findMany({
        where: { status: 'ACTIVE' },
        include: {
            depreciation_schedules: {
                orderBy: { period: 'desc' },
                take: 1,
            },
        },
    });

    console.log(`\n📋 Found ${assets.length} active assets\n`);

    for (const asset of assets) {
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`📦 ${asset.code} - ${asset.name}`);
        console.log(`   Category: ${asset.category}`);
        console.log(`   Purchase Price: ${formatMoney(asset.purchase_price)}`);
        console.log(`   Useful Life: ${asset.useful_life_months} months`);
        console.log(`   Method: ${asset.depreciation_method}`);

        // Calculate expected monthly depreciation
        let depreciableValue = Number(asset.purchase_price);

        // Check vehicle cap (> 1.6B)
        if (asset.category === 'VEHICLE' && depreciableValue > VEHICLE_CAP) {
            console.log(`   ⚠️  Vehicle over 1.6B cap!`);
            console.log(`   Original: ${formatMoney(depreciableValue)}`);
            depreciableValue = VEHICLE_CAP;
            console.log(`   Capped to: ${formatMoney(depreciableValue)}`);

            results.push({
                asset: asset.code,
                status: 'WARN',
                message: `Vehicle value ${formatMoney(asset.purchase_price)} > 1.6B cap`,
            });
        }

        const expectedMonthly = depreciableValue / asset.useful_life_months;
        const actualMonthly = Number(asset.monthly_depreciation);

        console.log(`\n   📊 Monthly Depreciation:`);
        console.log(`   Expected: ${formatMoney(expectedMonthly)}`);
        console.log(`   Actual:   ${formatMoney(actualMonthly)}`);

        const diff = Math.abs(expectedMonthly - actualMonthly);
        const tolerance = 1; // 1đ tolerance for rounding

        if (diff <= tolerance) {
            console.log(`   ✅ PASS (diff: ${formatMoney(diff)})`);
            results.push({
                asset: asset.code,
                status: 'PASS',
                message: 'Monthly depreciation correct',
                expected: expectedMonthly,
                actual: actualMonthly,
            });
        } else {
            console.log(`   ❌ FAIL (diff: ${formatMoney(diff)})`);
            results.push({
                asset: asset.code,
                status: 'FAIL',
                message: `Monthly depreciation mismatch`,
                expected: expectedMonthly,
                actual: actualMonthly,
                diff,
            });
        }

        // Check accumulated depreciation
        const schedule = asset.depreciation_schedules[0];
        if (schedule) {
            console.log(`\n   📅 Latest Schedule (${schedule.period}):`);
            console.log(`   Depreciation: ${formatMoney(schedule.depreciation_amount)}`);
            console.log(`   Accumulated:  ${formatMoney(schedule.accumulated_amount)}`);
            console.log(`   Remaining:    ${formatMoney(schedule.remaining_value)}`);

            // Verify: remaining = original - accumulated
            const expectedRemaining = Number(asset.original_cost) - Number(schedule.accumulated_amount);
            const actualRemaining = Number(schedule.remaining_value);
            const remainingDiff = Math.abs(expectedRemaining - actualRemaining);

            if (remainingDiff <= tolerance) {
                console.log(`   ✅ Remaining value correct`);
            } else {
                console.log(`   ❌ Remaining value mismatch!`);
                console.log(`      Expected: ${formatMoney(expectedRemaining)}`);
                console.log(`      Actual:   ${formatMoney(actualRemaining)}`);
                results.push({
                    asset: asset.code,
                    status: 'FAIL',
                    message: `Remaining value mismatch`,
                    expected: expectedRemaining,
                    actual: actualRemaining,
                    diff: remainingDiff,
                });
            }

            // Verify: book_value on asset matches remaining
            const bookValueDiff = Math.abs(Number(asset.book_value) - actualRemaining);
            if (bookValueDiff <= tolerance) {
                console.log(`   ✅ Book value synced`);
            } else {
                console.log(`   ❌ Book value not synced with schedule!`);
                results.push({
                    asset: asset.code,
                    status: 'FAIL',
                    message: `Book value not synced`,
                    expected: actualRemaining,
                    actual: Number(asset.book_value),
                });
            }
        }

        // Check accumulated on asset record
        console.log(`\n   💰 Asset Record:`);
        console.log(`   Original Cost:    ${formatMoney(asset.original_cost)}`);
        console.log(`   Accumulated:      ${formatMoney(asset.accumulated_depreciation)}`);
        console.log(`   Book Value:       ${formatMoney(asset.book_value)}`);

        const assetCalc = Number(asset.original_cost) - Number(asset.accumulated_depreciation);
        const assetBookDiff = Math.abs(assetCalc - Number(asset.book_value));

        if (assetBookDiff <= tolerance) {
            console.log(`   ✅ Asset record consistent`);
        } else {
            console.log(`   ❌ Asset record inconsistent!`);
            console.log(`      original - accumulated = ${formatMoney(assetCalc)}`);
            console.log(`      book_value = ${formatMoney(asset.book_value)}`);
            results.push({
                asset: asset.code,
                status: 'FAIL',
                message: `Asset record inconsistent: original - accumulated ≠ book_value`,
            });
        }
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 SUMMARY\n');

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const warned = results.filter(r => r.status === 'WARN').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warned}`);

    if (failed > 0) {
        console.log('\n❌ FAILED TESTS:');
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`   ${r.asset}: ${r.message}`);
            if (r.expected !== undefined) {
                console.log(`      Expected: ${formatMoney(r.expected)}, Actual: ${formatMoney(r.actual)}`);
            }
        });
    }

    // Test specific cases from screenshot
    console.log('\n\n📋 VERIFYING SCREENSHOT DATA:');
    console.log('─'.repeat(60));

    const screenshotData = [
        { code: 'TSCD-0014', name: 'Máy cày Kubota L3608', khauHao: 1_250_000, luyKe: 1_250_000, conLai: 148_750_000 },
        { code: 'TS-001', name: 'Máy cày Kubota', khauHao: 3_750_000, luyKe: 41_000_000, conLai: 405_000_000 },
        { code: 'TS-002', name: 'Xe tải Hyundai', khauHao: 5_666_666.67, luyKe: 68_000_000, conLai: 612_000_000 },
        { code: 'TS-003', name: 'Xe Toyota Camry (< 9 chỗ)', khauHao: 15_000_000, luyKe: 180_000_000, conLai: 1_620_000_000 },
        { code: 'TSCD-0005', name: 'BYD', khauHao: 20_833_333, luyKe: 20_833_333, conLai: 1_979_166_667 },
    ];

    for (const expected of screenshotData) {
        const asset = assets.find(a => a.code === expected.code);
        if (!asset) {
            console.log(`\n❓ ${expected.code} not found in database`);
            continue;
        }

        console.log(`\n📦 ${expected.code} - ${expected.name}`);

        const actualMonthly = Number(asset.monthly_depreciation);
        const monthlyMatch = Math.abs(actualMonthly - expected.khauHao) < 1;
        console.log(`   Khấu hao/tháng: ${monthlyMatch ? '✅' : '❌'} Expected ${formatMoney(expected.khauHao)}, DB has ${formatMoney(actualMonthly)}`);

        // Special check for TS-003 (Toyota Camry < 9 seats)
        if (expected.code === 'TS-003') {
            console.log(`   ⚠️  NOTE: Xe < 9 chỗ - VAT không được khấu trừ!`);
            console.log(`   ⚠️  Giá 1.8B, nhưng khấu hao vẫn tính trên full value?`);
            // For CIT purposes, depreciation should be capped at 1.6B
            const cappedMonthly = VEHICLE_CAP / asset.useful_life_months;
            console.log(`   ⚠️  If capped: ${formatMoney(cappedMonthly)}/month`);
        }
    }

    await prisma.$disconnect();
}

function formatMoney(value: number | Decimal | null | undefined): string {
    if (value === null || value === undefined) return '0đ';
    const num = typeof value === 'number' ? value : Number(value);
    return new Intl.NumberFormat('vi-VN').format(Math.round(num)) + 'đ';
}

main().catch(console.error);
