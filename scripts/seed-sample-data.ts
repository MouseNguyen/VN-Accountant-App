// scripts/seed-sample-data.ts
// Seed sample data for testing

import { PrismaClient, ProductCategory, PartnerType, TransactionType, PaymentMethod } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding sample data...\n');

    // Get the farm
    const farm = await prisma.farm.findFirst();
    if (!farm) {
        console.log('❌ No farm found!');
        return;
    }
    console.log(`📍 Farm: ${farm.name}\n`);

    // ==========================================
    // 1. PRODUCTS
    // ==========================================
    console.log('📦 Creating products...');

    const products = [
        { code: 'LUA-001', name: 'Lúa ST25', category: 'NONG_SAN' as ProductCategory, unit: 'kg', price: 25000 },
        { code: 'GAO-001', name: 'Gạo ST25', category: 'NONG_SAN' as ProductCategory, unit: 'kg', price: 45000 },
        { code: 'RAU-001', name: 'Rau muống', category: 'NONG_SAN' as ProductCategory, unit: 'bó', price: 8000 },
        { code: 'RAU-002', name: 'Cà chua', category: 'NONG_SAN' as ProductCategory, unit: 'kg', price: 25000 },
        { code: 'CAY-001', name: 'Cây giống lúa', category: 'VAT_TU' as ProductCategory, unit: 'cây', price: 500 },
        { code: 'PHAN-001', name: 'Phân bón NPK', category: 'VAT_TU' as ProductCategory, unit: 'bao', price: 350000 },
        { code: 'THUOC-001', name: 'Thuốc trừ sâu', category: 'VAT_TU' as ProductCategory, unit: 'chai', price: 85000 },
        { code: 'XNG-001', name: 'Xăng A95', category: 'VAT_TU' as ProductCategory, unit: 'lít', price: 25000 },
    ];

    for (const p of products) {
        await prisma.product.upsert({
            where: { farm_id_code: { farm_id: farm.id, code: p.code } },
            update: {},
            create: {
                farm_id: farm.id,
                code: p.code,
                name: p.name,
                category: p.category,
                unit: p.unit,
                selling_price: p.price,
                purchase_price: p.price * 0.8,
                min_stock: 10,
                is_active: true,
            }
        });
    }
    console.log(`   ✅ Created ${products.length} products`);

    // ==========================================
    // 2. PARTNERS
    // ==========================================
    console.log('🤝 Creating partners...');

    const partners = [
        { code: 'KH001', name: 'Công ty TNHH Thực phẩm Sạch', type: 'CUSTOMER' as PartnerType, taxCode: '0123456789', phone: '0901234567' },
        { code: 'KH002', name: 'Chợ đầu mối Long Biên', type: 'CUSTOMER' as PartnerType, phone: '0902345678' },
        { code: 'KH003', name: 'Cửa hàng Rau Xanh', type: 'CUSTOMER' as PartnerType, phone: '0903456789' },
        { code: 'NCC001', name: 'Công ty Phân bón Việt Nhật', type: 'VENDOR' as PartnerType, taxCode: '0987654321', phone: '0281234567' },
        { code: 'NCC002', name: 'Đại lý Thuốc BVTV Miền Nam', type: 'VENDOR' as PartnerType, taxCode: '0111222333', phone: '0282345678' },
        { code: 'NCC003', name: 'Trạm xăng Petrolimex', type: 'VENDOR' as PartnerType, taxCode: '0100100100', phone: '0283456789' },
    ];

    for (const p of partners) {
        await prisma.partner.upsert({
            where: { farm_id_code: { farm_id: farm.id, code: p.code } },
            update: {},
            create: {
                farm_id: farm.id,
                code: p.code,
                name: p.name,
                partner_type: p.type,
                tax_code: p.taxCode,
                phone: p.phone,
                is_active: true,
            }
        });
    }
    console.log(`   ✅ Created ${partners.length} partners`);

    // ==========================================
    // 3. TRANSACTIONS
    // ==========================================
    console.log('💰 Creating transactions...');

    const createdProducts = await prisma.product.findMany({ where: { farm_id: farm.id } });
    const createdPartners = await prisma.partner.findMany({ where: { farm_id: farm.id } });

    const customersIds = createdPartners.filter(p => p.partner_type === 'CUSTOMER').map(p => p.id);
    const vendorIds = createdPartners.filter(p => p.partner_type === 'VENDOR').map(p => p.id);

    // Sales transactions
    const sales = [
        { code: 'BH001', date: '2024-12-01', partner: customersIds[0], amount: 2500000, vat: 250000, desc: 'Bán 100kg gạo ST25' },
        { code: 'BH002', date: '2024-12-05', partner: customersIds[1], amount: 800000, vat: 80000, desc: 'Bán rau tổng hợp' },
        { code: 'BH003', date: '2024-12-10', partner: customersIds[2], amount: 1200000, vat: 120000, desc: 'Bán 50kg cà chua' },
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
                partner_id: s.partner,
                amount: s.amount,
                subtotal: s.amount,
                vat_amount: s.vat,
                tax_amount: s.vat,
                total_amount: s.amount + s.vat,
                payment_method: 'BANK_TRANSFER',
                payment_status: 'PAID',
                paid_amount: s.amount + s.vat,
                description: s.desc,
            }
        });
    }

    // Purchase transactions (some with cash >= 20M for VAT testing)
    const purchases = [
        { code: 'MH001', date: '2024-12-02', partner: vendorIds[0], amount: 3500000, vat: 350000, method: 'BANK_TRANSFER' as PaymentMethod, desc: 'Mua 10 bao phân NPK' },
        { code: 'MH002', date: '2024-12-06', partner: vendorIds[1], amount: 850000, vat: 85000, method: 'CASH' as PaymentMethod, desc: 'Mua 10 chai thuốc trừ sâu' },
        { code: 'MH003', date: '2024-12-08', partner: vendorIds[2], amount: 25000000, vat: 2500000, method: 'CASH' as PaymentMethod, desc: 'Mua xăng nguyên tháng - VAT sẽ bị reject' },
        { code: 'MH004', date: '2024-12-12', partner: vendorIds[0], amount: 7000000, vat: 700000, method: 'BANK_TRANSFER' as PaymentMethod, desc: 'Mua 20 bao phân NPK' },
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
                partner_id: p.partner,
                amount: p.amount,
                subtotal: p.amount,
                vat_amount: p.vat,
                tax_amount: p.vat,
                total_amount: p.amount + p.vat,
                payment_method: p.method,
                payment_status: 'PAID',
                paid_amount: p.amount + p.vat,
                description: p.desc,
            }
        });
    }

    console.log(`   ✅ Created ${sales.length} sales + ${purchases.length} purchases`);

    // ==========================================
    // SUMMARY
    // ==========================================
    const prodCount = await prisma.product.count({ where: { farm_id: farm.id } });
    const partCount = await prisma.partner.count({ where: { farm_id: farm.id } });
    const transCount = await prisma.transaction.count({ where: { farm_id: farm.id } });

    console.log('\n✅ DONE! Summary:');
    console.log(`   📦 Products: ${prodCount}`);
    console.log(`   🤝 Partners: ${partCount}`);
    console.log(`   💰 Transactions: ${transCount}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
