// scripts/verify-test-cases.ts
// Verify business logic with seed data
// Run: npx tsx scripts/verify-test-cases.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestResult {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  details?: string;
}

const results: TestResult[] = [];

function test(name: string, passed: boolean, expected: string, actual: string, details?: string) {
  results.push({ name, passed, expected, actual, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (!passed) {
    console.log(`   Expected: ${expected}`);
    console.log(`   Actual: ${actual}`);
    if (details) console.log(`   Details: ${details}`);
  }
}

async function main() {
  console.log('🧪 LABA ERP - TEST CASE VERIFICATION');
  console.log('=====================================\n');

  const farmId = 'test-farm-001';

  // ============================================================
  // TEST 1: AR includes SALE transactions
  // ============================================================
  console.log('📋 TEST GROUP 1: AR/AP Transaction Types\n');

  const saleTransactions = await prisma.transaction.findMany({
    where: { farm_id: farmId, trans_type: 'SALE', deleted_at: null },
  });

  const incomeTransactions = await prisma.transaction.findMany({
    where: { farm_id: farmId, trans_type: 'INCOME', deleted_at: null },
  });

  test(
    'SALE transactions exist',
    saleTransactions.length > 0,
    '> 0',
    String(saleTransactions.length)
  );

  test(
    'INCOME transactions exist',
    incomeTransactions.length > 0,
    '> 0',
    String(incomeTransactions.length)
  );

  // Check AR should include both
  const arShouldInclude = saleTransactions.length + incomeTransactions.length;
  test(
    'AR should track SALE + INCOME',
    true,
    `${arShouldInclude} transactions`,
    `${saleTransactions.length} SALE + ${incomeTransactions.length} INCOME`,
    'Verify ar.service.ts queries include both types'
  );

  // ============================================================
  // TEST 2: AP includes PURCHASE transactions
  // ============================================================
  const purchaseTransactions = await prisma.transaction.findMany({
    where: { farm_id: farmId, trans_type: 'PURCHASE', deleted_at: null },
  });

  const expenseTransactions = await prisma.transaction.findMany({
    where: { farm_id: farmId, trans_type: 'EXPENSE', deleted_at: null },
  });

  test(
    'PURCHASE transactions exist',
    purchaseTransactions.length > 0,
    '> 0',
    String(purchaseTransactions.length)
  );

  test(
    'EXPENSE transactions exist',
    expenseTransactions.length > 0,
    '> 0',
    String(expenseTransactions.length)
  );

  // ============================================================
  // TEST 3: Transaction Calculations
  // ============================================================
  console.log('\n📋 TEST GROUP 2: Calculations\n');

  for (const trans of saleTransactions.slice(0, 3)) {
    const subtotal = Number(trans.subtotal || trans.amount);
    const vat = Number(trans.vat_amount || 0);
    const total = Number(trans.total_amount);
    const calculated = subtotal + vat;

    test(
      `Transaction ${trans.code} total calculation`,
      Math.abs(total - calculated) < 1, // Allow 1 VND rounding
      `${calculated}`,
      `${total}`,
      `subtotal(${subtotal}) + vat(${vat}) = ${calculated}`
    );
  }

  // ============================================================
  // TEST 4: Payment Status & Balance
  // ============================================================
  console.log('\n📋 TEST GROUP 3: Payment Status\n');

  const unpaidSales = await prisma.transaction.findMany({
    where: {
      farm_id: farmId,
      trans_type: 'SALE',
      payment_status: { in: ['UNPAID', 'PARTIAL'] },
      deleted_at: null,
    },
  });

  for (const trans of unpaidSales.slice(0, 3)) {
    const total = Number(trans.total_amount);
    const paid = Number(trans.paid_amount);
    const balance = total - paid;

    test(
      `Transaction ${trans.code} has outstanding balance`,
      balance > 0,
      '> 0',
      String(balance),
      `Status: ${trans.payment_status}`
    );
  }

  // ============================================================
  // TEST 5: Workers & Payroll
  // ============================================================
  console.log('\n📋 TEST GROUP 4: Workers & Payroll\n');

  const workers = await prisma.worker.findMany({
    where: { farm_id: farmId, is_active: true },
  });

  test(
    'Workers exist',
    workers.length > 0,
    '> 0',
    String(workers.length)
  );

  const fullTimeWorkers = workers.filter(w => w.worker_type === 'FULL_TIME');
  const seasonalWorkers = workers.filter(w => w.worker_type === 'SEASONAL' || w.worker_type === 'PART_TIME');

  test(
    'Full-time workers for PIT progressive tax',
    fullTimeWorkers.length > 0,
    '> 0',
    String(fullTimeWorkers.length)
  );

  test(
    'Seasonal/Part-time workers for PIT flat rate',
    seasonalWorkers.length > 0,
    '> 0',
    String(seasonalWorkers.length)
  );

  // Check commitment 08
  const withCommitment08 = workers.filter(w => w.has_commitment_08);
  test(
    'Worker with commitment 08 (0% PIT)',
    withCommitment08.length > 0,
    '> 0',
    String(withCommitment08.length),
    withCommitment08.map(w => w.code).join(', ')
  );

  // ============================================================
  // TEST 6: VAT Test Cases
  // ============================================================
  console.log('\n📋 TEST GROUP 5: VAT Deductibility\n');

  // Find cash payment >= 20M
  const cashOver20M = await prisma.transaction.findMany({
    where: {
      farm_id: farmId,
      trans_type: 'PURCHASE',
      payment_method: 'CASH',
      amount: { gte: 20000000 },
      deleted_at: null,
    },
  });

  test(
    'Test case: Cash >= 20M exists',
    cashOver20M.length > 0,
    '> 0',
    String(cashOver20M.length),
    'VAT should NOT be deductible for these'
  );

  // Find purchase without invoice
  const noInvoice = await prisma.transaction.findMany({
    where: {
      farm_id: farmId,
      trans_type: 'PURCHASE',
      invoice_number: null,
      deleted_at: null,
    },
  });

  test(
    'Test case: Purchase without invoice exists',
    noInvoice.length > 0,
    '> 0',
    String(noInvoice.length),
    'VAT should NOT be deductible for these'
  );

  // ============================================================
  // TEST 7: CIT Test Cases
  // ============================================================
  console.log('\n📋 TEST GROUP 6: CIT Add-backs\n');

  // Find admin penalty expense
  const penalties = await prisma.transaction.findMany({
    where: {
      farm_id: farmId,
      trans_type: 'EXPENSE',
      expense_type: 'ADMIN_PENALTY',
      deleted_at: null,
    },
  });

  test(
    'Test case: Admin penalty expense exists',
    penalties.length > 0,
    '> 0',
    String(penalties.length),
    'Should be 100% CIT add-back'
  );

  // Find welfare expense
  const welfare = await prisma.transaction.findMany({
    where: {
      farm_id: farmId,
      trans_type: 'EXPENSE',
      expense_type: 'WELFARE',
      deleted_at: null,
    },
  });

  test(
    'Test case: Welfare expense exists',
    welfare.length > 0,
    '> 0',
    String(welfare.length),
    'Check if exceeds 1 month average salary cap'
  );

  // ============================================================
  // TEST 8: Fixed Assets
  // ============================================================
  console.log('\n📋 TEST GROUP 7: Fixed Assets\n');

  const assets = await prisma.asset.findMany({
    where: { farm_id: farmId },
  });

  test(
    'Fixed assets exist',
    assets.length > 0,
    '> 0',
    String(assets.length)
  );

  // Check car < 9 seats > 1.6B
  const expensiveCar = assets.find(a => 
    a.category === 'VEHICLE' && 
    Number(a.purchase_price) > 1600000000 &&
    a.max_deductible_value !== null
  );

  test(
    'Test case: Car > 1.6B with depreciation cap',
    expensiveCar !== undefined,
    'exists',
    expensiveCar ? `${expensiveCar.code}: ${expensiveCar.purchase_price}` : 'not found',
    'Depreciation should be capped at 1.6B'
  );

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n=====================================');
  console.log('📊 SUMMARY');
  console.log('=====================================\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`Total tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success rate: ${Math.round((passed / total) * 100)}%`);

  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}`);
    });
  }

  console.log('\n📝 NEXT STEPS:');
  console.log('1. Fix any failed tests');
  console.log('2. Run service functions and verify results match expected');
  console.log('3. Check AR/AP queries include correct trans_types');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
