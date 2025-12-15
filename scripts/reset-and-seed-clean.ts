// scripts/reset-and-seed-clean.ts
// Delete all test data and create fresh consistent data

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🗑️  RESET AND SEED CLEAN DATA\n');
    console.log('='.repeat(60));

    // Get test user
    const user = await prisma.user.findFirst({
        where: { email: 'test@test.com' },
    });

    if (!user?.farm_id) {
        console.log('❌ No test user found');
        return;
    }

    const farmId = user.farm_id;
    const userId = user.id;
    console.log(`Farm ID: ${farmId}\n`);

    // ==========================================
    // 1. DELETE ALL EXISTING DATA
    // ==========================================
    console.log('🗑️  Deleting existing data...');

    // Delete in correct order using raw SQL to avoid constraint issues
    await prisma.$executeRaw`DELETE FROM stock_count_items WHERE stock_count_id IN (SELECT id FROM stock_counts WHERE farm_id = ${farmId})`;
    await prisma.$executeRaw`DELETE FROM stock_counts WHERE farm_id = ${farmId}`;
    await prisma.$executeRaw`DELETE FROM stock_movements WHERE farm_id = ${farmId}`;
    await prisma.$executeRaw`DELETE FROM stocks WHERE farm_id = ${farmId}`;
    await prisma.$executeRaw`DELETE FROM ar_payment_allocations WHERE ar_transaction_id IN (SELECT id FROM ar_transactions WHERE farm_id = ${farmId})`;
    await prisma.$executeRaw`DELETE FROM ar_transactions WHERE farm_id = ${farmId}`;
    await prisma.$executeRaw`DELETE FROM transaction_items WHERE transaction_id IN (SELECT id FROM transactions WHERE farm_id = ${farmId})`;
    await prisma.$executeRaw`DELETE FROM transactions WHERE farm_id = ${farmId}`;
    await prisma.$executeRaw`DELETE FROM products WHERE farm_id = ${farmId}`;
    await prisma.$executeRaw`DELETE FROM partners WHERE farm_id = ${farmId}`;

    console.log('✅ All data deleted\n');

    // ==========================================
    // 2. CREATE PRODUCTS (Single source of truth)
    // ==========================================
    console.log('📦 Creating products...');

    const products = [
        { code: 'GA-001', name: 'Gà thịt', unit: 'kg', category: 'NONG_SAN', selling_price: 85000, purchase_price: 65000, stock_qty: 100, avg_cost: 65000, min_stock: 20 },
        { code: 'GA-002', name: 'Gà giống', unit: 'con', category: 'NONG_SAN', selling_price: 120000, purchase_price: 80000, stock_qty: 50, avg_cost: 80000, min_stock: 10 },
        { code: 'VIT-001', name: 'Vịt thịt', unit: 'kg', category: 'NONG_SAN', selling_price: 75000, purchase_price: 55000, stock_qty: 80, avg_cost: 55000, min_stock: 15 },
        { code: 'RAU-001', name: 'Rau cải xanh', unit: 'kg', category: 'NONG_SAN', selling_price: 25000, purchase_price: 15000, stock_qty: 200, avg_cost: 15000, min_stock: 50 },
        { code: 'TRA-001', name: 'Trứng gà', unit: 'quả', category: 'NONG_SAN', selling_price: 4000, purchase_price: 2500, stock_qty: 500, avg_cost: 2500, min_stock: 100 },
        { code: 'TTA-001', name: 'Thức ăn gia cầm', unit: 'kg', category: 'VAT_TU', selling_price: 0, purchase_price: 15000, stock_qty: 200, avg_cost: 15000, min_stock: 50 },
        { code: 'THU-001', name: 'Thuốc thú y', unit: 'chai', category: 'VAT_TU', selling_price: 0, purchase_price: 100000, stock_qty: 20, avg_cost: 100000, min_stock: 5 },
    ];

    const createdProducts: { id: string; code: string; name: string; selling_price: number; avg_cost: number; stock_qty: number }[] = [];

    for (const p of products) {
        const product = await prisma.product.create({
            data: {
                farm_id: farmId,
                code: p.code,
                name: p.name,
                unit: p.unit,
                category: p.category as any,
                selling_price: p.selling_price,
                purchase_price: p.purchase_price,
                stock_qty: p.stock_qty,
                avg_cost: p.avg_cost,
                min_stock: p.min_stock,
                is_active: true,
            },
        });
        createdProducts.push({
            id: product.id,
            code: p.code,
            name: p.name,
            selling_price: p.selling_price,
            avg_cost: p.avg_cost,
            stock_qty: p.stock_qty,
        });
        console.log(`  ✅ ${p.code}: ${p.name} (${p.stock_qty} ${p.unit})`);
    }

    // ==========================================
    // 3. CREATE PARTNERS
    // ==========================================
    console.log('\n👥 Creating partners...');

    const customers = [
        { code: 'KH001', name: 'Chợ Bến Thành', type: 'CUSTOMER' },
        { code: 'KH002', name: 'Nhà hàng Phố Cổ', type: 'CUSTOMER' },
        { code: 'KH003', name: 'Siêu thị CoopMart', type: 'CUSTOMER' },
    ];

    const vendors = [
        { code: 'NCC001', name: 'Công ty Thức Ăn ABC', type: 'VENDOR' },
        { code: 'NCC002', name: 'Đại lý Thuốc Thú Y', type: 'VENDOR' },
    ];

    const createdPartners: { id: string; code: string; name: string; type: string }[] = [];

    for (const partner of [...customers, ...vendors]) {
        const p = await prisma.partner.create({
            data: {
                farm_id: farmId,
                code: partner.code,
                name: partner.name,
                partner_type: partner.type as any,
                is_active: true,
            },
        });
        createdPartners.push({ id: p.id, code: partner.code, name: partner.name, type: partner.type });
        console.log(`  ✅ ${partner.code}: ${partner.name}`);
    }

    // ==========================================
    // 4. CREATE TRANSACTIONS
    // ==========================================
    console.log('\n💰 Creating transactions...');

    const customerIds = createdPartners.filter(p => p.type === 'CUSTOMER').map(p => p.id);
    const vendorIds = createdPartners.filter(p => p.type === 'VENDOR').map(p => p.id);

    // Sales transactions
    const salesProducts = createdProducts.filter(p => p.selling_price > 0);
    let transNumber = 1;

    for (let i = 0; i < 5; i++) {
        const product = salesProducts[i % salesProducts.length];
        const qty = 10 + i * 5;
        const total = qty * product.selling_price;
        const isPaid = i < 3;

        await prisma.transaction.create({
            data: {
                farm_id: farmId,
                trans_number: `HD${String(transNumber++).padStart(6, '0')}`,
                trans_type: 'INCOME',
                trans_date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
                partner_id: customerIds[i % customerIds.length],
                amount: total,
                total_amount: total,
                paid_amount: isPaid ? total : 0,
                payment_status: isPaid ? 'PAID' : 'UNPAID',
                description: `Bán ${product.name}`,
                created_by: userId,
            },
        });
        console.log(`  ✅ Sale: ${product.name} x${qty} = ${total.toLocaleString()}đ`);
    }

    // Purchase transactions
    for (let i = 0; i < 3; i++) {
        const product = createdProducts.filter(p => p.code.startsWith('TTA') || p.code.startsWith('THU'))[i % 2];
        const qty = 20 + i * 10;
        const total = qty * product.avg_cost;

        await prisma.transaction.create({
            data: {
                farm_id: farmId,
                trans_number: `HD${String(transNumber++).padStart(6, '0')}`,
                trans_type: 'EXPENSE',
                trans_date: new Date(Date.now() - i * 48 * 60 * 60 * 1000),
                partner_id: vendorIds[i % vendorIds.length],
                amount: total,
                total_amount: total,
                paid_amount: total,
                payment_status: 'PAID',
                description: `Mua ${product.name}`,
                created_by: userId,
            },
        });
        console.log(`  ✅ Purchase: ${product.name} x${qty} = ${total.toLocaleString()}đ`);
    }

    // ==========================================
    // 5. CREATE AR TRANSACTIONS (Outstanding invoices)
    // ==========================================
    console.log('\n📋 Creating AR transactions...');

    for (let i = 0; i < 3; i++) {
        const product = salesProducts[i % salesProducts.length];
        const qty = 15;
        const amount = qty * product.selling_price;
        const daysAgo = 10 + i * 20;
        const isOverdue = daysAgo > 30;

        await prisma.aRTransaction.create({
            data: {
                farm_id: farmId,
                customer_id: customerIds[i % customerIds.length],
                type: 'INVOICE',
                code: `INV${String(i + 1).padStart(6, '0')}`,
                trans_date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
                due_date: new Date(Date.now() - (daysAgo - 30) * 24 * 60 * 60 * 1000),
                amount: amount,
                paid_amount: 0,
                balance: amount,
                status: isOverdue ? 'OVERDUE' : 'UNPAID',
                days_overdue: isOverdue ? daysAgo - 30 : 0,
                description: `Bán ${product.name}`,
            },
        });
        console.log(`  ✅ Invoice: ${amount.toLocaleString()}đ (${isOverdue ? 'OVERDUE' : 'UNPAID'})`);
    }

    // ==========================================
    // 6. VERIFICATION
    // ==========================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION\n');

    const productCount = await prisma.product.count({ where: { farm_id: farmId } });
    const partnerCount = await prisma.partner.count({ where: { farm_id: farmId } });
    const transactionCount = await prisma.transaction.count({ where: { farm_id: farmId } });
    const arCount = await prisma.aRTransaction.count({ where: { farm_id: farmId } });

    const totalInventory = createdProducts.reduce((sum, p) => sum + p.stock_qty * p.avg_cost, 0);

    console.log(`Products: ${productCount}`);
    console.log(`Partners: ${partnerCount}`);
    console.log(`Transactions: ${transactionCount}`);
    console.log(`AR Transactions: ${arCount}`);
    console.log(`\nTotal Inventory Value: ${totalInventory.toLocaleString()}đ`);

    console.log('\n✅ SEED COMPLETE!');
    console.log('\n📌 Note: Stock table is empty - using Product.stock_qty directly');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
