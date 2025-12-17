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

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function getDateInMonth(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

function formatPeriod(year: number, month: number): string {
  return `${year}-${month.toString().padStart(2, '0')}`;
}

function formatQuarter(year: number, quarter: number): string {
  return `${year}-Q${quarter}`;
}

// ============================================================
// MAIN SEED FUNCTION
// ============================================================

async function main() {
  console.log('🌱 ═══════════════════════════════════════════════════════════════');
  console.log('🌱 LABA ERP - COMPREHENSIVE TEST DATA SEED');
  console.log('🌱 Phases: 1 (Core) + 2 (Inventory/AR/AP) + 3 (Tax Engine Task 1-9)');
  console.log('🌱 ═══════════════════════════════════════════════════════════════\n');

  const startTime = Date.now();

  // ============================================================
  // PHASE 1: CORE SETUP
  // ============================================================
  console.log('\n📦 PHASE 1: CORE SETUP');
  console.log('─'.repeat(60));

  // 1.1 Create Test Farm
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
      address: '123 Quốc lộ 1A, Xã Phước Long, Huyện Đất Đỏ, BR-VT',
      tax_code: '3603215489',
      business_type: BusinessType.FARM,
      currency: 'VND',
      locale: 'vi-VN',
      fiscal_year_start: 1,
      allow_negative_stock: false,
    },
  });
  console.log(`   ✅ Farm: ${farm.name} (${farm.id})`);

  // 1.2 Seed Tax Rules for Farm (Phase 3 prerequisite)
  console.log('🏛️  Seeding tax rules...');
  await seedTaxRulesForFarm(prisma, farm.id);

  // 1.3 Create Test User
  console.log('👤 Creating test user...');
  const passwordHash = await hash('Test@123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'test@labaerp.com' },
    update: {},
    create: {
      farm_id: farm.id,
      email: 'test@labaerp.com',
      password_hash: passwordHash,
      full_name: 'Nguyễn Văn Hòa',
      phone: '0901234567',
      role: UserRole.OWNER,
      is_active: true,
      email_verified: true,
      email_verified_at: new Date(),
    },
  });
  console.log(`   ✅ User: ${user.email} (Password: Test@123)`);

  // 1.4 Create Products
  console.log('📦 Creating products...');
  const productsData = [
    // Nông sản
    { code: 'LUA-001', name: 'Lúa ST25', category: ProductCategory.NONG_SAN, unit: 'kg', sellPrice: 15000, buyPrice: 12000, minStock: 100 },
    { code: 'GAO-001', name: 'Gạo ST25', category: ProductCategory.NONG_SAN, unit: 'kg', sellPrice: 28000, buyPrice: 22000, minStock: 50 },
    { code: 'RAU-001', name: 'Rau muống', category: ProductCategory.NONG_SAN, unit: 'bó', sellPrice: 8000, buyPrice: 5000, minStock: 20 },
    { code: 'RAU-002', name: 'Cà chua', category: ProductCategory.NONG_SAN, unit: 'kg', sellPrice: 25000, buyPrice: 18000, minStock: 30 },
    { code: 'RAU-003', name: 'Dưa leo', category: ProductCategory.NONG_SAN, unit: 'kg', sellPrice: 15000, buyPrice: 10000, minStock: 25 },
    { code: 'TRUNG-001', name: 'Trứng gà', category: ProductCategory.NONG_SAN, unit: 'quả', sellPrice: 3500, buyPrice: 2800, minStock: 100 },
    // Vật tư
    { code: 'PHAN-001', name: 'Phân bón NPK', category: ProductCategory.VAT_TU, unit: 'bao', sellPrice: 380000, buyPrice: 350000, minStock: 10 },
    { code: 'THUOC-001', name: 'Thuốc trừ sâu', category: ProductCategory.VAT_TU, unit: 'chai', sellPrice: 95000, buyPrice: 85000, minStock: 20 },
    { code: 'GIONG-001', name: 'Hạt giống lúa', category: ProductCategory.VAT_TU, unit: 'kg', sellPrice: 45000, buyPrice: 40000, minStock: 50 },
    { code: 'XNG-001', name: 'Xăng A95', category: ProductCategory.VAT_TU, unit: 'lít', sellPrice: 25000, buyPrice: 23500, minStock: 100 },
  ];

  const products = [];
  for (const p of productsData) {
    const product = await prisma.product.upsert({
      where: { farm_id_code: { farm_id: farm.id, code: p.code } },
      update: {},
      create: {
        farm_id: farm.id,
        code: p.code,
        name: p.name,
        category: p.category,
        unit: p.unit,
        selling_price: p.sellPrice,
        purchase_price: p.buyPrice,
        min_stock: p.minStock,
        stock_qty: 0,
        is_active: true,
      },
    });
    products.push(product);
  }
  console.log(`   ✅ ${products.length} products created`);

  // 1.5 Create Partners (Customers + Vendors)
  console.log('🤝 Creating partners...');
  const partnersData = [
    // Customers (Khách hàng)
    { code: 'KH001', name: 'Công ty TNHH Thực phẩm Sạch', type: PartnerType.CUSTOMER, taxCode: '0123456789', phone: '0281234567', address: '123 Nguyễn Huệ, Q1, HCM', creditLimit: 50000000 },
    { code: 'KH002', name: 'Chợ đầu mối Long Biên', type: PartnerType.CUSTOMER, taxCode: null, phone: '0902345678', address: 'Long Biên, Hà Nội', creditLimit: 30000000 },
    { code: 'KH003', name: 'Cửa hàng Rau Xanh', type: PartnerType.CUSTOMER, taxCode: '0309876543', phone: '0903456789', address: '45 Lê Lợi, Q1, HCM', creditLimit: 20000000 },
    { code: 'KH004', name: 'Siêu thị Co.op Mart', type: PartnerType.CUSTOMER, taxCode: '0302222888', phone: '0904567890', address: '100 Cống Quỳnh, Q1, HCM', creditLimit: 100000000 },
    { code: 'KH005', name: 'Nhà hàng Hoa Sen', type: PartnerType.CUSTOMER, taxCode: '0305555999', phone: '0908888999', address: '88 Nguyễn Du, Q1, HCM', creditLimit: 40000000 },
    // Vendors (Nhà cung cấp)
    { code: 'NCC001', name: 'Công ty Phân bón Việt Nhật', type: PartnerType.VENDOR, taxCode: '0101248141', phone: '0281111222', address: '789 Quốc lộ 1A, Bình Dương', creditLimit: null },
    { code: 'NCC002', name: 'Đại lý Thuốc BVTV Miền Nam', type: PartnerType.VENDOR, taxCode: '0111222333', phone: '0282345678', address: '456 Điện Biên Phủ, Q3, HCM', creditLimit: null },
    { code: 'NCC003', name: 'Trạm xăng Petrolimex', type: PartnerType.VENDOR, taxCode: '0100100100', phone: '0283456789', address: '1 Nguyễn Văn Linh, Q7, HCM', creditLimit: null },
    { code: 'NCC004', name: 'Công ty TNHH Giống cây ABC', type: PartnerType.VENDOR, taxCode: '0309999888', phone: '0284567890', address: '234 Trường Chinh, Tân Bình, HCM', creditLimit: null },
    { code: 'NCC005', name: 'Cửa hàng vật tư Hùng Vương', type: PartnerType.VENDOR, taxCode: null, phone: '0285678901', address: '567 Hùng Vương, Q5, HCM', creditLimit: null },
  ];

  const partners: { [key: string]: any } = {};
  for (const p of partnersData) {
    const partner = await prisma.partner.upsert({
      where: { farm_id_code: { farm_id: farm.id, code: p.code } },
      update: {},
      create: {
        farm_id: farm.id,
        code: p.code,
        name: p.name,
        partner_type: p.type,
        tax_code: p.taxCode,
        phone: p.phone,
        address: p.address,
        credit_limit: p.creditLimit,
        is_active: true,
      },
    });
    partners[p.code] = partner;
  }
  console.log(`   ✅ ${Object.keys(partners).length} partners created`);

  // 1.6 Create Workers
  console.log('👷 Creating workers...');
  const workersData = [
    // Full-time workers (có BHXH, tính thuế lũy tiến)
    { code: 'NV001', name: 'Nguyễn Văn An', phone: '0911111111', salary: 12000000, type: WorkerType.FULL_TIME, salaryType: SalaryType.MONTHLY, laborType: LaborType.FULL_TIME, taxCode: '8001234567', dependents: 2, hasTaxCommitment: true },
    { code: 'NV002', name: 'Trần Thị Bình', phone: '0922222222', salary: 10000000, type: WorkerType.FULL_TIME, salaryType: SalaryType.MONTHLY, laborType: LaborType.FULL_TIME, taxCode: '8002345678', dependents: 1, hasTaxCommitment: true },
    { code: 'NV003', name: 'Lê Văn Cường', phone: '0933333333', salary: 8000000, type: WorkerType.FULL_TIME, salaryType: SalaryType.MONTHLY, laborType: LaborType.FULL_TIME, taxCode: '8003456789', dependents: 0, hasTaxCommitment: true },
    // Seasonal workers (thời vụ, thuế 10% nếu >= 2tr)
    { code: 'NV004', name: 'Phạm Thị Dung', phone: '0944444444', salary: 300000, type: WorkerType.SEASONAL, salaryType: SalaryType.DAILY, laborType: LaborType.CASUAL, taxCode: null, dependents: 0, hasTaxCommitment: false },
    { code: 'NV005', name: 'Hoàng Văn Em', phone: '0955555555', salary: 280000, type: WorkerType.SEASONAL, salaryType: SalaryType.DAILY, laborType: LaborType.CASUAL, taxCode: null, dependents: 0, hasTaxCommitment: false },
    // Part-time worker with commitment 08 (có cam kết 08, không khấu trừ thuế)
    { code: 'NV006', name: 'Vũ Thị Phương', phone: '0966666666', salary: 250000, type: WorkerType.PART_TIME, salaryType: SalaryType.DAILY, laborType: LaborType.CASUAL, taxCode: '8006666666', dependents: 0, hasTaxCommitment: false, hasCommitment08: true },
  ];

  const workers: { [key: string]: any } = {};
  for (const w of workersData) {
    const worker = await prisma.worker.upsert({
      where: { farm_id_code: { farm_id: farm.id, code: w.code } },
      update: {},
      create: {
        farm_id: farm.id,
        code: w.code,
        name: w.name,
        phone: w.phone,
        base_salary: w.salary,
        daily_rate: w.salaryType === SalaryType.DAILY ? w.salary : w.salary / 26,
        worker_type: w.type,
        salary_type: w.salaryType,
        labor_type: w.laborType,
        status: WorkerStatus.ACTIVE,
        tax_code: w.taxCode,
        dependents: w.dependents,
        has_tax_commitment: w.hasTaxCommitment,
        has_commitment_08: w.hasCommitment08 || false,
        commitment_08_date: w.hasCommitment08 ? new Date('2024-01-01') : null,
        start_date: new Date('2024-01-01'),
        is_subject_to_tax: true,
        is_active: true,
      },
    });
    workers[w.code] = worker;
  }
  console.log(`   ✅ ${Object.keys(workers).length} workers created`);

  // 1.7 Create Insurance Config
  console.log('🏥 Creating insurance config...');
  await prisma.insuranceConfig.upsert({
    where: { farm_id: farm.id },
    update: {},
    create: {
      farm_id: farm.id,
      bhxh_employee: 8,
      bhxh_employer: 17.5,
      bhyt_employee: 1.5,
      bhyt_employer: 3,
      bhtn_employee: 1,
      bhtn_employer: 1,
      min_wage: 4680000,
      max_wage: 93600000,
      is_active: true,
    },
  });
  console.log('   ✅ Insurance config created');

  // ============================================================
  // PHASE 1: TRANSACTIONS (THU/CHI/BÁN/MUA)
  // ============================================================
  console.log('\n💰 Creating transactions...');

  // Test period: November - December 2024
  const testYear = 2024;
  const testMonths = [11, 12];

  // 1.8 SALE Transactions (Bán hàng)
  console.log('   📤 Creating SALE transactions...');
  const salesData = [
    // November 2024
    { code: 'BH-2411-001', date: [2024, 11, 5], partner: 'KH001', amount: 15000000, vat: 1500000, method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.PAID, desc: 'Bán 500kg gạo ST25', invoice: 'HD-BH2411001' },
    { code: 'BH-2411-002', date: [2024, 11, 10], partner: 'KH002', amount: 8000000, vat: 400000, method: PaymentMethod.CASH, status: PaymentStatus.PAID, desc: 'Bán rau tổng hợp (nông sản sơ chế 5%)', invoice: 'HD-BH2411002' },
    { code: 'BH-2411-003', date: [2024, 11, 15], partner: 'KH003', amount: 12000000, vat: 1200000, method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.PARTIAL, paid: 6000000, desc: 'Bán 50kg cà chua + rau muống', invoice: 'HD-BH2411003' },
    { code: 'BH-2411-004', date: [2024, 11, 20], partner: 'KH004', amount: 25000000, vat: 2500000, method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.UNPAID, desc: 'Giao hàng Coopmart tháng 11', invoice: 'HD-BH2411004' },
    { code: 'BH-2411-005', date: [2024, 11, 25], partner: 'KH005', amount: 6000000, vat: 600000, method: PaymentMethod.CASH, status: PaymentStatus.PAID, desc: 'Bán trứng + rau cho nhà hàng', invoice: 'HD-BH2411005' },
    // December 2024
    { code: 'BH-2412-001', date: [2024, 12, 3], partner: 'KH001', amount: 18000000, vat: 1800000, method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.PAID, desc: 'Bán 600kg gạo ST25', invoice: 'HD-BH2412001' },
    { code: 'BH-2412-002', date: [2024, 12, 8], partner: 'KH002', amount: 10000000, vat: 500000, method: PaymentMethod.CASH, status: PaymentStatus.PAID, desc: 'Bán rau chợ Long Biên', invoice: 'HD-BH2412002' },
    { code: 'BH-2412-003', date: [2024, 12, 12], partner: 'KH004', amount: 30000000, vat: 3000000, method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.PARTIAL, paid: 15000000, desc: 'Giao hàng Coopmart tháng 12', invoice: 'HD-BH2412003' },
    { code: 'BH-2412-004', date: [2024, 12, 18], partner: 'KH003', amount: 8500000, vat: 850000, method: PaymentMethod.MOMO, status: PaymentStatus.PAID, desc: 'Bán dưa leo + cà chua', invoice: 'HD-BH2412004' },
    { code: 'BH-2412-005', date: [2024, 12, 22], partner: 'KH005', amount: 12000000, vat: 1200000, method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.UNPAID, desc: 'Cung cấp thực phẩm cuối năm', invoice: 'HD-BH2412005' },
  ];

  const saleTransactions: any[] = [];
  for (const s of salesData) {
    const trans = await prisma.transaction.upsert({
      where: { farm_id_trans_number: { farm_id: farm.id, trans_number: s.code } },
      update: {},
      create: {
        farm_id: farm.id,
        trans_number: s.code,
        code: s.code,
        trans_type: TransactionType.SALE,
        trans_date: getDateInMonth(s.date[0], s.date[1], s.date[2]),
        partner_id: partners[s.partner].id,
        invoice_number: s.invoice,
        amount: s.amount,
        subtotal: s.amount,
        vat_amount: s.vat,
        tax_amount: s.vat,
        total_amount: s.amount + s.vat,
        payment_method: s.method,
        payment_status: s.status,
        paid_amount: s.status === PaymentStatus.PAID ? s.amount + s.vat : (s.paid || 0),
        description: s.desc,
        income_category: IncomeCategory.AGRI_PROD,
      },
    });
    saleTransactions.push(trans);
  }
  console.log(`      ✅ ${saleTransactions.length} SALE transactions`);

  // 1.9 PURCHASE Transactions (Mua hàng)
  console.log('   📥 Creating PURCHASE transactions...');
  const purchasesData = [
    // November 2024
    { code: 'MH-2411-001', date: [2024, 11, 3], partner: 'NCC001', amount: 7000000, vat: 700000, method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.PAID, desc: 'Mua 20 bao phân NPK', invoice: 'HD-MH2411001' },
    { code: 'MH-2411-002', date: [2024, 11, 8], partner: 'NCC002', amount: 1700000, vat: 170000, method: PaymentMethod.CASH, status: PaymentStatus.PAID, desc: 'Mua 20 chai thuốc trừ sâu', invoice: 'HD-MH2411002' },
    { code: 'MH-2411-003', date: [2024, 11, 12], partner: 'NCC003', amount: 5000000, vat: 500000, method: PaymentMethod.CASH, status: PaymentStatus.PAID, desc: 'Mua xăng tháng 11', invoice: 'HD-MH2411003' },
    { code: 'MH-2411-004', date: [2024, 11, 18], partner: 'NCC004', amount: 4000000, vat: 400000, method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.PARTIAL, paid: 2000000, desc: 'Mua hạt giống lúa', invoice: 'HD-MH2411004' },
    // December 2024 - including VAT FAIL cases
    { code: 'MH-2412-001', date: [2024, 12, 2], partner: 'NCC001', amount: 10500000, vat: 1050000, method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.PAID, desc: 'Mua 30 bao phân NPK', invoice: 'HD-MH2412001' },
    { code: 'MH-2412-002', date: [2024, 12, 6], partner: 'NCC002', amount: 2550000, vat: 255000, method: PaymentMethod.CASH, status: PaymentStatus.PAID, desc: 'Mua 30 chai thuốc', invoice: 'HD-MH2412002' },
    // ⚠️ VAT FAIL: Cash >= 20M
    { code: 'MH-2412-003', date: [2024, 12, 10], partner: 'NCC003', amount: 25000000, vat: 2500000, method: PaymentMethod.CASH, status: PaymentStatus.PAID, desc: '⚠️ Mua xăng cả tháng - VAT FAIL (cash >= 20M)', invoice: 'HD-MH2412003' },
    { code: 'MH-2412-004', date: [2024, 12, 15], partner: 'NCC004', amount: 6000000, vat: 600000, method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.UNPAID, desc: 'Mua giống cho vụ mới', invoice: 'HD-MH2412004' },
    // ⚠️ VAT FAIL: No invoice
    { code: 'MH-2412-005', date: [2024, 12, 20], partner: 'NCC005', amount: 3000000, vat: 300000, method: PaymentMethod.CASH, status: PaymentStatus.PAID, desc: '⚠️ Mua vật tư nhỏ lẻ - VAT FAIL (không HĐ)', invoice: null },
  ];

  const purchaseTransactions: any[] = [];
  for (const p of purchasesData) {
    const trans = await prisma.transaction.upsert({
      where: { farm_id_trans_number: { farm_id: farm.id, trans_number: p.code } },
      update: {},
      create: {
        farm_id: farm.id,
        trans_number: p.code,
        code: p.code,
        trans_type: TransactionType.PURCHASE,
        trans_date: getDateInMonth(p.date[0], p.date[1], p.date[2]),
        partner_id: partners[p.partner].id,
        invoice_number: p.invoice,
        amount: p.amount,
        subtotal: p.amount,
        vat_amount: p.vat,
        tax_amount: p.vat,
        total_amount: p.amount + p.vat,
        payment_method: p.method,
        payment_status: p.status,
        paid_amount: p.status === PaymentStatus.PAID ? p.amount + p.vat : (p.paid || 0),
        description: p.desc,
        expense_type: ExpenseType.MATERIALS,
      },
    });
    purchaseTransactions.push(trans);
  }
  console.log(`      ✅ ${purchaseTransactions.length} PURCHASE transactions`);

  // 1.10 EXPENSE Transactions (Chi phí)
  console.log('   💸 Creating EXPENSE transactions...');
  const expensesData = [
    // November 2024
    { code: 'CP-2411-001', date: [2024, 11, 5], amount: 3500000, vat: 350000, method: PaymentMethod.CASH, expenseType: ExpenseType.UTILITY, desc: 'Tiền điện tháng 11', invoice: 'HD-DN2411' },
    { code: 'CP-2411-002', date: [2024, 11, 10], amount: 800000, vat: 80000, method: PaymentMethod.CASH, expenseType: ExpenseType.UTILITY, desc: 'Tiền nước tháng 11', invoice: 'HD-NC2411' },
    { code: 'CP-2411-003', date: [2024, 11, 15], amount: 5000000, vat: 500000, method: PaymentMethod.BANK_TRANSFER, expenseType: ExpenseType.RENT, desc: 'Thuê kho tháng 11', invoice: 'HD-TK2411' },
    // ⚠️ CIT ADD-BACK: Admin penalty
    { code: 'CP-2411-004', date: [2024, 11, 20], amount: 2000000, vat: 0, method: PaymentMethod.CASH, expenseType: ExpenseType.ADMIN_PENALTY, desc: '⚠️ Phạt ATGT - CIT ADD-BACK 100%', invoice: null },
    // December 2024
    { code: 'CP-2412-001', date: [2024, 12, 5], amount: 4200000, vat: 420000, method: PaymentMethod.CASH, expenseType: ExpenseType.UTILITY, desc: 'Tiền điện tháng 12', invoice: 'HD-DN2412' },
    { code: 'CP-2412-002', date: [2024, 12, 10], amount: 900000, vat: 90000, method: PaymentMethod.CASH, expenseType: ExpenseType.UTILITY, desc: 'Tiền nước tháng 12', invoice: 'HD-NC2412' },
    { code: 'CP-2412-003', date: [2024, 12, 15], amount: 5000000, vat: 500000, method: PaymentMethod.BANK_TRANSFER, expenseType: ExpenseType.RENT, desc: 'Thuê kho tháng 12', invoice: 'HD-TK2412' },
    // ⚠️ CIT WARNING: Entertainment expense (check limit)
    { code: 'CP-2412-004', date: [2024, 12, 20], amount: 8000000, vat: 800000, method: PaymentMethod.CASH, expenseType: ExpenseType.ENTERTAINMENT, desc: '⚠️ Tiếp khách cuối năm - CIT cần kiểm tra limit', invoice: 'HD-TK2412X' },
    // ⚠️ CIT ADD-BACK: Welfare expense (potential cap)
    { code: 'CP-2412-005', date: [2024, 12, 25], amount: 15000000, vat: 0, method: PaymentMethod.BANK_TRANSFER, expenseType: ExpenseType.WELFARE, desc: '⚠️ Quà tết nhân viên - CIT welfare cap', invoice: null },
  ];

  for (const e of expensesData) {
    await prisma.transaction.upsert({
      where: { farm_id_trans_number: { farm_id: farm.id, trans_number: e.code } },
      update: {},
      create: {
        farm_id: farm.id,
        trans_number: e.code,
        code: e.code,
        trans_type: TransactionType.EXPENSE,
        trans_date: getDateInMonth(e.date[0], e.date[1], e.date[2]),
        invoice_number: e.invoice,
        amount: e.amount,
        subtotal: e.amount,
        vat_amount: e.vat,
        tax_amount: e.vat,
        total_amount: e.amount + e.vat,
        payment_method: e.method,
        payment_status: PaymentStatus.PAID,
        paid_amount: e.amount + e.vat,
        description: e.desc,
        expense_type: e.expenseType,
      },
    });
  }
  console.log(`      ✅ ${expensesData.length} EXPENSE transactions`);

  // 1.11 INCOME Transactions (Thu nhập khác)
  console.log('   📈 Creating INCOME transactions...');
  const incomeData = [
    { code: 'TN-2411-001', date: [2024, 11, 30], amount: 500000, desc: 'Lãi tiền gửi ngân hàng tháng 11' },
    { code: 'TN-2412-001', date: [2024, 12, 30], amount: 600000, desc: 'Lãi tiền gửi ngân hàng tháng 12' },
  ];

  for (const i of incomeData) {
    await prisma.transaction.upsert({
      where: { farm_id_trans_number: { farm_id: farm.id, trans_number: i.code } },
      update: {},
      create: {
        farm_id: farm.id,
        trans_number: i.code,
        code: i.code,
        trans_type: TransactionType.INCOME,
        trans_date: getDateInMonth(i.date[0], i.date[1], i.date[2]),
        amount: i.amount,
        subtotal: i.amount,
        total_amount: i.amount,
        payment_method: PaymentMethod.BANK_TRANSFER,
        payment_status: PaymentStatus.PAID,
        paid_amount: i.amount,
        description: i.desc,
        income_category: IncomeCategory.SERVICE,
      },
    });
  }
  console.log(`      ✅ ${incomeData.length} INCOME transactions`);

  // ============================================================
  // PHASE 1 TASK 7: ATTENDANCE & PAYROLL
  // ============================================================
  console.log('\n📅 Creating attendance records...');

  // Create attendance for November & December 2024
  let attendanceCount = 0;
  for (const workerCode of Object.keys(workers)) {
    const worker = workers[workerCode];
    for (const month of testMonths) {
      const daysInMonth = month === 11 ? 30 : 31;
      for (let day = 1; day <= Math.min(daysInMonth, 28); day++) {
        const date = getDateInMonth(testYear, month, day);
        const dayOfWeek = date.getDay();
        
        // Skip Sundays for all, skip Saturdays for seasonal workers
        if (dayOfWeek === 0) continue;
        if (worker.worker_type === WorkerType.SEASONAL && dayOfWeek === 6) continue;

        let attendanceType = AttendanceType.NORMAL;
        let workHours = 8;
        let otNormal = 0;
        let otWeekend = 0;

        // Add some variation
        if (day === 15) {
          attendanceType = AttendanceType.HALF_DAY;
          workHours = 4;
        } else if (dayOfWeek === 6) {
          otWeekend = 2; // Saturday OT
        } else if (day % 10 === 0) {
          otNormal = 2; // Some OT on certain days
        }

        await prisma.attendance.upsert({
          where: {
            farm_id_worker_id_work_date: {
              farm_id: farm.id,
              worker_id: worker.id,
              work_date: date,
            },
          },
          update: {},
          create: {
            farm_id: farm.id,
            worker_id: worker.id,
            work_date: date,
            attendance_type: attendanceType,
            work_hours: workHours,
            ot_normal_hours: otNormal,
            ot_weekend_hours: otWeekend,
            ot_holiday_hours: 0,
            night_hours: 0,
          },
        });
        attendanceCount++;
      }
    }
  }
  console.log(`   ✅ ${attendanceCount} attendance records created`);

  // Create Payrolls for November & December
  console.log('💵 Creating payrolls...');
  for (const month of testMonths) {
    const periodCode = `BL${testYear}${month.toString().padStart(2, '0')}-001`;
    const periodStart = getDateInMonth(testYear, month, 1);
    const periodEnd = getDateInMonth(testYear, month, month === 11 ? 30 : 31);

    const payroll = await prisma.payroll.upsert({
      where: { farm_id_code: { farm_id: farm.id, code: periodCode } },
      update: {},
      create: {
        farm_id: farm.id,
        code: periodCode,
        period_start: periodStart,
        period_end: periodEnd,
        period_type: 'MONTHLY',
        status: month === 11 ? PayrollStatus.PAID : PayrollStatus.CONFIRMED,
        total_gross: 0,
        total_base: 0,
        total_ot: 0,
        total_allowance: 0,
        total_deduction: 0,
        total_net: 0,
        total_employer_insurance: 0,
        note: `Bảng lương tháng ${month}/${testYear}`,
      },
    });

    // Create payroll items for each worker
    let totalGross = 0;
    let totalInsurance = 0;
    let totalPIT = 0;
    let totalNet = 0;

    for (const workerCode of Object.keys(workers)) {
      const worker = workers[workerCode];
      
      // Calculate based on worker type
      let baseSalary = Number(worker.base_salary);
      let workDays = 22; // Approximate
      let grossSalary = worker.salary_type === SalaryType.MONTHLY ? baseSalary : baseSalary * workDays;
      
      // Insurance (only for full-time)
      let bhxh = 0, bhyt = 0, bhtn = 0;
      if (worker.worker_type === WorkerType.FULL_TIME) {
        bhxh = grossSalary * 0.08;
        bhyt = grossSalary * 0.015;
        bhtn = grossSalary * 0.01;
      }
      const totalInsuranceEmp = bhxh + bhyt + bhtn;

      // PIT calculation (simplified)
      let pit = 0;
      if (worker.worker_type === WorkerType.FULL_TIME) {
        // Progressive tax for full-time
        const personalDeduction = 11000000;
        const dependentDeduction = worker.dependents * 4400000;
        const taxableIncome = Math.max(0, grossSalary - totalInsuranceEmp - personalDeduction - dependentDeduction);
        
        if (taxableIncome > 0) {
          if (taxableIncome <= 5000000) pit = taxableIncome * 0.05;
          else if (taxableIncome <= 10000000) pit = taxableIncome * 0.10 - 250000;
          else if (taxableIncome <= 18000000) pit = taxableIncome * 0.15 - 750000;
          else if (taxableIncome <= 32000000) pit = taxableIncome * 0.20 - 1650000;
          else pit = taxableIncome * 0.25 - 3250000;
        }
      } else if (worker.labor_type === LaborType.CASUAL && !worker.has_commitment_08) {
        // 10% flat rate for casual without commitment 08 and >= 2M
        if (grossSalary >= 2000000) {
          pit = grossSalary * 0.10;
        }
      }

      const netSalary = grossSalary - totalInsuranceEmp - pit;

      await prisma.payrollItem.upsert({
        where: {
          payroll_id_worker_id: {
            payroll_id: payroll.id,
            worker_id: worker.id,
          },
        },
        update: {},
        create: {
          farm_id: farm.id,
          payroll_id: payroll.id,
          worker_id: worker.id,
          salary_type: worker.salary_type,
          base_rate: baseSalary,
          work_days: workDays,
          work_hours: workDays * 8,
          ot_normal_hours: randomBetween(0, 5),
          ot_weekend_hours: randomBetween(0, 4),
          ot_holiday_hours: 0,
          night_hours: 0,
          base_amount: grossSalary,
          ot_normal_amount: 0,
          ot_weekend_amount: 0,
          ot_holiday_amount: 0,
          night_amount: 0,
          total_allowance: worker.worker_type === WorkerType.FULL_TIME ? 500000 : 0,
          total_deduction: 0,
          bhxh_amount: bhxh,
          bhyt_amount: bhyt,
          bhtn_amount: bhtn,
          insurance_amount: totalInsuranceEmp,
          employer_bhxh: worker.worker_type === WorkerType.FULL_TIME ? grossSalary * 0.175 : 0,
          employer_bhyt: worker.worker_type === WorkerType.FULL_TIME ? grossSalary * 0.03 : 0,
          employer_bhtn: worker.worker_type === WorkerType.FULL_TIME ? grossSalary * 0.01 : 0,
          employer_bhtnld: worker.worker_type === WorkerType.FULL_TIME ? grossSalary * 0.005 : 0,
          employer_insurance: worker.worker_type === WorkerType.FULL_TIME ? grossSalary * 0.215 : 0,
          tax_amount: pit,
          gross_amount: grossSalary + (worker.worker_type === WorkerType.FULL_TIME ? 500000 : 0),
          net_amount: netSalary,
          paid_amount: month === 11 ? netSalary : 0,
          is_paid: month === 11,
          paid_at: month === 11 ? new Date('2024-12-05') : null,
        },
      });

      totalGross += grossSalary;
      totalInsurance += totalInsuranceEmp;
      totalPIT += pit;
      totalNet += netSalary;
    }

    // Update payroll totals
    await prisma.payroll.update({
      where: { id: payroll.id },
      data: {
        total_gross: totalGross,
        total_insurance: totalInsurance,
        total_pit: totalPIT,
        total_net: totalNet,
      },
    });
  }
  console.log(`   ✅ Payrolls for Nov-Dec 2024 created`);

  // ============================================================
  // PHASE 2: INVENTORY MANAGEMENT
  // ============================================================
  console.log('\n📦 PHASE 2: INVENTORY & AR/AP');
  console.log('─'.repeat(60));

  // 2.1 Initialize Stock for products
  console.log('📊 Initializing stock records...');
  for (const product of products) {
    await prisma.stock.upsert({
      where: {
        farm_id_product_id_location_code: {
          farm_id: farm.id,
          product_id: product.id,
          location_code: 'DEFAULT',
        },
      },
      update: {},
      create: {
        farm_id: farm.id,
        product_id: product.id,
        location_code: 'DEFAULT',
        quantity: 0,
        avg_cost: Number(product.purchase_price),
        total_value: 0,
        min_quantity: product.min_stock,
      },
    });
  }

  // 2.2 Create Stock Movements
  console.log('📦 Creating stock movements...');
  const stockMovementsData = [
    // Initial stock IN - November
    { code: 'NK-2411-001', date: [2024, 11, 1], product: 'GAO-001', type: StockMovementType.IN, qty: 200, price: 22000, desc: 'Nhập gạo đầu tháng 11' },
    { code: 'NK-2411-002', date: [2024, 11, 1], product: 'RAU-001', type: StockMovementType.IN, qty: 100, price: 5000, desc: 'Nhập rau muống' },
    { code: 'NK-2411-003', date: [2024, 11, 1], product: 'RAU-002', type: StockMovementType.IN, qty: 80, price: 18000, desc: 'Nhập cà chua' },
    { code: 'NK-2411-004', date: [2024, 11, 1], product: 'TRUNG-001', type: StockMovementType.IN, qty: 500, price: 2800, desc: 'Nhập trứng gà' },
    { code: 'NK-2411-005', date: [2024, 11, 3], product: 'PHAN-001', type: StockMovementType.IN, qty: 20, price: 350000, desc: 'Nhập phân NPK' },
    { code: 'NK-2411-006', date: [2024, 11, 8], product: 'THUOC-001', type: StockMovementType.IN, qty: 20, price: 85000, desc: 'Nhập thuốc trừ sâu' },
    // Stock OUT - November (sales)
    { code: 'XK-2411-001', date: [2024, 11, 5], product: 'GAO-001', type: StockMovementType.OUT, qty: 50, price: 22000, desc: 'Xuất bán gạo KH001' },
    { code: 'XK-2411-002', date: [2024, 11, 10], product: 'RAU-001', type: StockMovementType.OUT, qty: 30, price: 5000, desc: 'Xuất bán rau' },
    { code: 'XK-2411-003', date: [2024, 11, 15], product: 'RAU-002', type: StockMovementType.OUT, qty: 20, price: 18000, desc: 'Xuất bán cà chua' },
    // Stock IN - December
    { code: 'NK-2412-001', date: [2024, 12, 1], product: 'GAO-001', type: StockMovementType.IN, qty: 300, price: 23000, desc: 'Nhập gạo tháng 12 (giá tăng)' },
    { code: 'NK-2412-002', date: [2024, 12, 1], product: 'RAU-001', type: StockMovementType.IN, qty: 120, price: 5500, desc: 'Nhập rau muống mới' },
    { code: 'NK-2412-003', date: [2024, 12, 2], product: 'PHAN-001', type: StockMovementType.IN, qty: 30, price: 350000, desc: 'Nhập thêm phân NPK' },
    // Stock OUT - December
    { code: 'XK-2412-001', date: [2024, 12, 3], product: 'GAO-001', type: StockMovementType.OUT, qty: 80, price: 22500, desc: 'Xuất bán gạo KH001' },
    { code: 'XK-2412-002', date: [2024, 12, 8], product: 'RAU-001', type: StockMovementType.OUT, qty: 50, price: 5250, desc: 'Xuất bán rau chợ' },
    // Adjustments
    { code: 'DC-2412-001', date: [2024, 12, 15], product: 'TRUNG-001', type: StockMovementType.ADJUST_OUT, qty: 20, price: 2800, desc: 'Điều chỉnh giảm (hư hỏng)' },
  ];

  // Process stock movements and update stock
  for (const sm of stockMovementsData) {
    const product = products.find(p => p.code === sm.product);
    if (!product) continue;

    const stock = await prisma.stock.findFirst({
      where: { farm_id: farm.id, product_id: product.id },
    });

    const qtyBefore = stock ? Number(stock.quantity) : 0;
    const avgCostBefore = stock ? Number(stock.avg_cost) : sm.price;
    
    let qtyAfter = qtyBefore;
    let avgCostAfter = avgCostBefore;
    let cogsAmount = 0;

    if (sm.type === StockMovementType.IN) {
      // Moving Average Cost calculation
      const totalValueBefore = qtyBefore * avgCostBefore;
      const newValue = sm.qty * sm.price;
      qtyAfter = qtyBefore + sm.qty;
      avgCostAfter = qtyAfter > 0 ? (totalValueBefore + newValue) / qtyAfter : sm.price;
    } else {
      qtyAfter = qtyBefore - sm.qty;
      cogsAmount = sm.qty * avgCostBefore;
    }

    await prisma.stockMovement.upsert({
      where: { farm_id_code: { farm_id: farm.id, code: sm.code } },
      update: {},
      create: {
        farm_id: farm.id,
        code: sm.code,
        date: getDateInMonth(sm.date[0], sm.date[1], sm.date[2]),
        type: sm.type,
        product_id: product.id,
        quantity: sm.qty,
        unit: product.unit,
        unit_price: sm.price,
        qty_before: qtyBefore,
        qty_after: qtyAfter,
        avg_cost_before: avgCostBefore,
        avg_cost_after: avgCostAfter,
        cogs_amount: cogsAmount,
        description: sm.desc,
      },
    });

    // Update stock
    await prisma.stock.update({
      where: {
        farm_id_product_id_location_code: {
          farm_id: farm.id,
          product_id: product.id,
          location_code: 'DEFAULT',
        },
      },
      data: {
        quantity: qtyAfter,
        avg_cost: avgCostAfter,
        total_value: qtyAfter * avgCostAfter,
        last_movement_at: getDateInMonth(sm.date[0], sm.date[1], sm.date[2]),
      },
    });
  }
  console.log(`   ✅ ${stockMovementsData.length} stock movements created`);

  // 2.3 Create AR Transactions (from unpaid/partial sales)
  console.log('📊 Creating AR transactions...');
  const arTransactions = [];
  for (const sale of saleTransactions) {
    if (sale.payment_status !== PaymentStatus.PAID) {
      const arTrans = await prisma.aRTransaction.upsert({
        where: { farm_id_code: { farm_id: farm.id, code: `AR-${sale.code}` } },
        update: {},
        create: {
          farm_id: farm.id,
          customer_id: sale.partner_id,
          type: ARTransactionType.INVOICE,
          code: `AR-${sale.code}`,
          trans_date: sale.trans_date,
          amount: Number(sale.total_amount),
          paid_amount: Number(sale.paid_amount),
          balance: Number(sale.total_amount) - Number(sale.paid_amount),
          due_date: new Date(sale.trans_date.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
          status: sale.payment_status === PaymentStatus.PARTIAL ? ARAPStatus.PARTIAL : ARAPStatus.UNPAID,
          transaction_id: sale.id,
          description: sale.description,
        },
      });
      arTransactions.push(arTrans);
    }
  }
  console.log(`   ✅ ${arTransactions.length} AR transactions created`);

  // 2.4 Create AP Transactions (from unpaid/partial purchases)
  console.log('📊 Creating AP transactions...');
  const apTransactions = [];
  for (const purchase of purchaseTransactions) {
    if (purchase.payment_status !== PaymentStatus.PAID) {
      const apTrans = await prisma.aPTransaction.upsert({
        where: { farm_id_code: { farm_id: farm.id, code: `AP-${purchase.code}` } },
        update: {},
        create: {
          farm_id: farm.id,
          vendor_id: purchase.partner_id,
          type: APTransactionType.INVOICE,
          code: `AP-${purchase.code}`,
          trans_date: purchase.trans_date,
          amount: Number(purchase.total_amount),
          paid_amount: Number(purchase.paid_amount),
          balance: Number(purchase.total_amount) - Number(purchase.paid_amount),
          due_date: new Date(purchase.trans_date.getTime() + 45 * 24 * 60 * 60 * 1000), // 45 days
          status: purchase.payment_status === PaymentStatus.PARTIAL ? ARAPStatus.PARTIAL : ARAPStatus.UNPAID,
          transaction_id: purchase.id,
          description: purchase.description,
        },
      });
      apTransactions.push(apTrans);
    }
  }
  console.log(`   ✅ ${apTransactions.length} AP transactions created`);

  // 2.5 Create VAT Declarations
  console.log('📋 Creating VAT declarations...');
  for (const month of testMonths) {
    const periodCode = formatPeriod(testYear, month);
    const fromDate = getDateInMonth(testYear, month, 1);
    const toDate = getDateInMonth(testYear, month, month === 11 ? 30 : 31);

    // Calculate VAT from transactions
    const salesInMonth = saleTransactions.filter(t => {
      const tMonth = t.trans_date.getMonth() + 1;
      return tMonth === month;
    });
    const purchasesInMonth = purchaseTransactions.filter(t => {
      const tMonth = t.trans_date.getMonth() + 1;
      return tMonth === month;
    });

    const outputVatAmount = salesInMonth.reduce((sum, t) => sum + Number(t.amount), 0);
    const outputVatTax = salesInMonth.reduce((sum, t) => sum + Number(t.vat_amount), 0);
    const inputVatAmount = purchasesInMonth.reduce((sum, t) => sum + Number(t.amount), 0);
    const inputVatTax = purchasesInMonth.reduce((sum, t) => sum + Number(t.vat_amount), 0);

    await prisma.vATDeclaration.upsert({
      where: { farm_id_period_code: { farm_id: farm.id, period_code: periodCode } },
      update: {},
      create: {
        farm_id: farm.id,
        period_type: VATPeriodType.MONTHLY,
        period_code: periodCode,
        from_date: fromDate,
        to_date: toDate,
        input_vat_count: purchasesInMonth.length,
        input_vat_amount: inputVatAmount,
        input_vat_tax: inputVatTax,
        output_vat_count: salesInMonth.length,
        output_vat_amount: outputVatAmount,
        output_vat_tax: outputVatTax,
        payable_vat: outputVatTax - inputVatTax,
        status: month === 11 ? VATDeclarationStatus.SUBMITTED : VATDeclarationStatus.DRAFT,
        submitted_at: month === 11 ? new Date('2024-12-15') : null,
      },
    });
  }
  console.log('   ✅ VAT declarations for Nov-Dec 2024 created');

  // 2.6 Create Period Locks (lock November)
  console.log('🔒 Creating period locks...');
  await prisma.periodLock.upsert({
    where: { farm_id_period_code: { farm_id: farm.id, period_code: '2024-11' } },
    update: {},
    create: {
      farm_id: farm.id,
      period_type: 'MONTH',
      period_code: '2024-11',
      from_date: getDateInMonth(2024, 11, 1),
      to_date: getDateInMonth(2024, 11, 30),
      status: LockStatus.LOCKED,
      locked_at: new Date('2024-12-05'),
      locked_by: user.id,
      lock_reason: 'Khóa sổ tháng 11/2024',
    },
  });
  console.log('   ✅ November 2024 period locked');

  // ============================================================
  // PHASE 3: TAX ENGINE (Tasks 1-9)
  // ============================================================
  console.log('\n🏛️  PHASE 3: TAX ENGINE');
  console.log('─'.repeat(60));

  // 3.1 Create Fixed Assets (Task 10 prerequisite, but schema exists)
  console.log('🏭 Creating fixed assets...');
  const assetsData = [
    {
      code: 'TS-001',
      name: 'Máy cày Kubota L4508',
      category: AssetCategory.MACHINERY,
      purchaseDate: new Date('2024-01-15'),
      purchasePrice: 450000000,
      usefulLifeMonths: 120, // 10 years
      supplier: 'Công ty Kubota Việt Nam',
      invoiceNumber: 'HD-TS001',
    },
    {
      code: 'TS-002',
      name: 'Xe tải Hyundai 3.5 tấn',
      category: AssetCategory.VEHICLE,
      purchaseDate: new Date('2024-03-01'),
      purchasePrice: 680000000,
      usefulLifeMonths: 120,
      supplier: 'Đại lý Hyundai HCM',
      invoiceNumber: 'HD-TS002',
    },
    // ⚠️ Xe dưới 9 chỗ > 1.6 tỷ - CIT depreciation cap test
    {
      code: 'TS-003',
      name: 'Xe Toyota Camry (dưới 9 chỗ)',
      category: AssetCategory.VEHICLE,
      purchaseDate: new Date('2024-06-01'),
      purchasePrice: 1800000000, // > 1.6B cap
      usefulLifeMonths: 120,
      supplier: 'Toyota Việt Nam',
      invoiceNumber: 'HD-TS003',
      maxDeductibleValue: 1600000000, // CIT cap
    },
    {
      code: 'TS-004',
      name: 'Máy bơm nước công nghiệp',
      category: AssetCategory.EQUIPMENT,
      purchaseDate: new Date('2024-02-01'),
      purchasePrice: 85000000,
      usefulLifeMonths: 60, // 5 years
      supplier: 'Công ty Thiết bị ABC',
      invoiceNumber: 'HD-TS004',
    },
    {
      code: 'TS-005',
      name: 'Nhà kho 200m2',
      category: AssetCategory.BUILDING,
      purchaseDate: new Date('2023-01-01'),
      purchasePrice: 1200000000,
      usefulLifeMonths: 300, // 25 years
      supplier: 'Tự xây dựng',
      invoiceNumber: null,
    },
  ];

  for (const asset of assetsData) {
    const monthlyDep = asset.purchasePrice / asset.usefulLifeMonths;
    // Calculate months depreciated (from purchase to now)
    const monthsDepreciated = Math.min(
      asset.usefulLifeMonths,
      Math.floor((Date.now() - asset.purchaseDate.getTime()) / (30 * 24 * 60 * 60 * 1000))
    );
    const accumulatedDep = monthlyDep * monthsDepreciated;

    await prisma.asset.upsert({
      where: { farm_id_code: { farm_id: farm.id, code: asset.code } },
      update: {},
      create: {
        farm_id: farm.id,
        code: asset.code,
        name: asset.name,
        category: asset.category,
        purchase_date: asset.purchaseDate,
        purchase_price: asset.purchasePrice,
        original_cost: asset.purchasePrice,
        useful_life_months: asset.usefulLifeMonths,
        depreciation_method: DepreciationMethod.STRAIGHT_LINE,
        monthly_depreciation: monthlyDep,
        accumulated_depreciation: accumulatedDep,
        book_value: asset.purchasePrice - accumulatedDep,
        residual_value: 0,
        supplier: asset.supplier,
        invoice_number: asset.invoiceNumber,
        status: AssetStatus.ACTIVE,
        max_deductible_value: asset.maxDeductibleValue || null,
        is_transport_biz: false,
      },
    });
  }
  console.log(`   ✅ ${assetsData.length} fixed assets created`);

  // 3.2 Create CIT Calculations
  console.log('📊 Creating CIT calculations...');
  // Q4 2024 CIT
  const citQ4 = await prisma.cITCalculation.upsert({
    where: { farm_id_period: { farm_id: farm.id, period: '2024-Q4' } },
    update: {},
    create: {
      farm_id: farm.id,
      period: '2024-Q4',
      period_type: CITPeriodType.QUARTERLY,
      // Revenue from sales
      total_revenue: 144500000, // Sum of all sales
      other_income: 1100000, // Interest income
      // Expenses
      total_expenses: 95000000,
      // Calculations
      accounting_profit: 49500000,
      add_backs: 27000000, // Penalties + welfare + cash >= 20M
      deductions: 0,
      taxable_income: 76500000,
      tax_rate: 20,
      cit_amount: 15300000,
      loss_carried: 0,
      status: 'DRAFT',
    },
  });

  // Create CIT adjustments
  const citAdjustmentsData = [
    { type: CITAdjustmentType.ADD_BACK, category: 'ADMIN_PENALTY', desc: 'Tiền phạt ATGT', amount: 2000000 },
    { type: CITAdjustmentType.ADD_BACK, category: 'WELFARE_EXCESS', desc: 'Chi phúc lợi vượt 1 tháng lương BQ', amount: 5000000 },
    { type: CITAdjustmentType.ADD_BACK, category: 'NO_INVOICE', desc: 'Chi phí không hóa đơn', amount: 3000000 },
    { type: CITAdjustmentType.ADD_BACK, category: 'CASH_OVER_LIMIT', desc: 'Chi tiền mặt >= 20tr không chuyển khoản', amount: 25000000 },
  ];

  for (const adj of citAdjustmentsData) {
    await prisma.cITAdjustment.create({
      data: {
        cit_calculation_id: citQ4.id,
        adjustment_type: adj.type,
        category: adj.category,
        description: adj.desc,
        amount: adj.amount,
      },
    });
  }
  console.log('   ✅ CIT Q4/2024 calculation created with adjustments');

  // 3.3 Create PIT Calculations
  console.log('📊 Creating PIT calculations...');
  for (const month of testMonths) {
    const periodCode = formatPeriod(testYear, month);
    
    for (const workerCode of Object.keys(workers)) {
      const worker = workers[workerCode];
      
      // Only calculate for workers subject to tax
      if (!worker.is_subject_to_tax) continue;

      let grossIncome = Number(worker.base_salary);
      if (worker.salary_type === SalaryType.DAILY) {
        grossIncome = Number(worker.base_salary) * 22; // Average work days
      }

      // Deductions
      let insuranceDeduction = 0;
      if (worker.worker_type === WorkerType.FULL_TIME) {
        insuranceDeduction = grossIncome * 0.105; // 10.5% (BHXH 8% + BHYT 1.5% + BHTN 1%)
      }

      const familyDeduction = 11000000; // Personal deduction
      const dependentDeduction = worker.dependents * 4400000;
      const totalDeduction = insuranceDeduction + familyDeduction + dependentDeduction;
      
      const taxableIncome = Math.max(0, grossIncome - totalDeduction);

      // Calculate PIT based on worker type
      let pitAmount = 0;
      let taxBrackets: any[] = [];

      if (worker.worker_type === WorkerType.FULL_TIME) {
        // Progressive tax
        if (taxableIncome > 0) {
          const brackets = [
            { bracket: 1, min: 0, max: 5000000, rate: 5 },
            { bracket: 2, min: 5000000, max: 10000000, rate: 10 },
            { bracket: 3, min: 10000000, max: 18000000, rate: 15 },
            { bracket: 4, min: 18000000, max: 32000000, rate: 20 },
            { bracket: 5, min: 32000000, max: 52000000, rate: 25 },
            { bracket: 6, min: 52000000, max: 80000000, rate: 30 },
            { bracket: 7, min: 80000000, max: Infinity, rate: 35 },
          ];

          let remainingIncome = taxableIncome;
          for (const b of brackets) {
            if (remainingIncome <= 0) break;
            const taxableInBracket = Math.min(remainingIncome, b.max - b.min);
            const taxInBracket = taxableInBracket * (b.rate / 100);
            if (taxInBracket > 0) {
              taxBrackets.push({ bracket: b.bracket, rate: b.rate, amount: taxInBracket });
              pitAmount += taxInBracket;
            }
            remainingIncome -= (b.max - b.min);
          }
        }
      } else if (worker.labor_type === LaborType.CASUAL) {
        // Flat rate for casual
        if (grossIncome >= 2000000 && !worker.has_commitment_08) {
          pitAmount = grossIncome * 0.10;
          taxBrackets = [{ bracket: 'FLAT', rate: 10, amount: pitAmount }];
        }
      }

      await prisma.pITCalculation.upsert({
        where: {
          farm_id_employee_id_period: {
            farm_id: farm.id,
            employee_id: worker.id,
            period: periodCode,
          },
        },
        update: {},
        create: {
          farm_id: farm.id,
          employee_id: worker.id,
          period: periodCode,
          gross_income: grossIncome,
          insurance_deduction: insuranceDeduction,
          family_deduction: familyDeduction,
          dependent_deduction: dependentDeduction,
          other_deduction: 0,
          total_deduction: totalDeduction,
          taxable_income: taxableIncome,
          pit_amount: pitAmount,
          tax_brackets: taxBrackets,
          dependents_count: worker.dependents,
          calculated_at: new Date(),
        },
      });
    }
  }
  console.log('   ✅ PIT calculations for Nov-Dec 2024 created');

  // 3.4 Create Tax Schedules
  console.log('📅 Creating tax schedules...');
  const taxSchedulesData = [
    // VAT Monthly
    { type: TaxType.VAT, period: '2024-11', dueDate: new Date('2024-12-20'), status: TaxScheduleStatus.PAID, amount: 3200000 },
    { type: TaxType.VAT, period: '2024-12', dueDate: new Date('2025-01-20'), status: TaxScheduleStatus.PENDING, amount: 4500000 },
    // CIT Quarterly
    { type: TaxType.CIT, period: '2024-Q4', dueDate: new Date('2025-01-30'), status: TaxScheduleStatus.PENDING, amount: 15300000 },
    // PIT Monthly
    { type: TaxType.PIT, period: '2024-11', dueDate: new Date('2024-12-20'), status: TaxScheduleStatus.PAID, amount: 2500000 },
    { type: TaxType.PIT, period: '2024-12', dueDate: new Date('2025-01-20'), status: TaxScheduleStatus.PENDING, amount: 2800000 },
  ];

  for (const ts of taxSchedulesData) {
    await prisma.taxSchedule.upsert({
      where: {
        farm_id_tax_type_period: {
          farm_id: farm.id,
          tax_type: ts.type,
          period: ts.period,
        },
      },
      update: {},
      create: {
        farm_id: farm.id,
        tax_type: ts.type,
        period: ts.period,
        due_date: ts.dueDate,
        status: ts.status,
        amount: ts.amount,
        paid_at: ts.status === TaxScheduleStatus.PAID ? new Date() : null,
      },
    });
  }
  console.log(`   ✅ ${taxSchedulesData.length} tax schedules created`);

  // ============================================================
  // SUMMARY
  // ============================================================
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log('\n' + '═'.repeat(60));
  console.log('✅ SEED COMPLETED SUCCESSFULLY!');
  console.log('═'.repeat(60));

  // Get counts
  const stats = {
    farm: await prisma.farm.count(),
    users: await prisma.user.count(),
    products: await prisma.product.count({ where: { farm_id: farm.id } }),
    partners: await prisma.partner.count({ where: { farm_id: farm.id } }),
    workers: await prisma.worker.count({ where: { farm_id: farm.id } }),
    transactions: await prisma.transaction.count({ where: { farm_id: farm.id } }),
    attendances: await prisma.attendance.count({ where: { farm_id: farm.id } }),
    payrolls: await prisma.payroll.count({ where: { farm_id: farm.id } }),
    stocks: await prisma.stock.count({ where: { farm_id: farm.id } }),
    stockMovements: await prisma.stockMovement.count({ where: { farm_id: farm.id } }),
    arTransactions: await prisma.aRTransaction.count({ where: { farm_id: farm.id } }),
    apTransactions: await prisma.aPTransaction.count({ where: { farm_id: farm.id } }),
    vatDeclarations: await prisma.vATDeclaration.count({ where: { farm_id: farm.id } }),
    taxRules: await prisma.taxRule.count({ where: { farm_id: farm.id } }),
    assets: await prisma.asset.count({ where: { farm_id: farm.id } }),
    citCalculations: await prisma.cITCalculation.count({ where: { farm_id: farm.id } }),
    pitCalculations: await prisma.pITCalculation.count({ where: { farm_id: farm.id } }),
    taxSchedules: await prisma.taxSchedule.count({ where: { farm_id: farm.id } }),
  };

  console.log('\n📊 DATA SUMMARY:');
  console.log('─'.repeat(40));
  console.log(`   🏠 Farm:              ${stats.farm}`);
  console.log(`   👤 Users:             ${stats.users}`);
  console.log(`   📦 Products:          ${stats.products}`);
  console.log(`   🤝 Partners:          ${stats.partners}`);
  console.log(`   👷 Workers:           ${stats.workers}`);
  console.log(`   💰 Transactions:      ${stats.transactions}`);
  console.log(`   📅 Attendances:       ${stats.attendances}`);
  console.log(`   💵 Payrolls:          ${stats.payrolls}`);
  console.log(`   📊 Stock Records:     ${stats.stocks}`);
  console.log(`   📦 Stock Movements:   ${stats.stockMovements}`);
  console.log(`   📈 AR Transactions:   ${stats.arTransactions}`);
  console.log(`   📉 AP Transactions:   ${stats.apTransactions}`);
  console.log(`   📋 VAT Declarations:  ${stats.vatDeclarations}`);
  console.log(`   🏛️  Tax Rules:         ${stats.taxRules}`);
  console.log(`   🏭 Fixed Assets:      ${stats.assets}`);
  console.log(`   💼 CIT Calculations:  ${stats.citCalculations}`);
  console.log(`   👤 PIT Calculations:  ${stats.pitCalculations}`);
  console.log(`   📅 Tax Schedules:     ${stats.taxSchedules}`);
  console.log('─'.repeat(40));

  console.log('\n🔑 LOGIN CREDENTIALS:');
  console.log('─'.repeat(40));
  console.log(`   Email:    test@labaerp.com`);
  console.log(`   Password: Test@123`);
  console.log('─'.repeat(40));

  console.log('\n⚠️  TEST CASES FOR VAT/CIT VALIDATION:');
  console.log('─'.repeat(40));
  console.log('   📌 MH-2412-003: Cash >= 20M → VAT không khấu trừ');
  console.log('   📌 MH-2412-005: Không HĐ → VAT không khấu trừ');
  console.log('   📌 CP-2411-004: Phạt ATGT → CIT add-back 100%');
  console.log('   📌 CP-2412-004: Tiếp khách → CIT kiểm tra limit');
  console.log('   📌 CP-2412-005: Phúc lợi → CIT welfare cap');
  console.log('   📌 TS-003: Xe < 9 chỗ > 1.6B → CIT depreciation cap');
  console.log('   📌 NV004, NV005: LĐ thời vụ >= 2M → PIT 10%');
  console.log('   📌 NV006: Có cam kết 08 → PIT 0%');
  console.log('─'.repeat(40));

  console.log(`\n⏱️  Duration: ${duration}s`);
  console.log('═'.repeat(60) + '\n');
}

// Run main function
main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
