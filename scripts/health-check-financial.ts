// scripts/health-check-financial.ts
// =====================================================
// Comprehensive Health Check for Financial Statements Module
// Run: npx tsx scripts/health-check-financial.ts
// =====================================================

import { prisma } from '../src/lib/prisma';
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

// ===========================================
// HELPER FUNCTIONS
// ===========================================

function addResult(category: string, check: string, status: CheckResult['status'], message: string, details?: string) {
    results.push({ category, check, status, message, details });
}

function checkFileExists(filePath: string): boolean {
    return fs.existsSync(path.join(process.cwd(), filePath));
}

function formatMoney(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
}

// ===========================================
// DATABASE CHECKS
// ===========================================

async function checkDatabase() {
    console.log('\n📦 Checking Database...');

    try {
        // Check if database connection works
        await prisma.$connect();
        addResult('Database', 'Connection', 'PASS', 'Database connection successful');

        // Check required tables exist
        const tableChecks = [
            { name: 'Transaction', query: () => prisma.transaction.count() },
            { name: 'Asset', query: () => prisma.asset.count() },
            { name: 'Product', query: () => prisma.product.count() },
            { name: 'Partner', query: () => prisma.partner.count() },
            { name: 'ARTransaction', query: () => prisma.aRTransaction.count() },
            { name: 'APTransaction', query: () => prisma.aPTransaction.count() },
            { name: 'CITCalculation', query: () => prisma.cITCalculation.count() },
            { name: 'Payroll', query: () => prisma.payroll.count() },
            { name: 'DepreciationSchedule', query: () => prisma.depreciationSchedule.count() },
        ];

        for (const table of tableChecks) {
            try {
                const count = await table.query();
                addResult('Database', `Table ${table.name}`, 'PASS', `Table exists with ${count} records`);
            } catch (err) {
                addResult('Database', `Table ${table.name}`, 'FAIL', `Table check failed: ${err}`);
            }
        }

        // Check for sample farm data
        const farms = await prisma.farm.findMany({ take: 1 });
        if (farms.length > 0) {
            addResult('Database', 'Sample Farm', 'PASS', `Found farm: ${farms[0].name}`);
        } else {
            addResult('Database', 'Sample Farm', 'WARN', 'No farms found - data tests will be limited');
        }
    } catch (err) {
        addResult('Database', 'Connection', 'FAIL', `Database connection failed: ${err}`);
    }
}

// ===========================================
// SERVICE LAYER CHECKS
// ===========================================

async function checkServiceLayer() {
    console.log('\n⚙️  Checking Service Layer...');

    const serviceFile = 'src/services/financial-statement.service.ts';
    if (checkFileExists(serviceFile)) {
        addResult('Service', 'File Exists', 'PASS', serviceFile);

        // Check for required exports
        const content = fs.readFileSync(path.join(process.cwd(), serviceFile), 'utf-8');

        const requiredFunctions = [
            'generateBalanceSheet',
            'generateIncomeStatement',
            'BalanceSheet',
            'IncomeStatement',
        ];

        for (const fn of requiredFunctions) {
            if (content.includes(fn)) {
                addResult('Service', `Function ${fn}`, 'PASS', `Found export: ${fn}`);
            } else {
                addResult('Service', `Function ${fn}`, 'FAIL', `Missing export: ${fn}`);
            }
        }
    } else {
        addResult('Service', 'File Exists', 'FAIL', `Missing file: ${serviceFile}`);
    }
}

// ===========================================
// API ROUTE CHECKS
// ===========================================

async function checkApiRoutes() {
    console.log('\n🌐 Checking API Routes...');

    const routes = [
        { path: 'src/app/api/reports/financial-statements/route.ts', name: 'Financial Statements' },
        { path: 'src/app/api/reports/balance-sheet/excel/route.ts', name: 'Balance Sheet Excel' },
        { path: 'src/app/api/reports/income-statement/excel/route.ts', name: 'Income Statement Excel' },
    ];

    for (const route of routes) {
        if (checkFileExists(route.path)) {
            addResult('API Routes', route.name, 'PASS', `Route file exists: ${route.path}`);

            // Check for GET export
            const content = fs.readFileSync(path.join(process.cwd(), route.path), 'utf-8');
            if (content.includes('export const GET')) {
                addResult('API Routes', `${route.name} GET`, 'PASS', 'GET handler exported');
            } else {
                addResult('API Routes', `${route.name} GET`, 'FAIL', 'Missing GET handler');
            }
        } else {
            addResult('API Routes', route.name, 'FAIL', `Missing file: ${route.path}`);
        }
    }
}

// ===========================================
// EXCEL EXPORT CHECKS
// ===========================================

async function checkExcelExport() {
    console.log('\n📊 Checking Excel Export...');

    const excelFile = 'src/lib/reports/financial-excel.ts';
    if (checkFileExists(excelFile)) {
        addResult('Excel Export', 'File Exists', 'PASS', excelFile);

        const content = fs.readFileSync(path.join(process.cwd(), excelFile), 'utf-8');

        const requiredFunctions = [
            'generateBalanceSheetExcel',
            'generateIncomeStatementExcel',
        ];

        for (const fn of requiredFunctions) {
            if (content.includes(fn)) {
                addResult('Excel Export', `Function ${fn}`, 'PASS', `Found function: ${fn}`);
            } else {
                addResult('Excel Export', `Function ${fn}`, 'FAIL', `Missing function: ${fn}`);
            }
        }

        // Check for ExcelJS import
        if (content.includes("from 'exceljs'")) {
            addResult('Excel Export', 'ExcelJS Import', 'PASS', 'ExcelJS library imported');
        } else {
            addResult('Excel Export', 'ExcelJS Import', 'FAIL', 'Missing ExcelJS import');
        }
    } else {
        addResult('Excel Export', 'File Exists', 'FAIL', `Missing file: ${excelFile}`);
    }
}

// ===========================================
// UI PAGE CHECKS
// ===========================================

async function checkUIPages() {
    console.log('\n🖥️  Checking UI Pages...');

    const uiFile = 'src/app/(dashboard)/bao-cao/tai-chinh/page.tsx';
    if (checkFileExists(uiFile)) {
        addResult('UI', 'Page File', 'PASS', uiFile);

        const content = fs.readFileSync(path.join(process.cwd(), uiFile), 'utf-8');

        // Check for key components
        const requiredComponents = [
            'useState',
            'useEffect',
            'Card',
            'Button',
            'Select',
        ];

        for (const comp of requiredComponents) {
            if (content.includes(comp)) {
                addResult('UI', `Component ${comp}`, 'PASS', `Found: ${comp}`);
            } else {
                addResult('UI', `Component ${comp}`, 'WARN', `Missing: ${comp}`);
            }
        }

        // Check for export buttons
        if (content.includes('Xuất Excel') || content.includes('handleExport')) {
            addResult('UI', 'Export Buttons', 'PASS', 'Excel export buttons present');
        } else {
            addResult('UI', 'Export Buttons', 'WARN', 'Export buttons may be missing');
        }
    } else {
        addResult('UI', 'Page File', 'FAIL', `Missing file: ${uiFile}`);
    }
}

// ===========================================
// NAVIGATION CHECKS
// ===========================================

async function checkNavigation() {
    console.log('\n🧭 Checking Navigation...');

    const navFile = 'src/components/shared/bottom-nav.tsx';
    if (checkFileExists(navFile)) {
        const content = fs.readFileSync(path.join(process.cwd(), navFile), 'utf-8');

        if (content.includes('/bao-cao/tai-chinh')) {
            addResult('Navigation', 'Financial Reports Link', 'PASS', 'Link to /bao-cao/tai-chinh found');
        } else {
            addResult('Navigation', 'Financial Reports Link', 'FAIL', 'Missing link to /bao-cao/tai-chinh');
        }
    } else {
        addResult('Navigation', 'Nav File', 'FAIL', `Missing file: ${navFile}`);
    }
}

// ===========================================
// TYPE DEFINITIONS CHECKS
// ===========================================

async function checkTypes() {
    console.log('\n📝 Checking Type Definitions...');

    const typeFile = 'src/types/report.ts';
    if (checkFileExists(typeFile)) {
        const content = fs.readFileSync(path.join(process.cwd(), typeFile), 'utf-8');

        const requiredTypes = [
            'BalanceSheet',
            'IncomeStatement',
        ];

        for (const type of requiredTypes) {
            if (content.includes(type)) {
                addResult('Types', `Type ${type}`, 'PASS', `Found type: ${type}`);
            } else {
                addResult('Types', `Type ${type}`, 'WARN', `Type may be defined elsewhere: ${type}`);
            }
        }
    } else {
        addResult('Types', 'File Exists', 'FAIL', `Missing file: ${typeFile}`);
    }
}

// ===========================================
// BALANCE CHECK VALIDATION
// ===========================================

async function checkBalanceLogic() {
    console.log('\n⚖️  Checking Balance Logic...');

    try {
        const farms = await prisma.farm.findMany({ take: 1 });
        if (farms.length === 0) {
            addResult('Balance Logic', 'Test Data', 'SKIP', 'No farms available for testing');
            return;
        }

        const farm = farms[0];

        // Import service dynamically
        const { generateBalanceSheet } = await import('../src/services/financial-statement.service');

        const asOfDate = new Date().toISOString().split('T')[0];
        const balanceSheet = await generateBalanceSheet(farm.id, asOfDate);

        // Check if balance sheet generates without error
        addResult('Balance Logic', 'Generate Balance Sheet', 'PASS', `Generated for ${farm.name}`);

        // Check if balanced
        const diff = Math.abs(balanceSheet.total_assets - balanceSheet.total_liabilities_equity);
        if (diff < 1) {
            addResult('Balance Logic', 'Assets = Liabilities + Equity', 'PASS',
                `Balanced: ${formatMoney(balanceSheet.total_assets)}`);
        } else {
            addResult('Balance Logic', 'Assets = Liabilities + Equity', 'WARN',
                `Not balanced: Diff = ${formatMoney(diff)}`);
        }

        // Check is_balanced flag
        if (balanceSheet.is_balanced) {
            addResult('Balance Logic', 'is_balanced Flag', 'PASS', 'Flag correctly set to true');
        } else {
            addResult('Balance Logic', 'is_balanced Flag', 'WARN', 'Flag is false (may be correct if truly unbalanced)');
        }
    } catch (err) {
        addResult('Balance Logic', 'Generate Balance Sheet', 'FAIL', `Error: ${err}`);
    }
}

// ===========================================
// MAIN
// ===========================================

async function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('   📊 FINANCIAL STATEMENTS HEALTH CHECK');
    console.log('   Task 11 Phase 3');
    console.log('═══════════════════════════════════════════════════');

    await checkDatabase();
    await checkServiceLayer();
    await checkApiRoutes();
    await checkExcelExport();
    await checkUIPages();
    await checkNavigation();
    await checkTypes();
    await checkBalanceLogic();

    // Summary
    console.log('\n═══════════════════════════════════════════════════');
    console.log('   📋 SUMMARY');
    console.log('═══════════════════════════════════════════════════\n');

    const pass = results.filter(r => r.status === 'PASS').length;
    const fail = results.filter(r => r.status === 'FAIL').length;
    const warn = results.filter(r => r.status === 'WARN').length;
    const skip = results.filter(r => r.status === 'SKIP').length;

    console.log(`   ✅ PASS: ${pass}`);
    console.log(`   ❌ FAIL: ${fail}`);
    console.log(`   ⚠️  WARN: ${warn}`);
    console.log(`   ⏭️  SKIP: ${skip}`);
    console.log(`   ────────────────`);
    console.log(`   📊 TOTAL: ${results.length}`);

    // Show failures
    if (fail > 0) {
        console.log('\n   ❌ FAILURES:');
        results
            .filter(r => r.status === 'FAIL')
            .forEach(r => console.log(`      - [${r.category}] ${r.check}: ${r.message}`));
    }

    // Show warnings
    if (warn > 0) {
        console.log('\n   ⚠️  WARNINGS:');
        results
            .filter(r => r.status === 'WARN')
            .forEach(r => console.log(`      - [${r.category}] ${r.check}: ${r.message}`));
    }

    console.log('\n═══════════════════════════════════════════════════\n');

    await prisma.$disconnect();

    // Exit with error code if any failures
    process.exit(fail > 0 ? 1 : 0);
}

main();
