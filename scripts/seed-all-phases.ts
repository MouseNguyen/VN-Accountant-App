// scripts/seed-all-phases-test-data.ts
// Comprehensive test data for ALL phases (Phase 1, 2, 3 Task 1-9)
// Run with: npx tsx scripts/seed-all-phases-test-data.ts

import {
  PrismaClient,
  BusinessType,
  UserRole,
  PartnerType,
  ProductCategory,
  TransactionType,
  PaymentMethod,
  PaymentStatus,
  WorkerType,
  WorkerStatus,
  SalaryType,
  AttendanceType,
  PayrollStatus,
  StockMovementType,
  ARTransactionType,
  APTransactionType,
  ARAPStatus,
  VATDeclarationStatus,
  VATPeriodType,
  LockStatus,
  AssetCategory,
  AssetStatus,
  DepreciationMethod,
  TaxType,
  TaxScheduleStatus,
  CITPeriodType,
  CITAdjustmentType,
  LaborType,
  ExpenseType,
  IncomeCategory,
} from '@prisma/client';
import { hash } from 'bcryptjs';
import { seedTaxRulesForFarm } from '../prisma/seed/tax-rules';

const prisma = new PrismaClient();

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function getDateInMonth(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

function formatPeriod(year: number, month: number): string {
  return `${year}-${month.toString().padStart(2, '0')}`;
}

async function main() {
  console.log('🌱 LABA ERP - COMPREHENSIVE TEST DATA SEED');
  console.log('🌱 Phases: 1 (Core) + 2 (Inventory/AR/AP) + 3 (Tax Engine Task 1-9)\n');

  const startTime = Date.now();
  const testYear = 2024;
  const testMonths = [11, 12];

  // ==================== PHASE 1: CORE SETUP ====================
  console.log('\n📦 PHASE 1: CORE SETUP');
  console.log('─'.repeat(60));

  // 1.1 Create Farm
  console.log('🏠 Creating test farm...');
  const farm = await prisma.farm.upsert({
    where: { id: 'test-farm-001' },
    update: {},
    create: {
      id: 'test-farm-001',
      name: 'Nông trại Hòa Phát',
      owner_name: 'Nguyễn Văn Hòa',
      phone: '0901234567',
      email: 'hoaphattfarm@gmail.com',
      address: '123 Quốc lộ 1A, BR-VT',
      tax_code: '3603215489',
      business_type: BusinessType.FARM,
      currency: 'VND',
      locale: 'vi-VN',
      fiscal_year_start: 1,
      allow_negative_stock: false,
    },
  });
  console.log(`   ✅ Farm: ${farm.name}`);

  // 1.2 Seed Tax Rules
  console.log('🏛️  Seeding tax rules...');
  await seedTaxRulesForFarm(prisma, farm.id);

  // 1.3 Create User
  console.log('👤 Creating test user...');
  const passwordHash = await hash('Test@123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'test@labaerp.com' },
    update: {},
    create: {
      email: 'test@labaerp.com',
      password_hash: passwordHash,
      full_name: 'Nguyễn Văn Hòa',
      phone: '0901234567',
      role: UserRole.OWNER,
      is_active: true,
      email_verified: true,
      email_verified_at: new Date(),
      farm: { connect: { id: farm.id } },
    },
  });
  console.log(`   ✅ User: ${user.email}`);

  // 1.4 Products
  console.log('📦 Creating products...');
  const productsData = [
    { code: 'GAO-001', name: 'Gạo ST25', category: ProductCategory.NONG_SAN, unit: 'kg', sellPrice: 28000, buyPrice: 22000, minStock: 50 },
    { code: 'RAU-001', name: 'Rau muống', category: ProductCategory.NONG_SAN, unit: 'bó', sellPrice: 8000, buyPrice: 5000, minStock: 20 },
    { code: 'RAU-002', name: 'Cà chua', category: ProductCategory.NONG_SAN, unit: 'kg', sellPrice: 25000, buyPrice: 18000, minStock: 30 },
    { code: 'TRUNG-001', name: 'Trứng gà', category: ProductCategory.NONG_SAN, unit: 'quả', sellPrice: 3500, buyPrice: 2800, minStock: 100 },
    { code: 'PHAN-001', name: 'Phân bón NPK', category: ProductCategory.VAT_TU, unit: 'bao', sellPrice: 380000, buyPrice: 350000, minStock: 10 },
    { code: 'THUOC-001', name: 'Thuốc trừ sâu', category: ProductCategory.VAT_TU, unit: 'chai', sellPrice: 95000, buyPrice: 85000, minStock: 20 },
  ];

  const products: Record<string, any> = {};
  for (const p of productsData) {
    const product = await prisma.product.upsert({
      where: { farm_id_code: { farm_id: farm.id, code: p.code } },
      update: {},
      create: {
        code: p.code, name: p.name, category: p.category, unit: p.unit,
        selling_price: p.sellPrice, purchase_price: p.buyPrice, min_stock: p.minStock,
        stock_qty: 0, is_active: true,
        farm: { connect: { id: farm.id } },
      },
    });
    products[p.code] = product;
  }
  console.log(`   ✅ ${Object.keys(products).length} products`);

  // 1.5 Partners
  console.log('🤝 Creating partners...');
  const partnersData = [
    { code: 'KH001', name: 'Công ty Thực phẩm Sạch', type: PartnerType.CUSTOMER, taxCode: '0123456789', phone: '0281234567' },
    { code: 'KH002', name: 'Chợ Long Biên', type: PartnerType.CUSTOMER, taxCode: null, phone: '0902345678' },
    { code: 'KH003', name: 'Cửa hàng Rau Xanh', type: PartnerType.CUSTOMER, taxCode: '0309876543', phone: '0903456789' },
    { code: 'NCC001', name: 'Công ty Phân bón Việt Nhật', type: PartnerType.VENDOR, taxCode: '0101248141', phone: '0281111222' },
    { code: 'NCC002', name: 'Đại lý Thuốc BVTV', type: PartnerType.VENDOR, taxCode: '0111222333', phone: '0282345678' },
    { code: 'NCC003', name: 'Trạm xăng Petrolimex', type: PartnerType.VENDOR, taxCode: '0100100100', phone: '0283456789' },
  ];

  const partners: Record<string, any> = {};
  for (const p of partnersData) {
    const partner = await prisma.partner.upsert({
      where: { farm_id_code: { farm_id: farm.id, code: p.code } },
      update: {},
      create: {
        code: p.code, name: p.name, partner_type: p.type, tax_code: p.taxCode, phone: p.phone,
        is_active: true,
        farm: { connect: { id: farm.id } },
      },
    });
    partners[p.code] = partner;
  }
  console.log(`   ✅ ${Object.keys(partners).length} partners`);

  // 1.6 Workers
  console.log('👷 Creating workers...');
  const workersData = [
    { code: 'NV001', name: 'Nguyễn Văn An', salary: 12000000, type: WorkerType.FULL_TIME, salaryType: SalaryType.MONTHLY, laborType: LaborType.FULL_TIME, dependents: 2 },
    { code: 'NV002', name: 'Trần Thị Bình', salary: 10000000, type: WorkerType.FULL_TIME, salaryType: SalaryType.MONTHLY, laborType: LaborType.FULL_TIME, dependents: 1 },
    { code: 'NV003', name: 'Lê Văn Cường', salary: 8000000, type: WorkerType.FULL_TIME, salaryType: SalaryType.MONTHLY, laborType: LaborType.FULL_TIME, dependents: 0 },
    { code: 'NV004', name: 'Phạm Thị Dung', salary: 300000, type: WorkerType.SEASONAL, salaryType: SalaryType.DAILY, laborType: LaborType.CASUAL, dependents: 0, hasCommitment08: false },
    { code: 'NV005', name: 'Vũ Thị Phương', salary: 250000, type: WorkerType.PART_TIME, salaryType: SalaryType.DAILY, laborType: LaborType.CASUAL, dependents: 0, hasCommitment08: true },
  ];

  const workers: Record<string, any> = {};
  for (const w of workersData) {
    const worker = await prisma.worker.upsert({
      where: { farm_id_code: { farm_id: farm.id, code: w.code } },
      update: {},
      create: {
        code: w.code, name: w.name, base_salary: w.salary,
        daily_rate: w.salaryType === SalaryType.DAILY ? w.salary : w.salary / 26,
        worker_type: w.type, salary_type: w.salaryType, labor_type: w.laborType,
        status: WorkerStatus.ACTIVE, dependents: w.dependents,
        has_commitment_08: w.hasCommitment08 || false,
        start_date: new Date('2024-01-01'), is_active: true,
        farm: { connect: { id: farm.id } },
      },
    });
    workers[w.code] = worker;
  }
  console.log(`   ✅ ${Object.keys(workers).length} workers`);

  // 1.7 Insurance Config
  await prisma.insuranceConfig.upsert({
    where: { farm_id: farm.id },
    update: {},
    create: {
      bhxh_employee: 8, bhxh_employer: 17.5, bhyt_employee: 1.5, bhyt_employer: 3,
      bhtn_employee: 1, bhtn_employer: 1, min_wage: 4680000, max_wage: 93600000, is_active: true,
      farm: { connect: { id: farm.id } },
    },
  });
  console.log('   ✅ Insurance config');

  // ==================== TRANSACTIONS ====================
  console.log('\n💰 Creating transactions...');

  // SALES
  const salesData = [
    { code: 'BH-2411-001', date: [2024, 11, 5], partner: 'KH001', amount: 15000000, vat: 1500000, method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.PAID },
    { code: 'BH-2411-002', date: [2024, 11, 15], partner: 'KH002', amount: 12000000, vat: 1200000, method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.PARTIAL, paid: 6000000 },
    { code: 'BH-2411-003', date: [2024, 11, 20], partner: 'KH003', amount: 25000000, vat: 2500000, method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.UNPAID },
    { code: 'BH-2412-001', date: [2024, 12, 3], partner: 'KH001', amount: 18000000, vat: 1800000, method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.PAID },
    { code: 'BH-2412-002', date: [2024, 12, 12], partner: 'KH003', amount: 30000000, vat: 3000000, method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.PARTIAL, paid: 15000000 },
  ];

  const saleTransactions: any[] = [];
  for (const s of salesData) {
    const trans = await prisma.transaction.upsert({
      where: { farm_id_trans_number: { farm_id: farm.id, trans_number: s.code } },
      update: {},
      create: {
        trans_number: s.code, code: s.code, trans_type: TransactionType.SALE,
        trans_date: getDateInMonth(s.date[0], s.date[1], s.date[2]),
        invoice_number: `HD-${s.code}`,
        amount: s.amount, subtotal: s.amount, vat_amount: s.vat, tax_amount: s.vat,
        total_amount: s.amount + s.vat, payment_method: s.method, payment_status: s.status,
        paid_amount: s.status === PaymentStatus.PAID ? s.amount + s.vat : (s.paid || 0),
        income_category: IncomeCategory.AGRI_PROD,
        farm: { connect: { id: farm.id } },
        partner: { connect: { id: partners[s.partner].id } },
      },
    });
    saleTransactions.push(trans);
  }
  console.log(`   ✅ ${saleTransactions.length} SALE transactions`);

  // PURCHASES
  const purchasesData = [
    { code: 'MH-2411-001', date: [2024, 11, 3], partner: 'NCC001', amount: 7000000, vat: 700000, method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.PAID },
    { code: 'MH-2411-002', date: [2024, 11, 18], partner: 'NCC002', amount: 4000000, vat: 400000, method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.PARTIAL, paid: 2000000 },
    { code: 'MH-2412-001', date: [2024, 12, 2], partner: 'NCC001', amount: 10500000, vat: 1050000, method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.PAID },
    // VAT FAIL: Cash >= 20M
    { code: 'MH-2412-002', date: [2024, 12, 10], partner: 'NCC003', amount: 25000000, vat: 2500000, method: PaymentMethod.CASH, status: PaymentStatus.PAID },
    { code: 'MH-2412-003', date: [2024, 12, 15], partner: 'NCC002', amount: 6000000, vat: 600000, method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.UNPAID },
  ];

  const purchaseTransactions: any[] = [];
  for (const p of purchasesData) {
    const trans = await prisma.transaction.upsert({
      where: { farm_id_trans_number: { farm_id: farm.id, trans_number: p.code } },
      update: {},
      create: {
        trans_number: p.code, code: p.code, trans_type: TransactionType.PURCHASE,
        trans_date: getDateInMonth(p.date[0], p.date[1], p.date[2]),
        invoice_number: `HD-${p.code}`,
        amount: p.amount, subtotal: p.amount, vat_amount: p.vat, tax_amount: p.vat,
        total_amount: p.amount + p.vat, payment_method: p.method, payment_status: p.status,
        paid_amount: p.status === PaymentStatus.PAID ? p.amount + p.vat : (p.paid || 0),
        expense_type: ExpenseType.MATERIALS,
        farm: { connect: { id: farm.id } },
        partner: { connect: { id: partners[p.partner].id } },
      },
    });
    purchaseTransactions.push(trans);
  }
  console.log(`   ✅ ${purchaseTransactions.length} PURCHASE transactions`);

  // EXPENSES
  const expensesData = [
    { code: 'CP-2411-001', date: [2024, 11, 5], amount: 3500000, vat: 350000, expenseType: ExpenseType.UTILITY },
    { code: 'CP-2411-002', date: [2024, 11, 20], amount: 2000000, vat: 0, expenseType: ExpenseType.ADMIN_PENALTY }, // CIT ADD-BACK
    { code: 'CP-2412-001', date: [2024, 12, 5], amount: 4200000, vat: 420000, expenseType: ExpenseType.UTILITY },
    { code: 'CP-2412-002', date: [2024, 12, 20], amount: 8000000, vat: 800000, expenseType: ExpenseType.ENTERTAINMENT }, // CIT WARNING
    { code: 'CP-2412-003', date: [2024, 12, 25], amount: 15000000, vat: 0, expenseType: ExpenseType.WELFARE }, // CIT WELFARE CAP
  ];

  for (const e of expensesData) {
    await prisma.transaction.upsert({
      where: { farm_id_trans_number: { farm_id: farm.id, trans_number: e.code } },
      update: {},
      create: {
        trans_number: e.code, code: e.code, trans_type: TransactionType.EXPENSE,
        trans_date: getDateInMonth(e.date[0], e.date[1], e.date[2]),
        amount: e.amount, subtotal: e.amount, vat_amount: e.vat, tax_amount: e.vat,
        total_amount: e.amount + e.vat, payment_method: PaymentMethod.CASH,
        payment_status: PaymentStatus.PAID, paid_amount: e.amount + e.vat,
        expense_type: e.expenseType,
        farm: { connect: { id: farm.id } },
      },
    });
  }
  console.log(`   ✅ ${expensesData.length} EXPENSE transactions`);

  // ==================== ATTENDANCE & PAYROLL ====================
  console.log('\n📅 Creating attendance & payroll...');

  let attendanceCount = 0;
  for (const workerCode of Object.keys(workers)) {
    const worker = workers[workerCode];
    for (const month of testMonths) {
      for (let day = 1; day <= 25; day++) {
        const date = getDateInMonth(testYear, month, day);
        if (date.getDay() === 0) continue; // Skip Sundays

        await prisma.attendance.upsert({
          where: { farm_id_worker_id_work_date: { farm_id: farm.id, worker_id: worker.id, work_date: date } },
          update: {},
          create: {
            work_date: date,
            attendance_type: day === 15 ? AttendanceType.HALF_DAY : AttendanceType.NORMAL,
            work_hours: day === 15 ? 4 : 8,
            ot_normal_hours: day % 10 === 0 ? 2 : 0,
            ot_weekend_hours: 0, ot_holiday_hours: 0, night_hours: 0,
            farm: { connect: { id: farm.id } },
            worker: { connect: { id: worker.id } },
          },
        });
        attendanceCount++;
      }
    }
  }
  console.log(`   ✅ ${attendanceCount} attendance records`);

  // Payrolls
  for (const month of testMonths) {
    const periodCode = `BL${testYear}${month.toString().padStart(2, '0')}-001`;
    const payroll = await prisma.payroll.upsert({
      where: { farm_id_code: { farm_id: farm.id, code: periodCode } },
      update: {},
      create: {
        code: periodCode,
        period_start: getDateInMonth(testYear, month, 1),
        period_end: getDateInMonth(testYear, month, month === 11 ? 30 : 31),
        period_type: 'MONTHLY',
        status: month === 11 ? PayrollStatus.PAID : PayrollStatus.CONFIRMED,
        farm: { connect: { id: farm.id } },
      },
    });

    for (const workerCode of Object.keys(workers)) {
      const worker = workers[workerCode];
      const baseSalary = Number(worker.base_salary);
      const grossSalary = worker.salary_type === SalaryType.MONTHLY ? baseSalary : baseSalary * 22;
      const insurance = worker.worker_type === WorkerType.FULL_TIME ? grossSalary * 0.105 : 0;
      const netSalary = grossSalary - insurance;

      await prisma.payrollItem.upsert({
        where: { payroll_id_worker_id: { payroll_id: payroll.id, worker_id: worker.id } },
        update: {},
        create: {
          salary_type: worker.salary_type,
          base_rate: baseSalary,
          work_days: 22, work_hours: 176,
          base_amount: grossSalary,
          insurance_amount: insurance,
          gross_amount: grossSalary,
          net_amount: netSalary,
          is_paid: month === 11,
          farm: { connect: { id: farm.id } },
          payroll: { connect: { id: payroll.id } },
          worker: { connect: { id: worker.id } },
        },
      });
    }
  }
  console.log('   ✅ Payrolls for Nov-Dec 2024');

  // ==================== PHASE 2: INVENTORY & AR/AP ====================
  console.log('\n📦 PHASE 2: INVENTORY & AR/AP');
  console.log('─'.repeat(60));

  // Stock init
  for (const code of Object.keys(products)) {
    const product = products[code];
    await prisma.stock.upsert({
      where: { farm_id_product_id_location_code: { farm_id: farm.id, product_id: product.id, location_code: 'DEFAULT' } },
      update: {},
      create: {
        location_code: 'DEFAULT', quantity: 100, avg_cost: Number(product.purchase_price), total_value: 100 * Number(product.purchase_price),
        farm: { connect: { id: farm.id } },
        product: { connect: { id: product.id } },
      },
    });
  }
  console.log('   ✅ Stock initialized');

  // Stock Movements
  const stockMovements = [
    { code: 'NK-2411-001', date: [2024, 11, 1], product: 'GAO-001', type: StockMovementType.IN, qty: 200, price: 22000 },
    { code: 'XK-2411-001', date: [2024, 11, 5], product: 'GAO-001', type: StockMovementType.OUT, qty: 50, price: 22000 },
    { code: 'NK-2412-001', date: [2024, 12, 1], product: 'GAO-001', type: StockMovementType.IN, qty: 300, price: 23000 },
  ];

  for (const sm of stockMovements) {
    const product = products[sm.product];
    await prisma.stockMovement.upsert({
      where: { farm_id_code: { farm_id: farm.id, code: sm.code } },
      update: {},
      create: {
        code: sm.code, date: getDateInMonth(sm.date[0], sm.date[1], sm.date[2]),
        type: sm.type, quantity: sm.qty, unit: product.unit, unit_price: sm.price,
        farm: { connect: { id: farm.id } },
        product: { connect: { id: product.id } },
      },
    });
  }
  console.log(`   ✅ ${stockMovements.length} stock movements`);

  // AR Transactions
  for (const sale of saleTransactions) {
    if (sale.payment_status !== PaymentStatus.PAID) {
      await prisma.aRTransaction.upsert({
        where: { farm_id_code: { farm_id: farm.id, code: `AR-${sale.code}` } },
        update: {},
        create: {
          type: ARTransactionType.INVOICE, code: `AR-${sale.code}`, trans_date: sale.trans_date,
          amount: Number(sale.total_amount), paid_amount: Number(sale.paid_amount),
          balance: Number(sale.total_amount) - Number(sale.paid_amount),
          due_date: new Date(sale.trans_date.getTime() + 30 * 24 * 60 * 60 * 1000),
          status: sale.payment_status === PaymentStatus.PARTIAL ? ARAPStatus.PARTIAL : ARAPStatus.UNPAID,
          farm: { connect: { id: farm.id } },
          customer: { connect: { id: sale.partner_id } },
          transaction: { connect: { id: sale.id } },
        },
      });
    }
  }
  console.log('   ✅ AR transactions');

  // AP Transactions
  for (const purchase of purchaseTransactions) {
    if (purchase.payment_status !== PaymentStatus.PAID) {
      await prisma.aPTransaction.upsert({
        where: { farm_id_code: { farm_id: farm.id, code: `AP-${purchase.code}` } },
        update: {},
        create: {
          type: APTransactionType.INVOICE, code: `AP-${purchase.code}`, trans_date: purchase.trans_date,
          amount: Number(purchase.total_amount), paid_amount: Number(purchase.paid_amount),
          balance: Number(purchase.total_amount) - Number(purchase.paid_amount),
          due_date: new Date(purchase.trans_date.getTime() + 45 * 24 * 60 * 60 * 1000),
          status: purchase.payment_status === PaymentStatus.PARTIAL ? ARAPStatus.PARTIAL : ARAPStatus.UNPAID,
          farm: { connect: { id: farm.id } },
          vendor: { connect: { id: purchase.partner_id } },
          transaction: { connect: { id: purchase.id } },
        },
      });
    }
  }
  console.log('   ✅ AP transactions');

  // VAT Declarations
  for (const month of testMonths) {
    const periodCode = formatPeriod(testYear, month);
    await prisma.vATDeclaration.upsert({
      where: { farm_id_period_code: { farm_id: farm.id, period_code: periodCode } },
      update: {},
      create: {
        period_type: VATPeriodType.MONTHLY, period_code: periodCode,
        from_date: getDateInMonth(testYear, month, 1),
        to_date: getDateInMonth(testYear, month, month === 11 ? 30 : 31),
        input_vat_count: 3, input_vat_amount: 20000000, input_vat_tax: 2000000,
        output_vat_count: 3, output_vat_amount: 50000000, output_vat_tax: 5000000,
        payable_vat: 3000000,
        status: month === 11 ? VATDeclarationStatus.SUBMITTED : VATDeclarationStatus.DRAFT,
        farm: { connect: { id: farm.id } },
      },
    });
  }
  console.log('   ✅ VAT declarations');

  // Period Lock
  await prisma.periodLock.upsert({
    where: { farm_id_period_code: { farm_id: farm.id, period_code: '2024-11' } },
    update: {},
    create: {
      period_type: 'MONTH', period_code: '2024-11',
      from_date: getDateInMonth(2024, 11, 1), to_date: getDateInMonth(2024, 11, 30),
      status: LockStatus.LOCKED, locked_at: new Date('2024-12-05'),
      farm: { connect: { id: farm.id } },
      locked_by_user: { connect: { id: user.id } },
    },
  });
  console.log('   ✅ Period lock (Nov 2024)');

  // ==================== PHASE 3: TAX ENGINE ====================
  console.log('\n🏛️  PHASE 3: TAX ENGINE');
  console.log('─'.repeat(60));

  // Fixed Assets
  const assetsData = [
    { code: 'TS-001', name: 'Máy cày Kubota', category: AssetCategory.MACHINERY, price: 450000000, lifeMonths: 120 },
    { code: 'TS-002', name: 'Xe tải Hyundai', category: AssetCategory.VEHICLE, price: 680000000, lifeMonths: 120 },
    { code: 'TS-003', name: 'Xe Toyota Camry (< 9 chỗ)', category: AssetCategory.VEHICLE, price: 1800000000, lifeMonths: 120, maxDeductible: 1600000000 },
  ];

  for (const asset of assetsData) {
    const monthlyDep = asset.price / asset.lifeMonths;
    await prisma.asset.upsert({
      where: { farm_id_code: { farm_id: farm.id, code: asset.code } },
      update: {},
      create: {
        code: asset.code, name: asset.name, category: asset.category,
        purchase_date: new Date('2024-01-15'), purchase_price: asset.price, original_cost: asset.price,
        useful_life_months: asset.lifeMonths, depreciation_method: DepreciationMethod.STRAIGHT_LINE,
        monthly_depreciation: monthlyDep, accumulated_depreciation: monthlyDep * 11,
        book_value: asset.price - monthlyDep * 11, status: AssetStatus.ACTIVE,
        max_deductible_value: asset.maxDeductible || null,
        farm: { connect: { id: farm.id } },
      },
    });
  }
  console.log(`   ✅ ${assetsData.length} fixed assets`);

  // CIT Calculation
  const citQ4 = await prisma.cITCalculation.upsert({
    where: { farm_id_period: { farm_id: farm.id, period: '2024-Q4' } },
    update: {},
    create: {
      period: '2024-Q4', period_type: CITPeriodType.QUARTERLY,
      total_revenue: 100000000, other_income: 500000, total_expenses: 60000000,
      accounting_profit: 40500000, add_backs: 25000000, deductions: 0,
      taxable_income: 65500000, tax_rate: 20, cit_amount: 13100000, status: 'DRAFT',
      farm: { connect: { id: farm.id } },
    },
  });

  await prisma.cITAdjustment.createMany({
    data: [
      { cit_calculation_id: citQ4.id, adjustment_type: CITAdjustmentType.ADD_BACK, category: 'ADMIN_PENALTY', amount: 2000000 },
      { cit_calculation_id: citQ4.id, adjustment_type: CITAdjustmentType.ADD_BACK, category: 'WELFARE_EXCESS', amount: 5000000 },
      { cit_calculation_id: citQ4.id, adjustment_type: CITAdjustmentType.ADD_BACK, category: 'CASH_OVER_LIMIT', amount: 25000000 },
    ],
    skipDuplicates: true,
  });
  console.log('   ✅ CIT Q4/2024 with adjustments');

  // PIT Calculations
  for (const month of testMonths) {
    const periodCode = formatPeriod(testYear, month);
    for (const workerCode of Object.keys(workers)) {
      const worker = workers[workerCode];
      const grossIncome = worker.salary_type === SalaryType.MONTHLY ? Number(worker.base_salary) : Number(worker.base_salary) * 22;
      const insurance = worker.worker_type === WorkerType.FULL_TIME ? grossIncome * 0.105 : 0;
      const familyDed = 11000000;
      const depDed = worker.dependents * 4400000;
      const taxable = Math.max(0, grossIncome - insurance - familyDed - depDed);

      await prisma.pITCalculation.upsert({
        where: { farm_id_employee_id_period: { farm_id: farm.id, employee_id: worker.id, period: periodCode } },
        update: {},
        create: {
          period: periodCode, gross_income: grossIncome, insurance_deduction: insurance,
          family_deduction: familyDed, dependent_deduction: depDed,
          total_deduction: insurance + familyDed + depDed,
          taxable_income: taxable, pit_amount: taxable > 0 ? taxable * 0.05 : 0,
          dependents_count: worker.dependents, calculated_at: new Date(),
          farm: { connect: { id: farm.id } },
          employee: { connect: { id: worker.id } },
        },
      });
    }
  }
  console.log('   ✅ PIT calculations');

  // Tax Schedules
  const taxSchedules = [
    { type: TaxType.VAT, period: '2024-11', dueDate: new Date('2024-12-20'), status: TaxScheduleStatus.PAID, amount: 3000000 },
    { type: TaxType.VAT, period: '2024-12', dueDate: new Date('2025-01-20'), status: TaxScheduleStatus.PENDING, amount: 3500000 },
    { type: TaxType.CIT, period: '2024-Q4', dueDate: new Date('2025-01-30'), status: TaxScheduleStatus.PENDING, amount: 13100000 },
    { type: TaxType.PIT, period: '2024-11', dueDate: new Date('2024-12-20'), status: TaxScheduleStatus.PAID, amount: 2000000 },
    { type: TaxType.PIT, period: '2024-12', dueDate: new Date('2025-01-20'), status: TaxScheduleStatus.PENDING, amount: 2200000 },
  ];

  for (const ts of taxSchedules) {
    await prisma.taxSchedule.upsert({
      where: { farm_id_tax_type_period: { farm_id: farm.id, tax_type: ts.type, period: ts.period } },
      update: {},
      create: {
        tax_type: ts.type, period: ts.period, due_date: ts.dueDate, status: ts.status, amount: ts.amount,
        paid_at: ts.status === TaxScheduleStatus.PAID ? new Date() : null,
        farm: { connect: { id: farm.id } },
      },
    });
  }
  console.log(`   ✅ ${taxSchedules.length} tax schedules`);

  // ==================== SUMMARY ====================
  const endTime = Date.now();
  console.log('\n' + '═'.repeat(60));
  console.log('✅ SEED COMPLETED!');
  console.log('═'.repeat(60));
  console.log('\n🔑 LOGIN: test@labaerp.com / Test@123');
  console.log('\n⚠️  TEST CASES:');
  console.log('   📌 MH-2412-002: Cash >= 20M → VAT không khấu trừ');
  console.log('   📌 CP-2411-002: Phạt ATGT → CIT add-back 100%');
  console.log('   📌 CP-2412-002: Tiếp khách → CIT limit check');
  console.log('   📌 CP-2412-003: Phúc lợi → CIT welfare cap');
  console.log('   📌 TS-003: Xe < 9 chỗ > 1.6B → CIT depreciation cap');
  console.log('   📌 NV004: LĐ thời vụ >= 2M → PIT 10%');
  console.log('   📌 NV005: Có cam kết 08 → PIT 0%');
  console.log(`\n⏱️  Duration: ${((endTime - startTime) / 1000).toFixed(2)}s`);
  console.log('═'.repeat(60) + '\n');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
