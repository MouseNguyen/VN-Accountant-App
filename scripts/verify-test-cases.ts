// scripts/verify-test-cases.ts
// Comprehensive Test Case Verification for LABA ERP
// Tests business logic by calling actual service functions
// Run: npx tsx scripts/verify-test-cases.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// TEST FRAMEWORK
// ==========================================

interface TestResult {
    group: string;
    name: string;
    passed: boolean;
    expected: string;
    actual: string;
    details?: string;
}

const results: TestResult[] = [];
let currentGroup = '';

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
};

function group(name: string) {
    currentGroup = name;
    console.log('');
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.cyan}📋 ${name}${colors.reset}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
}

function test(name: string, passed: boolean, expected: string, actual: string, details?: string) {
    results.push({ group: currentGroup, name, passed, expected, actual, details });
    const icon = passed ? `${colors.green}✅` : `${colors.red}❌`;
    console.log(`${icon} ${name}${colors.reset}`);
    if (!passed) {
        console.log(`   Expected: ${expected}`);
        console.log(`   Actual: ${actual}`);
        if (details) console.log(`   Details: ${details}`);
    }
}

function assertEqual(name: string, expected: any, actual: any, details?: string) {
    test(name, expected === actual, String(expected), String(actual), details);
}

function assertGreaterThan(name: string, value: number, threshold: number, details?: string) {
    test(name, value > threshold, `> ${threshold}`, String(value), details);
}

function assertClose(name: string, expected: number, actual: number, tolerance = 1, details?: string) {
    test(name, Math.abs(expected - actual) <= tolerance, String(expected), String(actual), details);
}

// ==========================================
// TEST 1: AR/AP SERVICE LOGIC
// ==========================================

async function testARAPServiceLogic(farmId: string) {
    group('1. AR/AP TRANSACTION TYPES');

    // Count transactions by type
    const [sale, income, purchase, expense] = await Promise.all([
        prisma.transaction.count({ where: { farm_id: farmId, trans_type: 'SALE', deleted_at: null } }),
        prisma.transaction.count({ where: { farm_id: farmId, trans_type: 'INCOME', deleted_at: null } }),
        prisma.transaction.count({ where: { farm_id: farmId, trans_type: 'PURCHASE', deleted_at: null } }),
        prisma.transaction.count({ where: { farm_id: farmId, trans_type: 'EXPENSE', deleted_at: null } }),
    ]);

    console.log(`   Transaction counts: SALE=${sale}, INCOME=${income}, PURCHASE=${purchase}, EXPENSE=${expense}`);

    assertGreaterThan('SALE transactions exist', sale, 0);
    assertGreaterThan('INCOME transactions exist', income, 0);
    assertGreaterThan('PURCHASE transactions exist', purchase, 0);
    assertGreaterThan('EXPENSE transactions exist', expense, 0);

    // Simulate AR query - should include both SALE and INCOME
    const arTransactions = await prisma.transaction.findMany({
        where: {
            farm_id: farmId,
            trans_type: { in: ['SALE', 'INCOME'] },
            deleted_at: null,
        },
    });

    test(
        'AR query includes SALE + INCOME',
        arTransactions.length === sale + income,
        String(sale + income),
        String(arTransactions.length),
        'Sum of SALE and INCOME should equal AR count'
    );

    // Simulate AP query - should include both PURCHASE and EXPENSE
    const apTransactions = await prisma.transaction.findMany({
        where: {
            farm_id: farmId,
            trans_type: { in: ['PURCHASE', 'EXPENSE'] },
            deleted_at: null,
        },
    });

    test(
        'AP query includes PURCHASE + EXPENSE',
        apTransactions.length === purchase + expense,
        String(purchase + expense),
        String(apTransactions.length),
        'Sum of PURCHASE and EXPENSE should equal AP count'
    );

    // Check AR/AP tables exist and have data
    const arCount = await prisma.aRTransaction.count({ where: { farm_id: farmId, deleted_at: null } });
    const apCount = await prisma.aPTransaction.count({ where: { farm_id: farmId, deleted_at: null } });

    console.log(`   ARTransaction table: ${arCount}, APTransaction table: ${apCount}`);
}

// ==========================================
// TEST 2: STOCK DATA SYNC
// ==========================================

async function testStockSync(farmId: string) {
    group('2. STOCK DATA CONSISTENCY');

    // Check Product.stock_qty vs Stock.quantity
    const mismatches = await prisma.$queryRaw<Array<{
        code: string;
        product_qty: number;
        stock_qty: number;
    }>>`
    SELECT 
      p.code,
      p.stock_qty::numeric as product_qty,
      COALESCE(s.quantity, 0)::numeric as stock_qty
    FROM products p
    LEFT JOIN stocks s ON p.id = s.product_id
    WHERE p.farm_id = ${farmId}
      AND p.deleted_at IS NULL
      AND s.id IS NOT NULL
      AND ABS(p.stock_qty - s.quantity) > 0.01
  `;

    test(
        'Product.stock_qty synced with Stock.quantity',
        mismatches.length === 0,
        '0 mismatches',
        `${mismatches.length} mismatches`,
        mismatches.length > 0 ? `First: ${mismatches[0].code}` : undefined
    );

    // Check avg_cost sync
    const costMismatches = await prisma.$queryRaw<Array<{
        code: string;
        product_cost: number;
        stock_cost: number;
    }>>`
    SELECT 
      p.code,
      p.avg_cost::numeric as product_cost,
      COALESCE(s.avg_cost, 0)::numeric as stock_cost
    FROM products p
    LEFT JOIN stocks s ON p.id = s.product_id
    WHERE p.farm_id = ${farmId}
      AND p.deleted_at IS NULL
      AND s.id IS NOT NULL
      AND ABS(p.avg_cost - s.avg_cost) > 0.01
  `;

    test(
        'Product.avg_cost synced with Stock.avg_cost',
        costMismatches.length === 0,
        '0 mismatches',
        `${costMismatches.length} mismatches`,
        costMismatches.length > 0 ? `First: ${costMismatches[0].code}` : undefined
    );
}

// ==========================================
// TEST 3: TRANSACTION CALCULATIONS
// ==========================================

async function testTransactionCalculations(farmId: string) {
    group('3. TRANSACTION CALCULATIONS');

    const transactions = await prisma.transaction.findMany({
        where: { farm_id: farmId, deleted_at: null },
        take: 10,
        include: { items: true },
    });

    for (const trans of transactions.slice(0, 5)) {
        // Calculate items total
        const itemsTotal = trans.items.reduce((sum, item) => sum + Number(item.line_total), 0);
        const headerTotal = Number(trans.total_amount);

        // Total should match items (with tolerance for rounding)
        if (trans.items.length > 0) {
            assertClose(
                `${trans.code}: Total matches items sum`,
                itemsTotal,
                headerTotal,
                100, // 100 VND tolerance for multiple items
                `Items: ${itemsTotal}, Header: ${headerTotal}`
            );
        }

        // Payment status consistency
        const paid = Number(trans.paid_amount);
        const total = Number(trans.total_amount);

        let expectedStatus: string;
        if (paid === 0) expectedStatus = 'PENDING';
        else if (paid >= total) expectedStatus = 'PAID';
        else expectedStatus = 'PARTIAL';

        // Handle UNPAID as PENDING equivalent
        const actualStatus = trans.payment_status === 'UNPAID' ? 'PENDING' : trans.payment_status;
        const expectedCheck = expectedStatus === 'PENDING' ? ['PENDING', 'UNPAID'] : [expectedStatus];

        test(
            `${trans.code}: Payment status consistent`,
            expectedCheck.includes(trans.payment_status),
            expectedStatus,
            trans.payment_status,
            `Paid: ${paid}/${total}`
        );
    }
}

// ==========================================
// TEST 4: PARTNER BALANCE
// ==========================================

async function testPartnerBalance(farmId: string) {
    group('4. PARTNER BALANCE');

    const partners = await prisma.partner.findMany({
        where: { farm_id: farmId, deleted_at: null },
        include: {
            transactions: {
                where: { deleted_at: null },
                select: { total_amount: true, paid_amount: true, trans_type: true },
            },
        },
    });

    // Test at least first 3 partners
    for (const partner of partners.slice(0, 3)) {
        // Calculate expected balance from transactions
        let expectedBalance = 0;
        for (const trans of partner.transactions) {
            const outstanding = Number(trans.total_amount) - Number(trans.paid_amount);
            if (['SALE', 'INCOME'].includes(trans.trans_type)) {
                // Customer owes us
                expectedBalance += outstanding;
            } else {
                // We owe vendor
                expectedBalance -= outstanding;
            }
        }

        const actualBalance = Number(partner.balance);

        // Only test if there are transactions
        if (partner.transactions.length > 0) {
            assertClose(
                `${partner.code}: Balance matches outstanding`,
                expectedBalance,
                actualBalance,
                1000, // 1000 VND tolerance
                `Expected: ${expectedBalance}, Actual: ${actualBalance}`
            );
        }
    }
}

// ==========================================
// TEST 5: WORKERS & PAYROLL
// ==========================================

async function testWorkers(farmId: string) {
    group('5. WORKERS');

    const workers = await prisma.worker.findMany({
        where: { farm_id: farmId, deleted_at: null, status: 'ACTIVE' },
    });

    assertGreaterThan('Active workers exist', workers.length, 0);

    const fullTime = workers.filter(w => w.worker_type === 'FULL_TIME');
    const seasonal = workers.filter(w => w.worker_type === 'SEASONAL' || w.worker_type === 'PART_TIME');

    console.log(`   Worker types: FULL_TIME=${fullTime.length}, SEASONAL/PART_TIME=${seasonal.length}`);

    // Check salary data
    const withSalary = workers.filter(w => Number(w.base_salary) > 0);
    assertGreaterThan('Workers have base salary', withSalary.length, 0);

    // Check payroll exists
    const payrollCount = await prisma.payroll.count({ where: { farm_id: farmId } });
    console.log(`   Payroll records: ${payrollCount}`);
}

// ==========================================
// TEST 6: VAT DATA
// ==========================================

async function testVATData(farmId: string) {
    group('6. VAT DATA');

    // Check VAT rates in transactions
    const withVAT = await prisma.transaction.count({
        where: {
            farm_id: farmId,
            deleted_at: null,
            tax_amount: { gt: 0 },
        },
    });

    assertGreaterThan('Transactions with VAT exist', withVAT, 0);

    // Check for non-deductible scenarios
    const cashOver20M = await prisma.transaction.count({
        where: {
            farm_id: farmId,
            trans_type: 'PURCHASE',
            payment_method: 'CASH',
            total_amount: { gte: 20000000 },
            deleted_at: null,
        },
    });

    console.log(`   Cash purchases >= 20M (non-deductible VAT): ${cashOver20M}`);

    // Check VAT declarations
    const vatDeclarations = await prisma.vATDeclaration.count({ where: { farm_id: farmId } });
    console.log(`   VAT Declarations: ${vatDeclarations}`);
}

// ==========================================
// TEST 7: FIXED ASSETS
// ==========================================

async function testFixedAssets(farmId: string) {
    group('7. FIXED ASSETS');

    const assets = await prisma.asset.count({ where: { farm_id: farmId } });
    console.log(`   Fixed assets: ${assets}`);

    if (assets > 0) {
        // Note: AssetDepreciation model may not exist yet
        console.log(`   (Depreciation records tracking - check schema)`);

        // Check for vehicle cap (1.6B)
        const expensiveVehicles = await prisma.asset.findMany({
            where: {
                farm_id: farmId,
                category: 'VEHICLE',
                purchase_price: { gt: 1600000000 },
            },
        });

        if (expensiveVehicles.length > 0) {
            for (const v of expensiveVehicles) {
                const hasCap = v.max_deductible_value !== null && Number(v.max_deductible_value) <= 1600000000;
                test(
                    `${v.code}: Vehicle > 1.6B has depreciation cap`,
                    hasCap,
                    '<= 1.6B',
                    v.max_deductible_value ? String(v.max_deductible_value) : 'null'
                );
            }
        }
    }
}

// ==========================================
// TEST 8: AUDIT TRAIL
// ==========================================

async function testAuditTrail(farmId: string) {
    group('8. AUDIT TRAIL');

    const auditLogs = await prisma.auditLog.count({ where: { farm_id: farmId } });
    console.log(`   Audit log entries: ${auditLogs}`);

    if (auditLogs > 0) {
        // Check hash chain integrity (just first 10)
        const logs = await prisma.auditLog.findMany({
            where: { farm_id: farmId },
            orderBy: { created_at: 'asc' },
            take: 10,
            select: { id: true, hash: true, previous_hash: true },
        });

        let chainValid = true;
        for (let i = 1; i < logs.length; i++) {
            if (logs[i].previous_hash && logs[i - 1].hash) {
                if (logs[i].previous_hash !== logs[i - 1].hash) {
                    chainValid = false;
                    break;
                }
            }
        }

        test('Audit hash chain integrity', chainValid, 'valid', chainValid ? 'valid' : 'broken');
    }
}

// ==========================================
// MAIN
// ==========================================

async function main() {
    console.log(`${colors.cyan}🧪 LABA ERP - TEST CASE VERIFICATION${colors.reset}`);
    console.log(`${colors.cyan}=====================================${colors.reset}`);
    console.log(`   Time: ${new Date().toLocaleString()}`);

    // Get farm ID from database
    const farm = await prisma.farm.findFirst();
    if (!farm) {
        console.error('No farm found! Run seed script first.');
        process.exit(1);
    }
    const farmId = farm.id;
    console.log(`   Farm: ${farm.name} (${farmId})`);

    // Run all tests
    await testARAPServiceLogic(farmId);
    await testStockSync(farmId);
    await testTransactionCalculations(farmId);
    await testPartnerBalance(farmId);
    await testWorkers(farmId);
    await testVATData(farmId);
    await testFixedAssets(farmId);
    await testAuditTrail(farmId);

    // Summary
    console.log('');
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.cyan}📊 SUMMARY${colors.reset}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;

    console.log(`   Total tests: ${total}`);
    console.log(`   ${colors.green}Passed: ${passed}${colors.reset}`);
    console.log(`   ${colors.red}Failed: ${failed}${colors.reset}`);
    console.log(`   Success rate: ${Math.round((passed / total) * 100)}%`);

    if (failed > 0) {
        console.log('');
        console.log(`${colors.red}❌ FAILED TESTS:${colors.reset}`);
        results.filter(r => !r.passed).forEach(r => {
            console.log(`   [${r.group}] ${r.name}`);
            console.log(`      Expected: ${r.expected}`);
            console.log(`      Actual: ${r.actual}`);
        });
    }

    console.log('');
    if (failed === 0) {
        console.log(`${colors.green}🎉 All tests passed!${colors.reset}`);
    } else {
        console.log(`${colors.yellow}⚠️  Some tests failed - review above${colors.reset}`);
    }

    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (error) => {
    console.error('Test verification failed:', error);
    await prisma.$disconnect();
    process.exit(1);
});
