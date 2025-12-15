// scripts/seed-full.ts
// FULL SEED DATA - Complete test data for ALL features

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 FULL SEED - Creating complete test data...\n');

    const farm = await prisma.farm.findFirst();
    if (!farm) {
        console.log('❌ No farm found!');
        return;
    }
    console.log(`📍 Farm: ${farm.name}\n`);

    // ==========================================
    // CLEAN UP OLD DATA (order matters due to FK)
    // ==========================================
    console.log('🗑️ Cleaning old data...');
    await prisma.stockMovement.deleteMany({ where: { farm_id: farm.id } });
    await prisma.stock.deleteMany({ where: { farm_id: farm.id } }); // Added: cleanup stocks table
    await prisma.transaction.deleteMany({ where: { farm_id: farm.id } });
    await prisma.product.deleteMany({ where: { farm_id: farm.id } });
    await prisma.partner.deleteMany({ where: { farm_id: farm.id } });
    console.log('   ✅ Cleaned\n');

    // ==========================================
    // 1. PRODUCTS (8 items with nice round numbers)
    // ==========================================
    console.log('📦 Creating products...');
    const productData = [
        { code: 'GAO-ST25', name: 'Gạo ST25', category: 'NONG_SAN', unit: 'kg', sell: 50000, buy: 40000, stock: 500 },
        { code: 'GAO-TAM', name: 'Gạo Tám Thơm', category: 'NONG_SAN', unit: 'kg', sell: 35000, buy: 28000, stock: 300 },
        { code: 'RAU-MUONG', name: 'Rau Muống', category: 'NONG_SAN', unit: 'bó', sell: 10000, buy: 6000, stock: 100 },
        { code: 'CA-CHUA', name: 'Cà Chua', category: 'NONG_SAN', unit: 'kg', sell: 30000, buy: 20000, stock: 80 },
        { code: 'PHAN-NPK', name: 'Phân bón NPK', category: 'VAT_TU', unit: 'bao', sell: 400000, buy: 350000, stock: 50 },
        { code: 'THUOC-SAU', name: 'Thuốc trừ sâu', category: 'VAT_TU', unit: 'chai', sell: 100000, buy: 85000, stock: 30 },
        { code: 'XANG-A95', name: 'Xăng A95', category: 'VAT_TU', unit: 'lít', sell: 25000, buy: 23000, stock: 200 },
        { code: 'BAO-BI', name: 'Bao bì đóng gói', category: 'VAT_TU', unit: 'cái', sell: 5000, buy: 3000, stock: 1000 },
    ];

    const products: Record<string, string> = {};
    for (const p of productData) {
        const created = await prisma.product.create({
            data: {
                farm_id: farm.id,
                code: p.code,
                name: p.name,
                category: p.category as any,
                unit: p.unit,
                selling_price: p.sell,
                purchase_price: p.buy,
                avg_cost: p.buy, // Set avg_cost = purchase_price for inventory value calculation
                stock_qty: p.stock,
                min_stock: 10,
                is_active: true,
            }
        });
        products[p.code] = created.id;

        // Also create Stock record for the inventory page
        await prisma.stock.create({
            data: {
                farm_id: farm.id,
                product_id: created.id,
                location_code: 'DEFAULT',
                quantity: p.stock,
                avg_cost: p.buy,
                total_value: p.stock * p.buy,
                min_quantity: 10,
            }
        });
    }
    console.log(`   ✅ ${productData.length} products (with stock records)`);

    // ==========================================
    // 2. PARTNERS (4 customers + 4 vendors)
    // ==========================================
    console.log('🤝 Creating partners...');
    const partnerData = [
        // Customers
        { code: 'KH-001', name: 'Siêu thị BigC', type: 'CUSTOMER', taxCode: '0309876543', phone: '0281234567', address: '123 Lê Lợi, Q1, HCM' },
        { code: 'KH-002', name: 'Cửa hàng Rau Sạch', type: 'CUSTOMER', taxCode: '0301112223', phone: '0282345678', address: '45 Nguyễn Huệ, Q1, HCM' },
        { code: 'KH-003', name: 'Chợ Đầu Mối Thủ Đức', type: 'CUSTOMER', phone: '0283456789', address: 'Chợ Thủ Đức, TP.Thủ Đức' },
        { code: 'KH-004', name: 'Nhà hàng Phố Việt', type: 'CUSTOMER', taxCode: '0305556667', phone: '0284567890', address: '789 Điện Biên Phủ, Q3, HCM' },
        // Vendors
        { code: 'NCC-001', name: 'Cty Phân bón Việt Nhật', type: 'VENDOR', taxCode: '0101248141', phone: '0291234567', address: '100 Quốc lộ 1A, Bình Dương' },
        { code: 'NCC-002', name: 'Đại lý Thuốc BVTV Miền Nam', type: 'VENDOR', taxCode: '0111222333', phone: '0292345678', address: '50 Trường Chinh, Tân Bình' },
        { code: 'NCC-003', name: 'Trạm xăng Petrolimex Q7', type: 'VENDOR', taxCode: '0100100100', phone: '0293456789', address: '1 Nguyễn Văn Linh, Q7' },
        { code: 'NCC-004', name: 'Cty Bao bì Toàn Thắng', type: 'VENDOR', taxCode: '0309998887', phone: '0294567890', address: '200 An Dương Vương, Q5' },
    ];

    const partners: Record<string, string> = {};
    for (const p of partnerData) {
        const created = await prisma.partner.create({
            data: {
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
        partners[p.code] = created.id;
    }
    console.log(`   ✅ ${partnerData.length} partners`);

    // ==========================================
    // 3. TRANSACTIONS - Bán hàng (INCOME with partner)
    // Use current month for date filter compatibility
    // ==========================================
    console.log('💰 Creating INCOME (sales)...');
    const currentYear = new Date().getFullYear();
    const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const datePrefix = `${currentYear}-${currentMonth}`;

    const salesData = [
        { num: 'BH-001', day: '01', partner: 'KH-001', amount: 10000000, vat: 1000000, method: 'BANK_TRANSFER', status: 'PAID', desc: 'Bán 200kg Gạo ST25 cho BigC' },
        { num: 'BH-002', day: '05', partner: 'KH-002', amount: 3500000, vat: 350000, method: 'BANK_TRANSFER', status: 'PAID', desc: 'Bán 100kg Gạo Tám + 50 bó Rau' },
        { num: 'BH-003', day: '10', partner: 'KH-003', amount: 5000000, vat: 500000, method: 'CASH', status: 'PENDING', desc: 'Bán hàng Chợ Thủ Đức - CÔNG NỢ', paid: 0 },
        { num: 'BH-004', day: '12', partner: 'KH-004', amount: 8000000, vat: 800000, method: 'BANK_TRANSFER', status: 'PARTIAL', desc: 'Bán hàng Nhà hàng - TRẢ 1 PHẦN', paid: 5000000 },
    ];

    for (const s of salesData) {
        const total = s.amount + s.vat;
        const paidAmount = s.status === 'PAID' ? total : (s.paid || 0);
        await prisma.transaction.create({
            data: {
                farm_id: farm.id,
                trans_number: s.num,
                trans_type: 'INCOME',
                trans_date: new Date(`${datePrefix}-${s.day}`),
                partner_id: partners[s.partner],
                amount: s.amount,
                subtotal: s.amount,
                vat_amount: s.vat,
                tax_amount: s.vat,
                total_amount: total,
                payment_method: s.method as any,
                payment_status: s.status as any,
                paid_amount: paidAmount,
                description: s.desc,
            }
        });
    }
    console.log(`   ✅ ${salesData.length} INCOME transactions`);

    // ==========================================
    // 4. TRANSACTIONS - Mua hàng (EXPENSE with partner)
    // ==========================================
    console.log('💸 Creating EXPENSE (purchases)...');
    const purchaseData = [
        { num: 'MH-001', day: '02', partner: 'NCC-001', amount: 7000000, vat: 700000, method: 'BANK_TRANSFER', status: 'PAID', desc: 'Mua 20 bao Phân NPK', invoice: 'HD-NCC001-001' },
        { num: 'MH-002', day: '06', partner: 'NCC-002', amount: 1700000, vat: 170000, method: 'CASH', status: 'PAID', desc: 'Mua 20 chai Thuốc trừ sâu', invoice: 'HD-NCC002-001' },
        { num: 'MH-003', day: '08', partner: 'NCC-003', amount: 25000000, vat: 2500000, method: 'CASH', status: 'PENDING', desc: '⚠️ Xăng - CASH>=20M - VAT FAIL', invoice: 'HD-NCC003-001', paid: 0 },
        { num: 'MH-004', day: '11', partner: 'NCC-004', amount: 3000000, vat: 300000, method: 'BANK_TRANSFER', status: 'PARTIAL', desc: 'Mua 1000 Bao bì - TRẢ 1 PHẦN', invoice: 'HD-NCC004-001', paid: 2000000 },
        { num: 'MH-005', day: '13', partner: 'NCC-001', amount: 3500000, vat: 350000, method: 'CASH', status: 'PAID', desc: '⚠️ KHÔNG HÓA ĐƠN - VAT FAIL' },
    ];

    for (const p of purchaseData) {
        const total = p.amount + p.vat;
        const paidAmount = p.status === 'PAID' ? total : (p.paid || 0);
        await prisma.transaction.create({
            data: {
                farm_id: farm.id,
                trans_number: p.num,
                trans_type: 'EXPENSE',
                trans_date: new Date(`${datePrefix}-${p.day}`),
                partner_id: partners[p.partner],
                amount: p.amount,
                subtotal: p.amount,
                vat_amount: p.vat,
                tax_amount: p.vat,
                total_amount: total,
                payment_method: p.method as any,
                payment_status: p.status as any,
                paid_amount: paidAmount,
                description: p.desc,
            }
        });
    }
    console.log(`   ✅ ${purchaseData.length} EXPENSE transactions`);

    // ==========================================
    // 5. CASH_IN / CASH_OUT (Thu Chi)
    // ==========================================
    console.log('📥📤 Creating CASH_IN/CASH_OUT...');
    const cashData = [
        { num: 'TT-001', type: 'CASH_IN', day: '03', amount: 5000000, method: 'BANK_TRANSFER', desc: 'Thu tiền công nợ KH-001' },
        { num: 'TT-002', type: 'CASH_IN', day: '07', amount: 2000000, method: 'CASH', desc: 'Thu tiền bán lẻ' },
        { num: 'TT-003', type: 'CASH_IN', day: '11', amount: 3000000, method: 'MOMO', desc: 'Thu tiền qua Momo' },
        { num: 'CT-001', type: 'CASH_OUT', day: '04', amount: 3000000, method: 'CASH', desc: 'Chi tiền lương tạm' },
        { num: 'CT-002', type: 'CASH_OUT', day: '08', amount: 2000000, method: 'BANK_TRANSFER', desc: 'Trả nợ NCC-001' },
        { num: 'CT-003', type: 'CASH_OUT', day: '13', amount: 1500000, method: 'CASH', desc: 'Chi tiền điện nước' },
    ];

    for (const c of cashData) {
        await prisma.transaction.create({
            data: {
                farm_id: farm.id,
                trans_number: c.num,
                trans_type: c.type as any,
                trans_date: new Date(`${datePrefix}-${c.day}`),
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
    console.log(`   ✅ ${cashData.length} CASH_IN/CASH_OUT`);

    // ==========================================
    // 6. STOCK MOVEMENTS (Kho)
    // ==========================================
    console.log('📦 Creating stock movements...');
    const stockData = [
        // Nhập kho đầu kỳ
        { code: 'NK-001', product: 'GAO-ST25', type: 'IN', qty: 500, price: 40000, day: '01', note: 'Nhập kho đầu kỳ' },
        { code: 'NK-002', product: 'GAO-TAM', type: 'IN', qty: 300, price: 28000, day: '01', note: 'Nhập kho đầu kỳ' },
        { code: 'NK-003', product: 'RAU-MUONG', type: 'IN', qty: 100, price: 6000, day: '01', note: 'Nhập kho đầu kỳ' },
        { code: 'NK-004', product: 'CA-CHUA', type: 'IN', qty: 80, price: 20000, day: '01', note: 'Nhập kho đầu kỳ' },
        { code: 'NK-005', product: 'PHAN-NPK', type: 'IN', qty: 50, price: 350000, day: '01', note: 'Nhập kho đầu kỳ' },
        { code: 'NK-006', product: 'THUOC-SAU', type: 'IN', qty: 30, price: 85000, day: '01', note: 'Nhập kho đầu kỳ' },
        // Xuất kho bán hàng
        { code: 'XK-001', product: 'GAO-ST25', type: 'OUT', qty: 200, price: 40000, day: '05', note: 'Xuất bán BigC' },
        { code: 'XK-002', product: 'GAO-TAM', type: 'OUT', qty: 100, price: 28000, day: '06', note: 'Xuất bán Rau Sạch' },
        { code: 'XK-003', product: 'RAU-MUONG', type: 'OUT', qty: 50, price: 6000, day: '06', note: 'Xuất bán Rau Sạch' },
        // Nhập thêm hàng
        { code: 'NK-007', product: 'PHAN-NPK', type: 'IN', qty: 20, price: 350000, day: '08', note: 'Nhập thêm phân NPK' },
        { code: 'NK-008', product: 'THUOC-SAU', type: 'IN', qty: 20, price: 85000, day: '09', note: 'Nhập thêm thuốc sâu' },
    ];

    for (const s of stockData) {
        await prisma.stockMovement.create({
            data: {
                farm_id: farm.id,
                code: s.code,
                product_id: products[s.product],
                type: s.type as any,
                quantity: s.qty,
                unit_price: s.price,
                cogs_amount: s.qty * s.price,
                date: new Date(`${datePrefix}-${s.day}`),
                notes: s.note,
            }
        });
    }
    console.log(`   ✅ ${stockData.length} stock movements`);

    // ==========================================
    // 7. WORKERS (Nhân công)
    // ==========================================
    console.log('👷 Creating workers...');
    const workerData = [
        { code: 'NV-001', name: 'Nguyễn Văn An', phone: '0911111111', salary: 8000000, type: 'FULL_TIME', salaryType: 'MONTHLY' },
        { code: 'NV-002', name: 'Trần Thị Bình', phone: '0922222222', salary: 7000000, type: 'FULL_TIME', salaryType: 'MONTHLY' },
        { code: 'NV-003', name: 'Lê Văn Cường', phone: '0933333333', salary: 300000, type: 'SEASONAL', salaryType: 'DAILY' },
        { code: 'NV-004', name: 'Phạm Thị Dung', phone: '0944444444', salary: 50000, type: 'PART_TIME', salaryType: 'HOURLY' },
    ];

    const workers: Record<string, string> = {};
    for (const w of workerData) {
        const created = await prisma.worker.upsert({
            where: { farm_id_code: { farm_id: farm.id, code: w.code } },
            update: {
                name: w.name,
                phone: w.phone,
                base_salary: w.salary,
                worker_type: w.type as any,
                salary_type: w.salaryType as any,
                status: 'ACTIVE',
            },
            create: {
                farm_id: farm.id,
                code: w.code,
                name: w.name,
                phone: w.phone,
                base_salary: w.salary,
                worker_type: w.type as any,
                salary_type: w.salaryType as any,
                status: 'ACTIVE',
            }
        });
        workers[w.code] = created.id;
    }
    console.log(`   ✅ ${workerData.length} workers`);

    // ==========================================
    // 8. WORK LOGS - SKIPPED (model may not exist or have different structure)
    // ==========================================
    console.log('📋 Skipping work logs (not in schema or different structure)...');
    const workLogCount = 0;

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ FULL SEED COMPLETE!');
    console.log('='.repeat(60));

    const stats = {
        products: await prisma.product.count({ where: { farm_id: farm.id } }),
        partners: await prisma.partner.count({ where: { farm_id: farm.id } }),
        income: await prisma.transaction.count({ where: { farm_id: farm.id, trans_type: 'INCOME' } }),
        expense: await prisma.transaction.count({ where: { farm_id: farm.id, trans_type: 'EXPENSE' } }),
        cashIn: await prisma.transaction.count({ where: { farm_id: farm.id, trans_type: 'CASH_IN' } }),
        cashOut: await prisma.transaction.count({ where: { farm_id: farm.id, trans_type: 'CASH_OUT' } }),
        stockMoves: await prisma.stockMovement.count({ where: { farm_id: farm.id } }),
        workers: await prisma.worker.count({ where: { farm_id: farm.id } }),
        workLogs: await prisma.workLog.count({ where: { farm_id: farm.id } }),
    };

    console.log(`   📦 Products:      ${stats.products}`);
    console.log(`   🤝 Partners:      ${stats.partners} (4 KH + 4 NCC)`);
    console.log(`   💰 INCOME:        ${stats.income} (Doanh thu bán hàng)`);
    console.log(`   💸 EXPENSE:       ${stats.expense} (Mua hàng)`);
    console.log(`   📥 CASH_IN:       ${stats.cashIn} (Thu tiền)`);
    console.log(`   📤 CASH_OUT:      ${stats.cashOut} (Chi tiền)`);
    console.log(`   📦 Stock Moves:   ${stats.stockMoves} (Nhập/xuất kho)`);
    console.log(`   👷 Workers:       ${stats.workers}`);
    console.log(`   📋 Work Logs:     ${stats.workLogs}`);
    console.log('='.repeat(60));

    console.log('\n📊 VAT TEST CASES:');
    console.log('   ⚠️ MH-003: Cash >= 20M → VAT bị reject');
    console.log('   ⚠️ MH-005: Không có hóa đơn → VAT bị reject');

    console.log('\n📊 CÔNG NỢ TEST:');
    console.log('   → Phải thu: BH-003 (5.5M), BH-004 (3.8M còn lại)');
    console.log('   → Phải trả: MH-003 (27.5M), MH-004 (1.3M còn lại)');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
