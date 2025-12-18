// scripts/seed-full-test-data.ts
// COMPREHENSIVE Test Data Seed - All data for full testing
// 
// Usage:
//   npx tsx scripts/seed-full-test-data.ts          → Add to existing data
//   npx tsx scripts/seed-full-test-data.ts --clean  → Fresh start (delete first)

import { PrismaClient, PartnerType, ProductCategory, UserRole, TransactionType, PaymentMethod, PaymentStatus, WorkerType, WorkerStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const isClean = process.argv.includes('--clean');

async function main() {
    console.log('═'.repeat(60));
    console.log('🌱 COMPREHENSIVE TEST DATA SEED');
    console.log(isClean ? '⚠️  MODE: CLEAN (deleting existing data first)' : '📝 MODE: ADD (keeping existing data)');
    console.log('═'.repeat(60));
    console.log('Started at:', new Date().toISOString());

    // Get existing farm
    const farm = await prisma.farm.findFirst();
    if (!farm) {
        console.error('❌ No farm found. Run main seed first.');
        return;
    }
    console.log(`\nUsing farm: ${farm.name} (${farm.id})\n`);
    const farmId = farm.id;

    // ============= CLEAN MODE: Delete existing data =============
    if (isClean) {
        console.log('🗑️  CLEANING existing data...');
        console.log('─'.repeat(40));

        // Delete in order (FK constraints - child tables first)
        // Payroll & Worker related
        await prisma.payrollItem.deleteMany({ where: { farm_id: farmId } });
        await prisma.pITCalculation.deleteMany({ where: { farm_id: farmId } });
        await prisma.attendance.deleteMany({ where: { farm_id: farmId } });

        // Tax declarations
        await prisma.vATDeclaration.deleteMany({ where: { farm_id: farmId } });
        await prisma.cITCalculation.deleteMany({ where: { farm_id: farmId } });
        await prisma.taxSchedule.deleteMany({ where: { farm_id: farmId } });

        // AR/AP
        await prisma.aRInvoicePaymentAllocation.deleteMany({ where: { farm_id: farmId } });
        await prisma.aPInvoicePaymentAllocation.deleteMany({ where: { farm_id: farmId } });
        await prisma.aRPayment.deleteMany({ where: { farm_id: farmId } });
        await prisma.aPPayment.deleteMany({ where: { farm_id: farmId } });
        await prisma.aRInvoiceLine.deleteMany({ where: { farm_id: farmId } });
        await prisma.aPInvoiceLine.deleteMany({ where: { farm_id: farmId } });
        await prisma.aRInvoice.deleteMany({ where: { farm_id: farmId } });
        await prisma.aPInvoice.deleteMany({ where: { farm_id: farmId } });

        // Stock & Transactions
        await prisma.stockMovement.deleteMany({ where: { farm_id: farmId } });
        await prisma.stock.deleteMany({ where: { farm_id: farmId } });
        await prisma.transaction.deleteMany({ where: { farm_id: farmId } });

        // Master data
        await prisma.product.deleteMany({ where: { farm_id: farmId } });
        await prisma.partner.deleteMany({ where: { farm_id: farmId } });
        await prisma.worker.deleteMany({ where: { farm_id: farmId } });

        console.log('  ✅ All test data deleted!\n');
    }

    // ============= 1. USERS =============
    console.log('📌 1. USERS');
    console.log('─'.repeat(40));

    const users = [
        { email: 'admin@laba.vn', password: 'admin123', full_name: 'Admin Test', role: UserRole.OWNER },
        { email: 'accountant@laba.vn', password: 'Test@123', full_name: 'Kế toán Test', role: UserRole.ACCOUNTANT },
        { email: 'staff@laba.vn', password: 'Test@123', full_name: 'Nhân viên Test', role: UserRole.STAFF },
    ];

    for (const user of users) {
        await prisma.user.upsert({
            where: { email: user.email },
            update: { password_hash: await bcrypt.hash(user.password, 10), is_active: true, email_verified: true },
            create: {
                farm_id: farmId,
                email: user.email,
                password_hash: await bcrypt.hash(user.password, 10),
                full_name: user.full_name,
                role: user.role,
                is_active: true,
                email_verified: true,
            },
        });
        console.log(`  ✅ ${user.role}: ${user.email}`);
    }

    // ============= 2. PARTNERS (CUSTOMERS) =============
    console.log('\n📌 2. CUSTOMERS');
    console.log('─'.repeat(40));

    const customers = [
        { code: 'KH-001', name: 'Công ty TNHH ABC', phone: '0901234567', address: '123 Nguyễn Huệ, Q1, HCM' },
        { code: 'KH-002', name: 'Cửa hàng XYZ', phone: '0912345678', address: '456 Lê Lợi, Q1, HCM' },
        { code: 'KH-003', name: 'Anh Minh - Bán lẻ', phone: '0923456789', address: 'Chợ Bến Thành, HCM' },
        { code: 'KH-004', name: 'Chị Lan - Đại lý', phone: '0934567890', address: '789 Cách Mạng Tháng 8, Q10, HCM' },
        { code: 'KH-005', name: 'Siêu thị BigC', phone: '0945678901', address: '100 Điện Biên Phủ, Q3, HCM' },
    ];

    const customerIds: string[] = [];
    for (const c of customers) {
        const partner = await prisma.partner.upsert({
            where: { farm_id_code: { farm_id: farmId, code: c.code } },
            update: { name: c.name },
            create: { farm_id: farmId, code: c.code, name: c.name, partner_type: PartnerType.CUSTOMER, phone: c.phone, address: c.address },
        });
        customerIds.push(partner.id);
        console.log(`  ✅ ${c.code}: ${c.name}`);
    }

    // ============= 3. PARTNERS (VENDORS) =============
    console.log('\n📌 3. VENDORS');
    console.log('─'.repeat(40));

    const vendors = [
        { code: 'NCC-001', name: 'Công ty Phân bón Việt', phone: '0281234567', address: 'KCN Tân Bình, HCM', tax_code: '0301234567' },
        { code: 'NCC-002', name: 'Đại lý Thuốc BVTV', phone: '0282345678', address: 'Hóc Môn, HCM', tax_code: '0302345678' },
        { code: 'NCC-003', name: 'Công ty Giống cây trồng', phone: '0283456789', address: 'Củ Chi, HCM', tax_code: '0303456789' },
        { code: 'NCC-004', name: 'Xưởng cơ khí Minh Phát', phone: '0284567890', address: 'Thủ Đức, HCM', tax_code: '0304567890' },
        { code: 'NCC-005', name: 'Công ty Bao bì ABC', phone: '0285678901', address: 'Bình Dương', tax_code: '0305678901' },
    ];

    const vendorIds: string[] = [];
    for (const v of vendors) {
        const partner = await prisma.partner.upsert({
            where: { farm_id_code: { farm_id: farmId, code: v.code } },
            update: { name: v.name, tax_code: v.tax_code },
            create: { farm_id: farmId, code: v.code, name: v.name, partner_type: PartnerType.VENDOR, phone: v.phone, address: v.address, tax_code: v.tax_code },
        });
        vendorIds.push(partner.id);
        console.log(`  ✅ ${v.code}: ${v.name} (MST: ${v.tax_code})`);
    }

    // ============= 4. PRODUCTS =============
    console.log('\n📌 4. PRODUCTS');
    console.log('─'.repeat(40));

    const products = [
        { code: 'SP-001', name: 'Gạo ST25', category: ProductCategory.NONG_SAN, unit: 'kg', selling_price: 45000, purchase_price: 30000 },
        { code: 'SP-002', name: 'Cà phê Robusta', category: ProductCategory.NONG_SAN, unit: 'kg', selling_price: 80000, purchase_price: 50000 },
        { code: 'SP-003', name: 'Tiêu đen', category: ProductCategory.NONG_SAN, unit: 'kg', selling_price: 120000, purchase_price: 80000 },
        { code: 'SP-004', name: 'Phân NPK 20-20-15', category: ProductCategory.VAT_TU, unit: 'bao', selling_price: 350000, purchase_price: 280000 },
        { code: 'SP-005', name: 'Thuốc trừ sâu sinh học', category: ProductCategory.VAT_TU, unit: 'chai', selling_price: 150000, purchase_price: 100000 },
        { code: 'SP-006', name: 'Giống lúa OM18', category: ProductCategory.NGUYEN_LIEU, unit: 'kg', selling_price: 25000, purchase_price: 18000 },
        { code: 'SP-007', name: 'Hạt giống cà phê', category: ProductCategory.NGUYEN_LIEU, unit: 'kg', selling_price: 200000, purchase_price: 150000 },
        { code: 'SP-008', name: 'Dịch vụ vận chuyển', category: ProductCategory.OTHER, unit: 'chuyến', selling_price: 500000, purchase_price: 0 },
    ];

    const productIds: string[] = [];
    for (const p of products) {
        const product = await prisma.product.upsert({
            where: { farm_id_code: { farm_id: farmId, code: p.code } },
            update: { name: p.name, selling_price: p.selling_price, purchase_price: p.purchase_price },
            create: {
                farm_id: farmId,
                code: p.code,
                name: p.name,
                category: p.category,
                unit: p.unit,
                selling_price: p.selling_price,
                purchase_price: p.purchase_price,
                is_active: true,
                stock_qty: 0,
            },
        });
        productIds.push(product.id);
        console.log(`  ✅ ${p.code}: ${p.name} (${p.unit})`);
    }

    // ============= 5. WORKERS =============
    console.log('\n📌 5. WORKERS');
    console.log('─'.repeat(40));

    const workers = [
        { code: 'NV-001', name: 'Nguyễn Văn An', position: 'Quản lý', base_salary: 25000000, worker_type: WorkerType.FULL_TIME, dependents: 2 },
        { code: 'NV-002', name: 'Trần Thị Bình', position: 'Kế toán', base_salary: 18000000, worker_type: WorkerType.FULL_TIME, dependents: 1 },
        { code: 'NV-003', name: 'Lê Văn Cường', position: 'Công nhân', base_salary: 12000000, worker_type: WorkerType.FULL_TIME, dependents: 0 },
        { code: 'NV-004', name: 'Phạm Thị Dung', position: 'Thời vụ', base_salary: 8000000, worker_type: WorkerType.SEASONAL, dependents: 0 },
        { code: 'NV-005', name: 'Hoàng Văn Em', position: 'Lái xe', base_salary: 15000000, worker_type: WorkerType.FULL_TIME, dependents: 1 },
    ];

    const workerIds: string[] = [];
    for (const w of workers) {
        const worker = await prisma.worker.upsert({
            where: { farm_id_code: { farm_id: farmId, code: w.code } },
            update: { name: w.name, base_salary: w.base_salary },
            create: {
                farm_id: farmId,
                code: w.code,
                name: w.name,
                position: w.position,
                base_salary: w.base_salary,
                worker_type: w.worker_type,
                status: WorkerStatus.ACTIVE,
                start_date: new Date('2024-01-01'),
                dependents: w.dependents,
            },
        });
        workerIds.push(worker.id);
        console.log(`  ✅ ${w.code}: ${w.name} - ${w.position} (${(w.base_salary / 1000000).toFixed(0)}M)`);
    }

    // ============= 6. TRANSACTIONS (SALE) =============
    console.log('\n📌 6. SALE TRANSACTIONS');
    console.log('─'.repeat(40));

    const sales = [
        { code: 'BH-001', customer: 0, amount: 15000000, desc: 'Bán gạo ST25', date: '2025-12-01' },
        { code: 'BH-002', customer: 1, amount: 8000000, desc: 'Bán cà phê', date: '2025-12-05' },
        { code: 'BH-003', customer: 2, amount: 5500000, desc: 'Bán tiêu đen', date: '2025-12-10' },
        { code: 'BH-004', customer: 3, amount: 22000000, desc: 'Đơn hàng lớn - Gạo', date: '2025-12-15' },
        { code: 'BH-005', customer: 4, amount: 35000000, desc: 'Bán sỉ siêu thị', date: '2025-12-18' },
    ];

    for (const s of sales) {
        const existing = await prisma.transaction.findFirst({ where: { farm_id: farmId, trans_number: s.code } });
        if (!existing) {
            await prisma.transaction.create({
                data: {
                    farm_id: farmId,
                    trans_number: s.code,
                    code: s.code,
                    trans_type: TransactionType.SALE,
                    partner_id: customerIds[s.customer],
                    trans_date: new Date(s.date),
                    amount: s.amount,
                    total_amount: s.amount * 1.1,
                    vat_amount: s.amount * 0.1,
                    tax_amount: s.amount * 0.1,
                    paid_amount: s.amount * 1.1,
                    payment_status: PaymentStatus.PAID,
                    payment_method: PaymentMethod.BANK_TRANSFER,
                    description: s.desc,
                },
            });
            console.log(`  ✅ ${s.code}: ${s.desc} - ${(s.amount / 1000000).toFixed(1)}M`);
        }
    }

    // ============= 7. TRANSACTIONS (PURCHASE) =============
    console.log('\n📌 7. PURCHASE TRANSACTIONS');
    console.log('─'.repeat(40));

    const purchases = [
        { code: 'MH-001', vendor: 0, amount: 8000000, desc: 'Mua phân bón', date: '2025-12-02' },
        { code: 'MH-002', vendor: 1, amount: 3500000, desc: 'Mua thuốc BVTV', date: '2025-12-06' },
        { code: 'MH-003', vendor: 2, amount: 5000000, desc: 'Mua giống cây', date: '2025-12-08' },
        { code: 'MH-004', vendor: 3, amount: 12000000, desc: 'Sửa chữa máy móc', date: '2025-12-12' },
        { code: 'MH-005', vendor: 4, amount: 2500000, desc: 'Mua bao bì', date: '2025-12-16' },
    ];

    for (const p of purchases) {
        const existing = await prisma.transaction.findFirst({ where: { farm_id: farmId, trans_number: p.code } });
        if (!existing) {
            await prisma.transaction.create({
                data: {
                    farm_id: farmId,
                    trans_number: p.code,
                    code: p.code,
                    trans_type: TransactionType.PURCHASE,
                    partner_id: vendorIds[p.vendor],
                    trans_date: new Date(p.date),
                    amount: p.amount,
                    total_amount: p.amount * 1.1,
                    vat_amount: p.amount * 0.1,
                    tax_amount: p.amount * 0.1,
                    paid_amount: p.amount * 1.1,
                    payment_status: PaymentStatus.PAID,
                    payment_method: PaymentMethod.BANK_TRANSFER,
                    description: p.desc,
                },
            });
            console.log(`  ✅ ${p.code}: ${p.desc} - ${(p.amount / 1000000).toFixed(1)}M`);
        }
    }

    // ============= 8. INCOME TRANSACTIONS =============
    console.log('\n📌 8. INCOME TRANSACTIONS');
    console.log('─'.repeat(40));

    const incomes = [
        { code: 'TT-001', customer: 0, amount: 10000000, desc: 'Thu tiền KH ABC', date: '2025-12-03' },
        { code: 'TT-002', customer: 1, amount: 5000000, desc: 'Thu tiền XYZ', date: '2025-12-07' },
        { code: 'TT-003', customer: 2, amount: 3000000, desc: 'Thu tiền bán lẻ', date: '2025-12-11' },
    ];

    for (const i of incomes) {
        const existing = await prisma.transaction.findFirst({ where: { farm_id: farmId, trans_number: i.code } });
        if (!existing) {
            await prisma.transaction.create({
                data: {
                    farm_id: farmId,
                    trans_number: i.code,
                    code: i.code,
                    trans_type: TransactionType.INCOME,
                    partner_id: customerIds[i.customer],
                    trans_date: new Date(i.date),
                    amount: i.amount,
                    total_amount: i.amount,
                    paid_amount: i.amount,
                    payment_status: PaymentStatus.PAID,
                    payment_method: PaymentMethod.CASH,
                    description: i.desc,
                },
            });
            console.log(`  ✅ ${i.code}: ${i.desc} - ${(i.amount / 1000000).toFixed(1)}M`);
        }
    }

    // ============= 9. EXPENSE TRANSACTIONS =============
    console.log('\n📌 9. EXPENSE TRANSACTIONS');
    console.log('─'.repeat(40));

    const expenses = [
        { code: 'CT-001', vendor: 0, amount: 5000000, desc: 'Thanh toán NCC phân bón', date: '2025-12-04' },
        { code: 'CT-002', vendor: 1, amount: 2000000, desc: 'Thanh toán thuốc BVTV', date: '2025-12-09' },
        { code: 'CT-003', amount: 3000000, desc: 'Chi phí điện nước', date: '2025-12-13' },
        { code: 'CT-004', amount: 1500000, desc: 'Chi phí xăng dầu', date: '2025-12-17' },
    ];

    for (const e of expenses) {
        const existing = await prisma.transaction.findFirst({ where: { farm_id: farmId, trans_number: e.code } });
        if (!existing) {
            await prisma.transaction.create({
                data: {
                    farm_id: farmId,
                    trans_number: e.code,
                    code: e.code,
                    trans_type: TransactionType.EXPENSE,
                    partner_id: 'vendor' in e ? vendorIds[e.vendor as number] : null,
                    trans_date: new Date(e.date),
                    amount: e.amount,
                    total_amount: 'vendor' in e ? e.amount * 1.1 : e.amount,
                    vat_amount: 'vendor' in e ? e.amount * 0.1 : 0,
                    tax_amount: 'vendor' in e ? e.amount * 0.1 : 0,
                    paid_amount: 'vendor' in e ? e.amount * 1.1 : e.amount,
                    payment_status: PaymentStatus.PAID,
                    payment_method: PaymentMethod.CASH,
                    description: e.desc,
                },
            });
            console.log(`  ✅ ${e.code}: ${e.desc} - ${(e.amount / 1000000).toFixed(1)}M`);
        }
    }

    // ============= 10. STOCK & STOCK MOVEMENTS =============
    console.log('\n📌 10. STOCK & MOVEMENTS');
    console.log('─'.repeat(40));

    // Initialize stock for ALL products
    const stockQuantities = [1000, 500, 800, 200, 150, 300, 100, 50]; // Varied stock for each product

    for (let i = 0; i < productIds.length; i++) {
        const stockExists = await prisma.stock.findFirst({
            where: { farm_id: farmId, product_id: productIds[i] }
        });

        if (!stockExists) {
            const qty = stockQuantities[i] || 100;
            await prisma.stock.create({
                data: {
                    farm_id: farmId,
                    product_id: productIds[i],
                    quantity: qty,
                    avg_cost: products[i].purchase_price,
                    total_value: qty * products[i].purchase_price,
                },
            });

            await prisma.product.update({
                where: { id: productIds[i] },
                data: {
                    stock_qty: qty,
                    avg_cost: products[i].purchase_price,
                },
            });

            console.log(`  ✅ ${products[i].code}: ${qty} ${products[i].unit}`);
        }
    }

    // Stock Movements
    const stockMovements = [
        { code: 'NK-001', product: 0, type: 'IN', qty: 500, price: 30000, date: '2025-12-01', note: 'Nhập kho đầu kỳ' },
        { code: 'NK-002', product: 1, type: 'IN', qty: 300, price: 50000, date: '2025-12-01', note: 'Nhập kho cà phê' },
        { code: 'XK-001', product: 0, type: 'OUT', qty: 200, price: 30000, date: '2025-12-05', note: 'Xuất bán BigC' },
        { code: 'XK-002', product: 1, type: 'OUT', qty: 100, price: 50000, date: '2025-12-10', note: 'Xuất bán đại lý' },
        { code: 'NK-003', product: 2, type: 'IN', qty: 150, price: 80000, date: '2025-12-12', note: 'Nhập tiêu đen' },
    ];

    for (const mv of stockMovements) {
        const existing = await prisma.stockMovement.findFirst({
            where: { farm_id: farmId, code: mv.code }
        });
        if (!existing) {
            await prisma.stockMovement.create({
                data: {
                    farm_id: farmId,
                    code: mv.code,
                    product_id: productIds[mv.product],
                    type: mv.type as any,
                    quantity: mv.qty,
                    unit_price: mv.price,
                    cogs_amount: mv.qty * mv.price,
                    date: new Date(mv.date),
                    notes: mv.note,
                },
            });
            console.log(`  ✅ ${mv.code}: ${mv.type} ${mv.qty} units`);
        }
    }

    // ============= 10b. CASH_IN / CASH_OUT =============
    console.log('\n📌 10b. CASH_IN/CASH_OUT (Thu Chi)');
    console.log('─'.repeat(40));

    const cashTransactions = [
        { code: 'THUC-001', type: 'CASH_IN', amount: 5000000, method: 'BANK_TRANSFER', desc: 'Thu tiền công nợ KH', date: '2025-12-03' },
        { code: 'THUC-002', type: 'CASH_IN', amount: 2000000, method: 'CASH', desc: 'Thu tiền bán lẻ', date: '2025-12-07' },
        { code: 'THUC-003', type: 'CASH_IN', amount: 3000000, method: 'MOMO', desc: 'Thu tiền qua MoMo', date: '2025-12-11' },
        { code: 'CHIC-001', type: 'CASH_OUT', amount: 3000000, method: 'CASH', desc: 'Chi tiền lương tạm', date: '2025-12-04' },
        { code: 'CHIC-002', type: 'CASH_OUT', amount: 2000000, method: 'BANK_TRANSFER', desc: 'Trả nợ NCC', date: '2025-12-08' },
        { code: 'CHIC-003', type: 'CASH_OUT', amount: 1500000, method: 'CASH', desc: 'Chi tiền điện nước', date: '2025-12-13' },
    ];

    for (const c of cashTransactions) {
        const existing = await prisma.transaction.findFirst({ where: { farm_id: farmId, trans_number: c.code } });
        if (!existing) {
            await prisma.transaction.create({
                data: {
                    farm_id: farmId,
                    trans_number: c.code,
                    code: c.code,
                    trans_type: c.type as any,
                    trans_date: new Date(c.date),
                    amount: c.amount,
                    total_amount: c.amount,
                    paid_amount: c.amount, // CASH transactions are always paid in full
                    payment_status: PaymentStatus.PAID,
                    payment_method: c.method as any,
                    description: c.desc,
                },
            });
            console.log(`  ✅ ${c.code}: ${c.type} - ${(c.amount / 1000000).toFixed(1)}M`);
        }
    }

    // ============= 10c. VAT TEST CASES & CÔNG NỢ =============
    console.log('\n📌 10c. VAT TEST CASES & CÔNG NỢ');
    console.log('─'.repeat(40));

    const vatTestCases = [
        // VAT test: Cash >= 20M (should fail VAT deduction)
        { code: 'VAT-001', type: 'EXPENSE', vendor: 0, amount: 25000000, vat: 2500000, method: 'CASH', status: 'PAID', desc: '⚠️ CASH >= 20M - VAT không được khấu trừ', date: '2025-12-08' },
        // VAT test: No invoice (should fail)
        { code: 'VAT-002', type: 'EXPENSE', vendor: 1, amount: 5000000, vat: 500000, method: 'CASH', status: 'PAID', desc: '⚠️ Không có hóa đơn - VAT fail', date: '2025-12-14' },
        // Công nợ: PENDING (chưa thanh toán)
        { code: 'CN-001', type: 'INCOME', customer: 2, amount: 8000000, vat: 800000, method: 'CREDIT', status: 'PENDING', desc: 'Công nợ - Chưa thanh toán', date: '2025-12-10' },
        // Công nợ: PARTIAL (thanh toán 1 phần)
        { code: 'CN-002', type: 'INCOME', customer: 3, amount: 12000000, vat: 1200000, method: 'CREDIT', status: 'PARTIAL', paid: 5000000, desc: 'Công nợ - Thanh toán 1 phần', date: '2025-12-12' },
        // Công nợ: AP PENDING
        { code: 'CN-003', type: 'EXPENSE', vendor: 2, amount: 6000000, vat: 600000, method: 'CREDIT', status: 'PENDING', desc: 'Phải trả NCC - Chưa TT', date: '2025-12-15' },
    ];

    for (const v of vatTestCases) {
        const existing = await prisma.transaction.findFirst({ where: { farm_id: farmId, trans_number: v.code } });
        if (!existing) {
            const total = v.amount + v.vat;
            const paidAmount = v.status === 'PAID' ? total : (v.paid || 0);
            await prisma.transaction.create({
                data: {
                    farm_id: farmId,
                    trans_number: v.code,
                    code: v.code,
                    trans_type: v.type as any,
                    partner_id: 'customer' in v ? customerIds[v.customer as number] : ('vendor' in v ? vendorIds[v.vendor as number] : null),
                    trans_date: new Date(v.date),
                    amount: v.amount,
                    vat_amount: v.vat,
                    total_amount: total,
                    payment_status: v.status as any,
                    payment_method: v.method as any,
                    paid_amount: paidAmount,
                    description: v.desc,
                },
            });
            console.log(`  ✅ ${v.code}: ${v.desc.substring(0, 30)}...`);
        }
    }

    // ============= 11. AR INVOICES =============
    console.log('\n📌 11. AR INVOICES');
    console.log('─'.repeat(40));

    const arInvoices = [
        { number: 'INV-2025-001', customer: 0, amount: 15000000, status: 'POSTED', date: '2025-12-01' },
        { number: 'INV-2025-002', customer: 1, amount: 8000000, status: 'POSTED', date: '2025-12-05' },
        { number: 'INV-2025-003', customer: 2, amount: 5500000, status: 'DRAFT', date: '2025-12-10' },
        { number: 'INV-2025-004', customer: 3, amount: 12000000, status: 'POSTED', date: '2025-12-15' },
        { number: 'INV-2025-005', customer: 4, amount: 20000000, status: 'PAID', date: '2025-12-18' },
    ];

    const arInvoiceIds: string[] = [];
    for (const inv of arInvoices) {
        const existing = await prisma.aRInvoice.findFirst({
            where: { farm_id: farmId, invoice_number: inv.number }
        });
        if (!existing) {
            const created = await prisma.aRInvoice.create({
                data: {
                    farm_id: farmId,
                    invoice_number: inv.number,
                    customer_id: customerIds[inv.customer],
                    invoice_date: new Date(inv.date),
                    due_date: new Date(new Date(inv.date).getTime() + 30 * 24 * 60 * 60 * 1000),
                    sub_total: inv.amount,
                    tax_amount: inv.amount * 0.1,
                    total_amount: inv.amount * 1.1,
                    paid_amount: inv.status === 'PAID' ? inv.amount * 1.1 : 0,
                    status: inv.status as any,
                },
            });
            arInvoiceIds.push(created.id);
            console.log(`  ✅ ${inv.number}: ${(inv.amount / 1000000).toFixed(1)}M - ${inv.status}`);
        }
    }

    // ============= 12. AP INVOICES =============
    console.log('\n📌 12. AP INVOICES');
    console.log('─'.repeat(40));

    const apInvoices = [
        { number: 'BILL-2025-001', vendor: 0, amount: 8000000, status: 'POSTED', date: '2025-12-02' },
        { number: 'BILL-2025-002', vendor: 1, amount: 3500000, status: 'POSTED', date: '2025-12-06' },
        { number: 'BILL-2025-003', vendor: 2, amount: 5000000, status: 'DRAFT', date: '2025-12-08' },
        { number: 'BILL-2025-004', vendor: 3, amount: 12000000, status: 'PAID', date: '2025-12-12' },
    ];

    const apInvoiceIds: string[] = [];
    for (const inv of apInvoices) {
        const existing = await prisma.aPInvoice.findFirst({
            where: { farm_id: farmId, invoice_number: inv.number }
        });
        if (!existing) {
            const created = await prisma.aPInvoice.create({
                data: {
                    farm_id: farmId,
                    invoice_number: inv.number,
                    vendor_id: vendorIds[inv.vendor],
                    invoice_date: new Date(inv.date),
                    due_date: new Date(new Date(inv.date).getTime() + 30 * 24 * 60 * 60 * 1000),
                    sub_total: inv.amount,
                    tax_amount: inv.amount * 0.1,
                    total_amount: inv.amount * 1.1,
                    paid_amount: inv.status === 'PAID' ? inv.amount * 1.1 : 0,
                    status: inv.status as any,
                },
            });
            apInvoiceIds.push(created.id);
            console.log(`  ✅ ${inv.number}: ${(inv.amount / 1000000).toFixed(1)}M - ${inv.status}`);
        }
    }

    // ============= 13. AR PAYMENTS =============
    console.log('\n📌 13. AR PAYMENTS');
    console.log('─'.repeat(40));

    const arPayments = [
        { number: 'REC-2025-001', customer: 0, amount: 16500000, date: '2025-12-18' },
        { number: 'REC-2025-002', customer: 1, amount: 5000000, date: '2025-12-19' },
    ];

    for (const pmt of arPayments) {
        const existing = await prisma.aRPayment.findFirst({
            where: { farm_id: farmId, payment_number: pmt.number }
        });
        if (!existing) {
            await prisma.aRPayment.create({
                data: {
                    farm_id: farmId,
                    payment_number: pmt.number,
                    customer_id: customerIds[pmt.customer],
                    payment_date: new Date(pmt.date),
                    amount: pmt.amount,
                    payment_method: PaymentMethod.BANK_TRANSFER,
                },
            });
            console.log(`  ✅ ${pmt.number}: ${(pmt.amount / 1000000).toFixed(1)}M`);
        }
    }

    // ============= 14. AP PAYMENTS =============
    console.log('\n📌 14. AP PAYMENTS');
    console.log('─'.repeat(40));

    const apPayments = [
        { number: 'PAY-2025-001', vendor: 0, amount: 13200000, date: '2025-12-12' },
        { number: 'PAY-2025-002', vendor: 1, amount: 3000000, date: '2025-12-15' },
    ];

    for (const pmt of apPayments) {
        const existing = await prisma.aPPayment.findFirst({
            where: { farm_id: farmId, payment_number: pmt.number }
        });
        if (!existing) {
            await prisma.aPPayment.create({
                data: {
                    farm_id: farmId,
                    payment_number: pmt.number,
                    vendor_id: vendorIds[pmt.vendor],
                    payment_date: new Date(pmt.date),
                    amount: pmt.amount,
                    payment_method: PaymentMethod.BANK_TRANSFER,
                },
            });
            console.log(`  ✅ ${pmt.number}: ${(pmt.amount / 1000000).toFixed(1)}M`);
        }
    }

    // ============= 15. SYNC PARTNER BALANCES =============
    console.log('\n📌 15. SYNC PARTNER BALANCES');
    console.log('─'.repeat(40));

    // Calculate and update partner balances from transactions
    const allPartners = await prisma.partner.findMany({
        where: { farm_id: farmId },
        include: {
            transactions: {
                where: { deleted_at: null },
                select: { total_amount: true, paid_amount: true, trans_type: true },
            },
        },
    });

    for (const partner of allPartners) {
        let balance = 0;
        for (const trans of partner.transactions) {
            const outstanding = Number(trans.total_amount) - Number(trans.paid_amount);
            if (['SALE', 'INCOME'].includes(trans.trans_type)) {
                balance += outstanding; // Customer owes us
            } else {
                balance -= outstanding; // We owe vendor
            }
        }

        await prisma.partner.update({
            where: { id: partner.id },
            data: { balance: balance },
        });
    }
    console.log(`  ✅ Synced ${allPartners.length} partner balances`);

    // ============= SUMMARY =============
    console.log('\n' + '═'.repeat(60));
    console.log('🎉 COMPREHENSIVE TEST DATA SEEDED!');
    console.log('═'.repeat(60));
    console.log(`
📊 FULL SUMMARY:
  ┌─────────────────────────────────────┐
  │ MASTER DATA                         │
  ├─────────────────────────────────────┤
  │ • Users: 3                          │
  │ • Customers: 5                      │
  │ • Vendors: 5                        │
  │ • Products: 8                       │
  │ • Workers: 5                        │
  ├─────────────────────────────────────┤
  │ TRANSACTIONS                        │
  ├─────────────────────────────────────┤
  │ • SALE: 5                           │
  │ • PURCHASE: 5                       │
  │ • INCOME: 3                         │
  │ • EXPENSE: 4                        │
  ├─────────────────────────────────────┤
  │ AR/AP                               │
  ├─────────────────────────────────────┤
  │ • AR Invoices: 5                    │
  │ • AP Invoices: 4                    │
  │ • AR Payments: 2                    │
  │ • AP Payments: 2                    │
  ├─────────────────────────────────────┤
  │ STOCK                               │
  ├─────────────────────────────────────┤
  │ • Stock records: 3                  │
  └─────────────────────────────────────┘

🔐 LOGIN:
  • admin@laba.vn / admin123
  • accountant@laba.vn / Test@123
  • staff@laba.vn / Test@123
`);
    console.log('═'.repeat(60));
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
