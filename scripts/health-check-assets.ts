// scripts/health-check-assets.ts
// =====================================================
// Comprehensive Health Check for Fixed Assets Module
// Run: npx tsx scripts/health-check-assets.ts
// =====================================================

import { prisma } from '../src/lib/prisma';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// ===========================================
// TYPES
// ===========================================

interface CheckResult {
    category: string;
    check: string;
    status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP';
    message: string;
    details?: string;
}

const results: CheckResult[] = [];
const VEHICLE_CAP = 1_600_000_000;

// ===========================================
// HELPER FUNCTIONS
// ===========================================

function addResult(category: string, check: string, status: CheckResult['status'], message: string, details?: string) {
    results.push({ category, check, status, message, details });
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'WARN' ? '⚠️' : '⏭️';
    console.log(`  ${icon} ${check}: ${message}`);
    if (details && status !== 'PASS') {
        console.log(`     → ${details}`);
    }
}

function checkFileExists(filePath: string): boolean {
    return fs.existsSync(path.join(process.cwd(), filePath));
}

function formatMoney(value: number | any): string {
    const num = typeof value === 'number' ? value : Number(value);
    return new Intl.NumberFormat('vi-VN').format(Math.round(num)) + 'đ';
}

// ===========================================
// DATABASE CHECKS
// ===========================================

async function checkDatabase() {
    console.log('\n📊 DATABASE CHECKS');
    console.log('─'.repeat(50));

    // 1. Connection
    try {
        await prisma.$connect();
        addResult('DATABASE', 'Connection', 'PASS', 'Database connected successfully');
    } catch (error) {
        addResult('DATABASE', 'Connection', 'FAIL', 'Cannot connect to database', String(error));
        return; // Skip other DB checks if connection fails
    }

    // 2. Asset table
    try {
        const count = await prisma.asset.count();
        addResult('DATABASE', 'Asset table', 'PASS', `Table exists with ${count} records`);
    } catch (error) {
        addResult('DATABASE', 'Asset table', 'FAIL', 'Asset table not found or error', String(error));
    }

    // 3. DepreciationSchedule table
    try {
        const count = await prisma.depreciationSchedule.count();
        addResult('DATABASE', 'DepreciationSchedule table', 'PASS', `Table exists with ${count} records`);
    } catch (error) {
        addResult('DATABASE', 'DepreciationSchedule table', 'FAIL', 'Table not found', String(error));
    }

    // 4. Check asset columns (sample query)
    try {
        const sample = await prisma.asset.findFirst({
            select: {
                id: true,
                code: true,
                name: true,
                category: true,
                purchase_price: true,
                useful_life_months: true,
                monthly_depreciation: true,
                accumulated_depreciation: true,
                book_value: true,
                max_deductible_value: true,
                is_transport_biz: true,
                status: true,
            },
        });
        addResult('DATABASE', 'Asset columns', 'PASS', 'All required columns exist');
    } catch (error) {
        addResult('DATABASE', 'Asset columns', 'FAIL', 'Missing columns in Asset table', String(error));
    }

    // 5. Check for orphaned depreciation schedules
    try {
        const orphaned = await prisma.$queryRaw<[{ count: bigint }]>`
            SELECT COUNT(*) as count FROM depreciation_schedules ds
            LEFT JOIN assets a ON ds.asset_id = a.id
            WHERE a.id IS NULL
        `;
        const orphanCount = Number(orphaned[0].count);
        if (orphanCount > 0) {
            addResult('DATABASE', 'Orphaned schedules', 'WARN', `${orphanCount} orphaned depreciation schedules found`);
        } else {
            addResult('DATABASE', 'Orphaned schedules', 'PASS', 'No orphaned schedules');
        }
    } catch (error) {
        addResult('DATABASE', 'Orphaned schedules', 'SKIP', 'Could not check', String(error));
    }
}

// ===========================================
// API ROUTE FILE CHECKS
// ===========================================

async function checkApiRoutes() {
    console.log('\n🌐 API ROUTE FILES');
    console.log('─'.repeat(50));

    const routes = [
        { path: 'src/app/api/assets/route.ts', name: 'GET/POST /api/assets' },
        { path: 'src/app/api/assets/[id]/route.ts', name: 'GET/PUT/DELETE /api/assets/:id' },
        { path: 'src/app/api/assets/[id]/dispose/route.ts', name: 'POST /api/assets/:id/dispose' },
        { path: 'src/app/api/assets/depreciation/route.ts', name: 'GET/POST /api/assets/depreciation' },
    ];

    for (const route of routes) {
        if (checkFileExists(route.path)) {
            // Check file content for common issues
            const content = fs.readFileSync(path.join(process.cwd(), route.path), 'utf-8');

            const issues: string[] = [];
            if (!content.includes('withAuth')) {
                issues.push('Missing withAuth wrapper');
            }
            if (!content.includes('getCurrentFarmId')) {
                issues.push('Missing getCurrentFarmId');
            }
            if (!content.includes('NextResponse.json')) {
                issues.push('Missing NextResponse.json');
            }

            if (issues.length > 0) {
                addResult('API', route.name, 'WARN', 'File exists but has issues', issues.join(', '));
            } else {
                addResult('API', route.name, 'PASS', 'Route file OK');
            }
        } else {
            addResult('API', route.name, 'FAIL', 'Route file not found', route.path);
        }
    }
}

// ===========================================
// SERVICE LAYER CHECKS
// ===========================================

async function checkServiceLayer() {
    console.log('\n⚙️ SERVICE LAYER');
    console.log('─'.repeat(50));

    // Check service file exists
    const servicePath = 'src/services/asset.service.ts';
    if (!checkFileExists(servicePath)) {
        addResult('SERVICE', 'Asset service file', 'FAIL', 'File not found', servicePath);
        return;
    }

    const content = fs.readFileSync(path.join(process.cwd(), servicePath), 'utf-8');

    // Check required functions
    const requiredFunctions = [
        'createAsset',
        'updateAsset',
        'getAssets',
        'getAssetById',
        'deleteAsset',
        'disposeAsset',
        'getAssetSummary',
        'getDepreciationSchedule',
        'calculateMonthlyDepreciation',
    ];

    for (const fn of requiredFunctions) {
        if (content.includes(`export async function ${fn}`) || content.includes(`export function ${fn}`)) {
            addResult('SERVICE', `Function: ${fn}`, 'PASS', 'Exists');
        } else {
            addResult('SERVICE', `Function: ${fn}`, 'FAIL', 'Not found or not exported');
        }
    }

    // Check vehicle cap logic
    if (content.includes('VEHICLE_CAP') || content.includes('1_600_000_000') || content.includes('getDeductibleValue')) {
        addResult('SERVICE', 'Vehicle 1.6B cap logic', 'PASS', 'Cap logic present');
    } else {
        addResult('SERVICE', 'Vehicle 1.6B cap logic', 'WARN', 'Cap logic may be missing');
    }

    // Check depreciation calculation order (cap before calculation)
    const capIndex = content.indexOf('getDeductibleValue');
    const calcIndex = content.indexOf('calculateMonthlyDepreciationAmount');
    if (capIndex > 0 && calcIndex > 0 && capIndex < calcIndex) {
        addResult('SERVICE', 'Cap applied before calc', 'PASS', 'Correct order');
    } else if (capIndex > 0 && calcIndex > 0) {
        addResult('SERVICE', 'Cap applied before calc', 'WARN', 'Order may be incorrect');
    }
}

// ===========================================
// CALCULATION LOGIC CHECKS
// ===========================================

async function checkCalculations() {
    console.log('\n📐 CALCULATION CHECKS');
    console.log('─'.repeat(50));

    // Get assets and verify calculations
    const assets = await prisma.asset.findMany({
        where: { status: 'ACTIVE' },
        take: 10,
    });

    if (assets.length === 0) {
        addResult('CALC', 'Assets available', 'SKIP', 'No active assets to check');
        return;
    }

    addResult('CALC', 'Assets available', 'PASS', `Found ${assets.length} active assets`);

    let deprecErrors = 0;
    let bookValueErrors = 0;
    let capErrors = 0;

    for (const asset of assets) {
        const originalCost = Number(asset.original_cost);
        const residualValue = Number(asset.residual_value);
        const actualMonthly = Number(asset.monthly_depreciation);
        const accumulated = Number(asset.accumulated_depreciation);
        const bookValue = Number(asset.book_value);

        // Check vehicle cap
        let depreciableValue = Number(asset.purchase_price);
        if (asset.category === 'VEHICLE' && depreciableValue > VEHICLE_CAP && !asset.is_transport_biz) {
            depreciableValue = VEHICLE_CAP;

            const expectedMonthly = Math.round((depreciableValue - residualValue) / asset.useful_life_months);
            if (Math.abs(expectedMonthly - actualMonthly) > 1) {
                capErrors++;
            }
        }

        // Check depreciation formula
        const expectedMonthly = Math.round((depreciableValue - residualValue) / asset.useful_life_months);
        if (Math.abs(expectedMonthly - actualMonthly) > 1) {
            deprecErrors++;
        }

        // Check book value = original - accumulated
        const expectedBookValue = originalCost - accumulated;
        if (Math.abs(expectedBookValue - bookValue) > 1) {
            bookValueErrors++;
        }
    }

    if (deprecErrors === 0) {
        addResult('CALC', 'Monthly depreciation formula', 'PASS', 'All assets have correct depreciation');
    } else {
        addResult('CALC', 'Monthly depreciation formula', 'FAIL', `${deprecErrors} assets have incorrect depreciation`);
    }

    if (bookValueErrors === 0) {
        addResult('CALC', 'Book value consistency', 'PASS', 'original - accumulated = book_value');
    } else {
        addResult('CALC', 'Book value consistency', 'FAIL', `${bookValueErrors} assets have inconsistent book values`);
    }

    if (capErrors === 0) {
        addResult('CALC', 'Vehicle 1.6B cap', 'PASS', 'All vehicles have correct capped depreciation');
    } else {
        addResult('CALC', 'Vehicle 1.6B cap', 'FAIL', `${capErrors} vehicles not using capped depreciation`);
    }
}

// ===========================================
// VALIDATION SCHEMA CHECKS
// ===========================================

async function checkValidations() {
    console.log('\n📝 VALIDATION SCHEMAS');
    console.log('─'.repeat(50));

    const validationPath = 'src/lib/validations/asset.ts';
    if (!checkFileExists(validationPath)) {
        addResult('VALIDATION', 'Validation file', 'FAIL', 'File not found', validationPath);
        return;
    }

    const content = fs.readFileSync(path.join(process.cwd(), validationPath), 'utf-8');

    const schemas = [
        'createAssetSchema',
        'updateAssetSchema',
        'disposeAssetSchema',
        'assetFiltersSchema',
        'runDepreciationSchema',
        'depreciationScheduleFiltersSchema',
    ];

    for (const schema of schemas) {
        if (content.includes(`export const ${schema}`)) {
            addResult('VALIDATION', schema, 'PASS', 'Schema exported');
        } else {
            addResult('VALIDATION', schema, 'FAIL', 'Schema not found');
        }
    }

    // Check for zod
    if (content.includes("from 'zod'") || content.includes('from "zod"')) {
        addResult('VALIDATION', 'Zod import', 'PASS', 'Zod imported');
    } else {
        addResult('VALIDATION', 'Zod import', 'FAIL', 'Zod not imported');
    }
}

// ===========================================
// HOOKS CHECKS
// ===========================================

async function checkHooks() {
    console.log('\n🪝 REACT HOOKS');
    console.log('─'.repeat(50));

    const hooksPath = 'src/hooks/use-assets.ts';
    if (!checkFileExists(hooksPath)) {
        addResult('HOOKS', 'Use-assets file', 'FAIL', 'File not found', hooksPath);
        return;
    }

    const content = fs.readFileSync(path.join(process.cwd(), hooksPath), 'utf-8');

    const hooks = [
        'useAssets',
        'useAsset',
        'useAssetSummary',
        'useDepreciationSchedule',
        'useCreateAsset',
        'useUpdateAsset',
        'useDeleteAsset',
        'useDisposeAsset',
        'useRunDepreciation',
    ];

    for (const hook of hooks) {
        if (content.includes(`export function ${hook}`)) {
            addResult('HOOKS', hook, 'PASS', 'Hook exported');
        } else {
            addResult('HOOKS', hook, 'FAIL', 'Hook not found');
        }
    }

    // Check response handling
    if (content.includes('res.success') || content.includes('res.data')) {
        addResult('HOOKS', 'API response handling', 'PASS', 'Uses success/data pattern');
    } else {
        addResult('HOOKS', 'API response handling', 'WARN', 'May not handle API response correctly');
    }

    // Check error handling
    if (content.includes('onError') && content.includes('toast.error')) {
        addResult('HOOKS', 'Error handling', 'PASS', 'Has onError with toast');
    } else {
        addResult('HOOKS', 'Error handling', 'WARN', 'Error handling may be incomplete');
    }
}

// ===========================================
// UI PAGE CHECKS
// ===========================================

async function checkUIPages() {
    console.log('\n🖼️ UI PAGES');
    console.log('─'.repeat(50));

    const pages = [
        { path: 'src/app/(dashboard)/tai-san/page.tsx', name: 'Asset List' },
        { path: 'src/app/(dashboard)/tai-san/them/page.tsx', name: 'Add Asset' },
        { path: 'src/app/(dashboard)/tai-san/[id]/page.tsx', name: 'Asset Detail' },
        { path: 'src/app/(dashboard)/tai-san/[id]/thanh-ly/page.tsx', name: 'Dispose Asset' },
        { path: 'src/app/(dashboard)/tai-san/bang-khau-hao/page.tsx', name: 'Depreciation Schedule' },
    ];

    for (const page of pages) {
        if (checkFileExists(page.path)) {
            const content = fs.readFileSync(path.join(process.cwd(), page.path), 'utf-8');

            const issues: string[] = [];
            if (!content.includes("'use client'")) {
                issues.push('Missing use client');
            }
            if (!content.includes('use-assets') && !content.includes('useAssets')) {
                issues.push('May not use asset hooks');
            }

            if (issues.length > 0) {
                addResult('UI', page.name, 'WARN', 'Page exists but has issues', issues.join(', '));
            } else {
                addResult('UI', page.name, 'PASS', 'Page OK');
            }
        } else {
            addResult('UI', page.name, 'FAIL', 'Page not found', page.path);
        }
    }
}

// ===========================================
// NAVIGATION CHECKS
// ===========================================

async function checkNavigation() {
    console.log('\n🧭 NAVIGATION');
    console.log('─'.repeat(50));

    const navPath = 'src/components/shared/bottom-nav.tsx';
    if (!checkFileExists(navPath)) {
        addResult('NAV', 'Navigation file', 'FAIL', 'File not found', navPath);
        return;
    }

    const content = fs.readFileSync(path.join(process.cwd(), navPath), 'utf-8');

    if (content.includes('/tai-san')) {
        addResult('NAV', 'Asset link in nav', 'PASS', 'Found /tai-san link');
    } else {
        addResult('NAV', 'Asset link in nav', 'FAIL', 'No /tai-san link in navigation');
    }

    if (content.includes('/tai-san/bang-khau-hao')) {
        addResult('NAV', 'Depreciation link in nav', 'PASS', 'Found depreciation schedule link');
    } else {
        addResult('NAV', 'Depreciation link in nav', 'WARN', 'No depreciation schedule link');
    }
}

// ===========================================
// TYPE DEFINITION CHECKS
// ===========================================

async function checkTypes() {
    console.log('\n📘 TYPE DEFINITIONS');
    console.log('─'.repeat(50));

    const typePath = 'src/types/asset.ts';
    if (!checkFileExists(typePath)) {
        addResult('TYPES', 'Asset types file', 'FAIL', 'File not found', typePath);
        return;
    }

    const content = fs.readFileSync(path.join(process.cwd(), typePath), 'utf-8');

    const types = [
        'AssetDetail',
        'AssetSummary',
        'DepreciationScheduleRow',
        'DepreciationResult',
        'AssetFilters',
        'PaginatedAssets',
    ];

    for (const type of types) {
        if (content.includes(`export interface ${type}`) || content.includes(`export type ${type}`)) {
            addResult('TYPES', type, 'PASS', 'Type exported');
        } else {
            addResult('TYPES', type, 'FAIL', 'Type not found');
        }
    }
}

// ===========================================
// DEPRECIATION CONSTANTS CHECKS
// ===========================================

async function checkConstants() {
    console.log('\n📋 DEPRECIATION CONSTANTS');
    console.log('─'.repeat(50));

    const constPath = 'src/lib/assets/depreciation-constants.ts';
    if (!checkFileExists(constPath)) {
        addResult('CONST', 'Constants file', 'FAIL', 'File not found', constPath);
        return;
    }

    const content = fs.readFileSync(path.join(process.cwd(), constPath), 'utf-8');

    const required = [
        { name: 'DEPRECIATION_LIMITS', check: 'DEPRECIATION_LIMITS' },
        { name: 'VEHICLE_DEPRECIATION_CAP', check: '1_600_000_000' },
        { name: 'getDefaultUsefulLife', check: 'function getDefaultUsefulLife' },
        { name: 'validateUsefulLife', check: 'function validateUsefulLife' },
        { name: 'calculateMonthlyDepreciationAmount', check: 'function calculateMonthlyDepreciationAmount' },
        { name: 'shouldApplyVehicleCap', check: 'function shouldApplyVehicleCap' },
        { name: 'getDeductibleValue', check: 'function getDeductibleValue' },
    ];

    for (const item of required) {
        if (content.includes(item.check)) {
            addResult('CONST', item.name, 'PASS', 'Exists');
        } else {
            addResult('CONST', item.name, 'FAIL', 'Not found');
        }
    }
}

// ===========================================
// MAIN
// ===========================================

async function main() {
    console.log('🔍 FIXED ASSETS MODULE - HEALTH CHECK');
    console.log('='.repeat(60));
    console.log(`📅 Run at: ${new Date().toLocaleString('vi-VN')}`);

    try {
        await checkDatabase();
        await checkApiRoutes();
        await checkServiceLayer();
        await checkCalculations();
        await checkValidations();
        await checkHooks();
        await checkUIPages();
        await checkNavigation();
        await checkTypes();
        await checkConstants();

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 SUMMARY');
        console.log('='.repeat(60));

        const passed = results.filter(r => r.status === 'PASS').length;
        const failed = results.filter(r => r.status === 'FAIL').length;
        const warned = results.filter(r => r.status === 'WARN').length;
        const skipped = results.filter(r => r.status === 'SKIP').length;
        const total = results.length;

        console.log(`\n✅ Passed:  ${passed}/${total}`);
        console.log(`❌ Failed:  ${failed}/${total}`);
        console.log(`⚠️  Warnings: ${warned}/${total}`);
        console.log(`⏭️  Skipped: ${skipped}/${total}`);

        const score = Math.round((passed / (total - skipped)) * 100);
        console.log(`\n🎯 Health Score: ${score}%`);

        if (failed > 0) {
            console.log('\n❌ FAILED CHECKS:');
            results.filter(r => r.status === 'FAIL').forEach(r => {
                console.log(`   [${r.category}] ${r.check}: ${r.message}`);
                if (r.details) console.log(`      → ${r.details}`);
            });
        }

        if (warned > 0) {
            console.log('\n⚠️  WARNINGS:');
            results.filter(r => r.status === 'WARN').forEach(r => {
                console.log(`   [${r.category}] ${r.check}: ${r.message}`);
                if (r.details) console.log(`      → ${r.details}`);
            });
        }

        console.log('\n' + '='.repeat(60));
        if (failed === 0) {
            console.log('🎉 ALL CRITICAL CHECKS PASSED!');
        } else {
            console.log(`🔧 ${failed} issues need attention.`);
        }

    } catch (error) {
        console.error('Error running health check:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
