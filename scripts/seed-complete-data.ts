// scripts/seed-complete-data.ts
// Complete seed data for testing ALL features

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 SEEDING COMPLETE TEST DATA...\n');

    // Get the farm
    const farm = await prisma.farm.findFirst();
    if (!farm) {
        console.log('❌ No farm found!');
        return;
    }
    console.log(`📍 Farm: ${farm.name}\n`);

    // ==========================================
    // 1. PRODUCTS (8 items)
    // ==========================================
    console.log('📦 Creating products...');

    const products = [
        { code: 'LUA-001', name: 'Lúa ST25', category: 'NONG_SAN', unit: 'kg', sellPrice: 25000, buyPrice: 20000 },
        { code: 'GAO-001', name: 'Gạo ST25', category: 'NONG_SAN', unit: 'kg', sellPrice: 45000, buyPrice: 38000 },
        { code: 'RAU-001', name: 'Rau muống', category: 'NONG_SAN', unit: 'bó', sellPrice: 8000, buyPrice: 5000 },
        { code: 'RAU-002', name: 'Cà chua', category: 'NONG_SAN', unit: 'kg', sellPrice: 25000, buyPrice: 18000 },
        { code: 'CAY-001', name: 'Cây giống lúa', category: 'VAT_TU', unit: 'cây', sellPrice: 500, buyPrice: 300 },
        { code: 'PHAN-001', name: 'Phân bón NPK', category: 'VAT_TU', unit: 'bao', sellPrice: 380000, buyPrice: 350000 },
        { code: 'THUOC-001', name: 'Thuốc trừ sâu', category: 'VAT_TU', unit: 'chai', sellPrice: 95000, buyPrice: 85000 },
        { code: 'XNG-001', name: 'Xăng A95', category: 'VAT_TU', unit: 'lít', sellPrice: 25000, buyPrice: 23000 },
    ];

    for (const p of products) {
        await prisma.product.upsert({
            where: { farm_id_code: { farm_id: farm.id, code: p.code } },
            update: {},
            create: {
                farm_id: farm.id,
                code: p.code,
                name: p.name,
                category: p.category as any,
                unit: p.unit,
                selling_price: p.sellPrice,
                purchase_price: p.buyPrice,
                stock_qty: Math.floor(Math.random() * 100) + 50,
                min_stock: 10,
                is_active: true,
            }
        });
    }
    console.log(`   ✅ ${products.length} products`);

    // ==========================================
    // 2. PARTNERS (8 items)
    // ==========================================
    console.log('🤝 Creating partners...');

    const partners = [
        // Customers
        { code: 'KH001', name: 'Công ty TNHH Thực phẩm Sạch', type: 'CUSTOMER', taxCode: '0123456789', phone: '0901234567', address: '123 Nguyễn Huệ, Q1, HCM' },
        { code: 'KH002', name: 'Chợ đầu mối Long Biên', type: 'CUSTOMER', phone: '0902345678', address: 'Long Biên, Hà Nội' },
        { code: 'KH003', name: 'Cửa hàng Rau Xanh', type: 'CUSTOMER', phone: '0903456789', address: '45 Lê Lợi, Q1, HCM' },
        { code: 'KH004', name: 'Siêu thị Co.op Mart', type: 'CUSTOMER', taxCode: '0309876543', phone: '0904567890', address: '100 Cống Quỳnh, Q1, HCM' },
        // Vendors
        { code: 'NCC001', name: 'Công ty Phân bón Việt Nhật', type: 'VENDOR', taxCode: '0101248141', phone: '0281234567', address: '789 Quốc lộ 1A, Bình Dương' },
        { code: 'NCC002', name: 'Đại lý Thuốc BVTV Miền Nam', type: 'VENDOR', taxCode: '0111222333', phone: '0282345678', address: '456 Điện Biên Phủ, Q3, HCM' },
        { code: 'NCC003', name: 'Trạm xăng Petrolimex', type: 'VENDOR', taxCode: '0100100100', phone: '0283456789', address: '1 Nguyễn Văn Linh, Q7, HCM' },
        { code: 'NCC004', name: 'Công ty TNHH Cây giống ABC', type: 'VENDOR', taxCode: '0309999888', phone: '0284567890', address: '234 Trường Chinh, Tân Bình, HCM' },
    ];

    for (const p of partners) {
        await prisma.partner.upsert({
            where: { farm_id_code: { farm_id: farm.id, code: p.code } },
            update: {},
            create: {
                farm_id: farm.id,
                code: p.code,
                name: p.name,
                partner_type: p.type as any,
                tax_code: p.taxCode,
                phone: p.phone,
                address: p.address,
                is_active: true,
            }
        });
    }
    console.log(`   ✅ ${partners.length} partners`);

    // Get created partners
    const createdPartners = await prisma.partner.findMany({ where: { farm_id: farm.id } });
    const customers = createdPartners.filter(p => p.partner_type === 'CUSTOMER');
    const vendors = createdPartners.filter(p => p.partner_type === 'VENDOR');

    // ==========================================
    // 3. SALES TRANSACTIONS (BÁN HÀNG)
    // ==========================================
    console.log('💰 Creating SALE transactions...');

    const sales = [
        { code: 'BH-001', date: '2024-12-01', partnerId: customers[0]?.id, amount: 2500000, vat: 250000, method: 'BANK_TRANSFER', desc: 'Bán 100kg gạo ST25' },
        { code: 'BH-002', date: '2024-12-05', partnerId: customers[1]?.id, amount: 800000, vat: 80000, method: 'CASH', desc: 'Bán rau tổng hợp', invoice: 'HD-BH002' },
        { code: 'BH-003', date: '2024-12-10', partnerId: customers[2]?.id, amount: 1200000, vat: 120000, method: 'BANK_TRANSFER', desc: 'Bán 50kg cà chua', invoice: 'HD-BH003' },
        { code: 'BH-004', date: '2024-12-12', partnerId: customers[3]?.id, amount: 4500000, vat: 450000, method: 'BANK_TRANSFER', desc: 'Bán hàng Coopmart', invoice: 'HD-BH004' },
    ];

    for (const s of sales) {
        await prisma.transaction.upsert({
            where: { farm_id_trans_number: { farm_id: farm.id, trans_number: s.code } },
            update: {},
            create: {
                farm_id: farm.id,
                trans_number: s.code,
                code: s.code,
                trans_type: 'SALE',
                trans_date: new Date(s.date),
                partner_id: s.partnerId,
                invoice_number: s.invoice,
                amount: s.amount,
                subtotal: s.amount,
                vat_amount: s.vat,
                tax_amount: s.vat,
                total_amount: s.amount + s.vat,
                payment_method: s.method as any,
                payment_status: 'PAID',
                paid_amount: s.amount + s.vat,
                description: s.desc,
            }
        });
    }
    console.log(`   ✅ ${sales.length} SALE transactions`);

    // ==========================================
    // 4. PURCHASE TRANSACTIONS (MUA HÀNG)
    // ==========================================
    console.log('💸 Creating PURCHASE transactions...');

    const purchases = [
        { code: 'MH-001', date: '2024-12-02', partnerId: vendors[0]?.id, amount: 3500000, vat: 350000, method: 'BANK_TRANSFER', desc: 'Mua 10 bao phân NPK', invoice: 'HD-MH001' },
        { code: 'MH-002', date: '2024-12-06', partnerId: vendors[1]?.id, amount: 850000, vat: 85000, method: 'CASH', desc: 'Mua 10 chai thuốc trừ sâu', invoice: 'HD-MH002' },
        // This one will FAIL VAT validation (cash >= 20M)
        { code: 'MH-003', date: '2024-12-08', partnerId: vendors[2]?.id, amount: 25000000, vat: 2500000, method: 'CASH', desc: '⚠️ Mua xăng nguyên tháng - VAT FAIL', invoice: 'HD-MH003' },
        { code: 'MH-004', date: '2024-12-12', partnerId: vendors[0]?.id, amount: 7000000, vat: 700000, method: 'BANK_TRANSFER', desc: 'Mua 20 bao phân NPK', invoice: 'HD-MH004' },
        // This one has no invoice - will FAIL VAT
        { code: 'MH-005', date: '2024-12-14', partnerId: vendors[3]?.id, amount: 1500000, vat: 150000, method: 'CASH', desc: '⚠️ Mua cây giống - KHÔNG HÓA ĐƠN' },
    ];

    for (const p of purchases) {
        await prisma.transaction.upsert({
            where: { farm_id_trans_number: { farm_id: farm.id, trans_number: p.code } },
            update: {},
            create: {
                farm_id: farm.id,
                trans_number: p.code,
                code: p.code,
                trans_type: 'PURCHASE',
                trans_date: new Date(p.date),
                partner_id: p.partnerId,
                invoice_number: p.invoice,
                amount: p.amount,
                subtotal: p.amount,
                vat_amount: p.vat,
                tax_amount: p.vat,
                total_amount: p.amount + p.vat,
                payment_method: p.method as any,
                payment_status: 'PAID',
                paid_amount: p.amount + p.vat,
                description: p.desc,
            }
        });
    }
    console.log(`   ✅ ${purchases.length} PURCHASE transactions`);

    // ==========================================
    // 5. CASH_IN TRANSACTIONS (THU TIỀN)
    // ==========================================
    console.log('📥 Creating CASH_IN transactions...');

    const cashIns = [
        { code: 'TT-001', date: '2024-12-03', amount: 5000000, method: 'BANK_TRANSFER', desc: 'Thu tiền bán hàng KH001' },
        { code: 'TT-002', date: '2024-12-07', amount: 2000000, method: 'CASH', desc: 'Thu tiền mặt bán lẻ' },
        { code: 'TT-003', date: '2024-12-11', amount: 3500000, method: 'BANK_TRANSFER', desc: 'Thu công nợ KH003' },
        { code: 'TT-004', date: '2024-12-13', amount: 1500000, method: 'MOMO', desc: 'Thu tiền qua Momo' },
    ];

    for (const c of cashIns) {
        await prisma.transaction.upsert({
            where: { farm_id_trans_number: { farm_id: farm.id, trans_number: c.code } },
            update: {},
            create: {
                farm_id: farm.id,
                trans_number: c.code,
                code: c.code,
                trans_type: 'CASH_IN',
                trans_date: new Date(c.date),
                amount: c.amount,
                subtotal: c.amount,
                total_amount: c.amount,
                payment_method: c.method as any,
                payment_status: 'PAID',
                paid_amount: c.amount,
                description: c.desc,
            }
        });
    }
    console.log(`   ✅ ${cashIns.length} CASH_IN transactions`);

    // ==========================================
    // 6. CASH_OUT TRANSACTIONS (CHI TIỀN)
    // ==========================================
    console.log('📤 Creating CASH_OUT transactions...');

    const cashOuts = [
        { code: 'CT-001', date: '2024-12-04', amount: 2000000, method: 'CASH', desc: 'Chi tiền lương tạm' },
        { code: 'CT-002', date: '2024-12-08', amount: 1500000, method: 'BANK_TRANSFER', desc: 'Trả công nợ NCC001' },
        { code: 'CT-003', date: '2024-12-10', amount: 800000, method: 'CASH', desc: 'Chi tiền điện nước' },
        { code: 'CT-004', date: '2024-12-14', amount: 3000000, method: 'BANK_TRANSFER', desc: 'Trả tiền phân bón' },
    ];

    for (const c of cashOuts) {
        await prisma.transaction.upsert({
            where: { farm_id_trans_number: { farm_id: farm.id, trans_number: c.code } },
            update: {},
            create: {
                farm_id: farm.id,
                trans_number: c.code,
                code: c.code,
                trans_type: 'CASH_OUT',
                trans_date: new Date(c.date),
                amount: c.amount,
                subtotal: c.amount,
                total_amount: c.amount,
                payment_method: c.method as any,
                payment_status: 'PAID',
                paid_amount: c.amount,
                description: c.desc,
            }
        });
    }
    console.log(`   ✅ ${cashOuts.length} CASH_OUT transactions`);

    // ==========================================
    // 7. WORKERS (NHÂN CÔNG)
    // ==========================================
    console.log('👷 Creating workers...');

    const workers = [
        { code: 'NV001', name: 'Nguyễn Văn An', phone: '0911111111', salary: 8000000, type: 'FULL_TIME' },
        { code: 'NV002', name: 'Trần Thị Bình', phone: '0922222222', salary: 7000000, type: 'FULL_TIME' },
        { code: 'NV003', name: 'Lê Văn Cường', phone: '0933333333', salary: 300000, type: 'SEASONAL' },
        { code: 'NV004', name: 'Phạm Thị Dung', phone: '0944444444', salary: 250000, type: 'PART_TIME' },
    ];

    for (const w of workers) {
        await prisma.worker.upsert({
            where: { farm_id_code: { farm_id: farm.id, code: w.code } },
            update: {},
            create: {
                farm_id: farm.id,
                code: w.code,
                name: w.name,
                phone: w.phone,
                base_salary: w.salary,
                worker_type: w.type as any,
                salary_type: w.type === 'SEASONAL' ? 'DAILY' : 'MONTHLY',
                status: 'ACTIVE',
                join_date: new Date('2024-01-01'),
            }
        });
    }
    console.log(`   ✅ ${workers.length} workers`);

    // ==========================================
    // 8. WORK LOGS (CHẤM CÔNG)
    // ==========================================
    console.log('📋 Creating work logs...');

    const createdWorkers = await prisma.worker.findMany({ where: { farm_id: farm.id } });
    let workLogCount = 0;

    for (const worker of createdWorkers) {
        // Add work logs for December 2024
        for (let day = 1; day <= 15; day++) {
            const workLogCode = `WL-${worker.code}-${day.toString().padStart(2, '0')}`;
            await prisma.workLog.upsert({
                where: { farm_id_code: { farm_id: farm.id, code: workLogCode } },
                update: {},
                create: {
                    farm_id: farm.id,
                    worker_id: worker.id,
                    code: workLogCode,
                    work_date: new Date(`2024-12-${day.toString().padStart(2, '0')}`),
                    work_type: day % 7 === 0 ? 'HALF_DAY' : 'FULL_DAY',
                    hours_worked: day % 7 === 0 ? 4 : 8,
                    daily_rate: Number(worker.base_salary) / 26,
                    amount: (day % 7 === 0 ? 0.5 : 1) * (Number(worker.base_salary) / 26),
                    status: 'CONFIRMED',
                    notes: day % 7 === 0 ? 'Làm nửa ngày' : undefined,
                }
            });
            workLogCount++;
        }
    }
    console.log(`   ✅ ${workLogCount} work logs`);

    // ==========================================
    // SUMMARY
    // ==========================================
    const stats = {
        products: await prisma.product.count({ where: { farm_id: farm.id } }),
        partners: await prisma.partner.count({ where: { farm_id: farm.id } }),
        transactions: await prisma.transaction.count({ where: { farm_id: farm.id } }),
        workers: await prisma.worker.count({ where: { farm_id: farm.id } }),
        workLogs: await prisma.workLog.count({ where: { farm_id: farm.id } }),
    };

    console.log('\n' + '='.repeat(50));
    console.log('✅ SEED COMPLETE!');
    console.log('='.repeat(50));
    console.log(`   📦 Products:     ${stats.products}`);
    console.log(`   🤝 Partners:     ${stats.partners}`);
    console.log(`   💰 Transactions: ${stats.transactions}`);
    console.log(`   👷 Workers:      ${stats.workers}`);
    console.log(`   📋 Work Logs:    ${stats.workLogs}`);
    console.log('='.repeat(50));
    console.log('\n⚠️ VAT Test cases:');
    console.log('   - MH-003: Cash >= 20M → VAT FAIL');
    console.log('   - MH-005: No invoice → VAT FAIL');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
