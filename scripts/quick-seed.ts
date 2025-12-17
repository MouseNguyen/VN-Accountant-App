// scripts/quick-seed.ts
// Quick seed for testing - compatible with current Prisma schema
// Run: npx tsx scripts/quick-seed.ts

import { PrismaClient, BusinessType, UserRole, PartnerType, ProductCategory, TransactionType, PaymentMethod, PaymentStatus, WorkerType, WorkerStatus, SalaryType, LaborType } from '@prisma/client';
import { hash } from 'bcryptjs';
import { seedTaxRulesForFarm } from '../prisma/seed/tax-rules';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 LABA ERP - Quick Seed');
    console.log('═'.repeat(60));

    // 1. Create Farm
    console.log('\n📦 Creating Farm...');
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
        },
    });
    console.log(`   ✅ Farm: ${farm.name}`);

    // 2. Seed Tax Rules
    console.log('\n🏛️  Seeding Tax Rules...');
    await seedTaxRulesForFarm(prisma, farm.id);
    console.log('   ✅ 29 Tax Rules seeded');

    // 3. Create User
    console.log('\n👤 Creating User...');
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
    console.log(`   ✅ User: ${user.email} / Test@123`);

    // 4. Create Products
    console.log('\n📦 Creating Products...');
    const productsData = [
        { code: 'GAO-001', name: 'Gạo ST25', category: ProductCategory.NONG_SAN, unit: 'kg', sellPrice: 28000, buyPrice: 22000 },
        { code: 'RAU-001', name: 'Rau muống', category: ProductCategory.NONG_SAN, unit: 'bó', sellPrice: 8000, buyPrice: 5000 },
        { code: 'TRUNG-001', name: 'Trứng gà', category: ProductCategory.NONG_SAN, unit: 'quả', sellPrice: 3500, buyPrice: 2800 },
        { code: 'PHAN-001', name: 'Phân bón NPK', category: ProductCategory.VAT_TU, unit: 'bao', sellPrice: 380000, buyPrice: 350000 },
        { code: 'XNG-001', name: 'Xăng A95', category: ProductCategory.VAT_TU, unit: 'lít', sellPrice: 25000, buyPrice: 23500 },
    ];

    for (const p of productsData) {
        await prisma.product.upsert({
            where: { farm_id_code: { farm_id: farm.id, code: p.code } },
            update: {},
            create: {
                code: p.code,
                name: p.name,
                category: p.category,
                unit: p.unit,
                selling_price: p.sellPrice,
                purchase_price: p.buyPrice,
                stock_qty: 100,
                is_active: true,
                farm: { connect: { id: farm.id } },
            },
        });
    }
    console.log(`   ✅ ${productsData.length} products created`);

    // 5. Create Partners
    console.log('\n🤝 Creating Partners...');
    const partnersData = [
        { code: 'KH001', name: 'Công ty TNHH Thực phẩm Sạch', type: PartnerType.CUSTOMER, taxCode: '0123456789' },
        { code: 'KH002', name: 'Chợ đầu mối Long Biên', type: PartnerType.CUSTOMER, taxCode: null },
        { code: 'NCC001', name: 'Công ty Phân bón Việt Nhật', type: PartnerType.VENDOR, taxCode: '0101248141' },
        { code: 'NCC002', name: 'Trạm xăng Petrolimex', type: PartnerType.VENDOR, taxCode: '0100100100' },
    ];

    const partners: { [key: string]: any } = {};
    for (const p of partnersData) {
        const partner = await prisma.partner.upsert({
            where: { farm_id_code: { farm_id: farm.id, code: p.code } },
            update: {},
            create: {
                code: p.code,
                name: p.name,
                partner_type: p.type,
                tax_code: p.taxCode,
                is_active: true,
                farm: { connect: { id: farm.id } },
            },
        });
        partners[p.code] = partner;
    }
    console.log(`   ✅ ${partnersData.length} partners created`);

    // 6. Create Workers
    console.log('\n👷 Creating Workers...');
    const workersData = [
        { code: 'NV001', name: 'Nguyễn Văn An', salary: 12000000, type: WorkerType.FULL_TIME, laborType: LaborType.FULL_TIME, dependents: 2 },
        { code: 'NV002', name: 'Trần Thị Bình', salary: 10000000, type: WorkerType.FULL_TIME, laborType: LaborType.FULL_TIME, dependents: 1 },
        { code: 'NV003', name: 'Phạm Thị Dung', salary: 300000, type: WorkerType.SEASONAL, laborType: LaborType.CASUAL, dependents: 0 },
    ];

    for (const w of workersData) {
        await prisma.worker.upsert({
            where: { farm_id_code: { farm_id: farm.id, code: w.code } },
            update: {},
            create: {
                code: w.code,
                name: w.name,
                base_salary: w.salary,
                daily_rate: w.type === WorkerType.SEASONAL ? w.salary : w.salary / 26,
                worker_type: w.type,
                salary_type: w.type === WorkerType.SEASONAL ? SalaryType.DAILY : SalaryType.MONTHLY,
                labor_type: w.laborType,
                status: WorkerStatus.ACTIVE,
                dependents: w.dependents,
                start_date: new Date('2024-01-01'),
                is_active: true,
                farm: { connect: { id: farm.id } },
            },
        });
    }
    console.log(`   ✅ ${workersData.length} workers created`);

    // 7. Create Transactions for current month
    console.log('\n💰 Creating Transactions...');
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const transactionsData = [
        // Sales
        { code: `BH-${year}${month.toString().padStart(2, '0')}-001`, type: TransactionType.SALE, date: new Date(year, month - 1, 5), partner: 'KH001', amount: 15000000, vat: 1500000, desc: 'Bán 500kg gạo ST25' },
        { code: `BH-${year}${month.toString().padStart(2, '0')}-002`, type: TransactionType.SALE, date: new Date(year, month - 1, 10), partner: 'KH002', amount: 8000000, vat: 400000, desc: 'Bán rau tổng hợp' },
        // Purchases
        { code: `MH-${year}${month.toString().padStart(2, '0')}-001`, type: TransactionType.PURCHASE, date: new Date(year, month - 1, 3), partner: 'NCC001', amount: 7000000, vat: 700000, desc: 'Mua 20 bao phân NPK' },
        { code: `MH-${year}${month.toString().padStart(2, '0')}-002`, type: TransactionType.PURCHASE, date: new Date(year, month - 1, 8), partner: 'NCC002', amount: 5000000, vat: 500000, desc: 'Mua xăng tháng này' },
        // Expenses
        { code: `CP-${year}${month.toString().padStart(2, '0')}-001`, type: TransactionType.EXPENSE, date: new Date(year, month - 1, 5), partner: null, amount: 3500000, vat: 350000, desc: 'Tiền điện tháng này' },
        { code: `CP-${year}${month.toString().padStart(2, '0')}-002`, type: TransactionType.EXPENSE, date: new Date(year, month - 1, 10), partner: null, amount: 800000, vat: 80000, desc: 'Tiền nước tháng này' },
        // Income
        { code: `TN-${year}${month.toString().padStart(2, '0')}-001`, type: TransactionType.INCOME, date: new Date(year, month - 1, 15), partner: null, amount: 500000, vat: 0, desc: 'Lãi tiền gửi ngân hàng' },
    ];

    for (const t of transactionsData) {
        await prisma.transaction.upsert({
            where: { farm_id_trans_number: { farm_id: farm.id, trans_number: t.code } },
            update: {},
            create: {
                trans_number: t.code,
                code: t.code,
                trans_type: t.type,
                trans_date: t.date,
                amount: t.amount,
                subtotal: t.amount,
                vat_amount: t.vat,
                tax_amount: t.vat,
                total_amount: t.amount + t.vat,
                payment_method: PaymentMethod.BANK_TRANSFER,
                payment_status: PaymentStatus.PAID,
                paid_amount: t.amount + t.vat,
                description: t.desc,
                invoice_number: `HD-${t.code}`,
                farm: { connect: { id: farm.id } },
                partner: t.partner ? { connect: { id: partners[t.partner].id } } : undefined,
            },
        });
    }
    console.log(`   ✅ ${transactionsData.length} transactions created`);

    // 8. Create Insurance Config
    console.log('\n🏥 Creating Insurance Config...');
    await prisma.insuranceConfig.upsert({
        where: { farm_id: farm.id },
        update: {},
        create: {
            bhxh_employee: 8,
            bhxh_employer: 17.5,
            bhyt_employee: 1.5,
            bhyt_employer: 3,
            bhtn_employee: 1,
            bhtn_employer: 1,
            min_wage: 4680000,
            max_wage: 93600000,
            is_active: true,
            farm: { connect: { id: farm.id } },
        },
    });
    console.log('   ✅ Insurance config created');

    console.log('\n' + '═'.repeat(60));
    console.log('✅ SEED COMPLETED!');
    console.log('═'.repeat(60));
    console.log('\n🔑 Login Credentials:');
    console.log('   Email: test@labaerp.com');
    console.log('   Password: Test@123');
    console.log('\n📊 Data Summary:');
    console.log(`   - 1 Farm: ${farm.name}`);
    console.log('   - 1 User (OWNER)');
    console.log(`   - ${productsData.length} Products`);
    console.log(`   - ${Object.keys(partners).length} Partners`);
    console.log(`   - ${workersData.length} Workers`);
    console.log(`   - ${transactionsData.length} Transactions`);
    console.log('   - 29 Tax Rules');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
