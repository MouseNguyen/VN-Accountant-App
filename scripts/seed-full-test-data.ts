// scripts/seed-full-test-data.ts
// Simplified seed script that works with existing schema

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding FULL test data...\n');

    // Get the farm for test@test.com user
    const user = await prisma.user.findFirst({
        where: { email: 'test@test.com' },
        include: { farm: true },
    });

    if (!user || !user.farm) {
        console.log('❌ No test user or farm found. User: test@test.com');
        return;
    }

    const farm = user.farm;
    const farmId = farm.id;
    console.log(`✅ Using farm: ${farm.name} (${farmId})`);
    console.log(`👤 User: ${user.email}\n`);

    // ==========================================
    // 1. PRODUCTS
    // ==========================================
    console.log('📦 Creating Products...');

    const products = [
        { code: 'GA-001', name: 'Gà thịt', unit: 'kg', category: 'NONG_SAN', price: 85000, cost: 65000, stock: 150, minStock: 50 },
        { code: 'GA-002', name: 'Gà giống', unit: 'con', category: 'NONG_SAN', price: 120000, cost: 90000, stock: 80, minStock: 20 },
        { code: 'VIT-001', name: 'Vịt thịt', unit: 'kg', category: 'NONG_SAN', price: 75000, cost: 55000, stock: 100, minStock: 30 },
        { code: 'TTA-001', name: 'Thức ăn gia cầm', unit: 'bao', category: 'VAT_TU', price: 350000, cost: 280000, stock: 25, minStock: 10 },
        { code: 'TTA-002', name: 'Thức ăn heo', unit: 'bao', category: 'VAT_TU', price: 450000, cost: 380000, stock: 15, minStock: 8 },
        { code: 'THU-001', name: 'Thuốc thú y', unit: 'chai', category: 'VAT_TU', price: 150000, cost: 100000, stock: 40, minStock: 15 },
        { code: 'RAU-001', name: 'Rau xanh', unit: 'kg', category: 'NONG_SAN', price: 25000, cost: 15000, stock: 200, minStock: 50 },
        { code: 'TRA-001', name: 'Trứng gà', unit: 'quả', category: 'NONG_SAN', price: 3500, cost: 2500, stock: 500, minStock: 100 },
    ];

    let productCount = 0;
    const createdProducts: any[] = [];

    for (const p of products) {
        const existing = await prisma.product.findFirst({
            where: { farm_id: farmId, code: p.code },
        });

        if (existing) {
            await prisma.product.update({
                where: { id: existing.id },
                data: {
                    name: p.name,
                    selling_price: p.price,
                    purchase_price: p.cost,
                    avg_cost: p.cost,
                    stock_qty: p.stock,
                    min_stock: p.minStock,
                },
            });
            createdProducts.push({ ...existing, selling_price: p.price, avg_cost: p.cost, stock_qty: p.stock });
        } else {
            const created = await prisma.product.create({
                data: {
                    farm_id: farmId,
                    code: p.code,
                    name: p.name,
                    unit: p.unit,
                    category: p.category as any,
                    selling_price: p.price,
                    purchase_price: p.cost,
                    avg_cost: p.cost,
                    stock_qty: p.stock,
                    min_stock: p.minStock,
                },
            });
            createdProducts.push(created);
        }
        productCount++;
    }
    console.log(`  ✅ ${productCount} products ready\n`);

    // ==========================================
    // 2. TRANSACTIONS - Use raw SQL for simplicity
    // ==========================================
    console.log('💰 Creating Transactions...');

    // Delete existing
    await prisma.$executeRaw`DELETE FROM transaction_items WHERE transaction_id IN (SELECT id FROM transactions WHERE farm_id = ${farmId})`;
    await prisma.$executeRaw`DELETE FROM transactions WHERE farm_id = ${farmId}`;

    const today = new Date();
    let transCount = 0;

    // Create INCOME transactions
    for (let i = 0; i < 15; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const transDate = new Date(today);
        transDate.setDate(transDate.getDate() - daysAgo);

        const product = createdProducts[Math.floor(Math.random() * createdProducts.length)];
        const qty = Math.floor(Math.random() * 20) + 5;
        const price = Number(product.selling_price) || 50000;
        const total = qty * price;
        const isPaid = Math.random() > 0.3;
        const transNumber = `HD${transDate.toISOString().slice(2, 10).replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`;

        await prisma.transaction.create({
            data: {
                farm_id: farmId,
                trans_number: transNumber,
                code: transNumber,
                trans_type: 'INCOME',
                trans_date: transDate,
                amount: total,
                total_amount: total,
                paid_amount: isPaid ? total : Math.floor(total * 0.5),
                payment_status: isPaid ? 'PAID' : 'PARTIAL',
                payment_method: 'CASH',
                description: `Bán ${product.name} - ${qty} ${product.unit}`,
            },
        });
        transCount++;
    }

    // Create EXPENSE transactions
    for (let i = 0; i < 8; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const transDate = new Date(today);
        transDate.setDate(transDate.getDate() - daysAgo);

        const product = createdProducts[3]; // Thức ăn
        const qty = Math.floor(Math.random() * 10) + 2;
        const cost = Number(product.avg_cost) || 280000;
        const total = qty * cost;
        const transNumber = `PC${transDate.toISOString().slice(2, 10).replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`;

        await prisma.transaction.create({
            data: {
                farm_id: farmId,
                trans_number: transNumber,
                code: transNumber,
                trans_type: 'EXPENSE',
                trans_date: transDate,
                amount: total,
                total_amount: total,
                paid_amount: total,
                payment_status: 'PAID',
                payment_method: 'CASH',
                description: `Mua ${product.name} - ${qty} ${product.unit}`,
            },
        });
        transCount++;
    }
    console.log(`  ✅ ${transCount} transactions created\n`);

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('='.repeat(50));
    console.log('📊 SEED DATA SUMMARY');
    console.log('='.repeat(50));

    // Products summary
    const productSummary = await prisma.product.aggregate({
        where: { farm_id: farmId },
        _count: true,
        _sum: { stock_qty: true },
    });

    const allProducts = await prisma.product.findMany({ where: { farm_id: farmId } });
    const inventoryValue = allProducts.reduce((sum, p) => sum + Number(p.stock_qty) * Number(p.avg_cost), 0);

    console.log(`\n📦 PRODUCTS: ${productSummary._count}`);
    console.log(`   Total Stock: ${Number(productSummary._sum.stock_qty || 0).toLocaleString()} units`);
    console.log(`   Inventory Value: ${inventoryValue.toLocaleString()}đ`);

    // Transaction summary
    const incomeSum = await prisma.transaction.aggregate({
        where: { farm_id: farmId, trans_type: 'INCOME' },
        _count: true,
        _sum: { total_amount: true },
    });

    const expenseSum = await prisma.transaction.aggregate({
        where: { farm_id: farmId, trans_type: 'EXPENSE' },
        _count: true,
        _sum: { total_amount: true },
    });

    console.log(`\n💵 TRANSACTIONS:`);
    console.log(`   Income: ${incomeSum._count} transactions, ${Number(incomeSum._sum.total_amount || 0).toLocaleString()}đ`);
    console.log(`   Expense: ${expenseSum._count} transactions, ${Number(expenseSum._sum.total_amount || 0).toLocaleString()}đ`);
    console.log(`   Net: ${(Number(incomeSum._sum.total_amount || 0) - Number(expenseSum._sum.total_amount || 0)).toLocaleString()}đ`);

    // AR Summary
    const arCount = await prisma.aRTransaction.count({ where: { farm_id: farmId } });
    const arSum = await prisma.aRTransaction.aggregate({
        where: { farm_id: farmId, type: 'INVOICE', balance: { gt: 0 } },
        _sum: { balance: true },
    });

    console.log(`\n📄 AR RECEIVABLES: ${arCount} records`);
    console.log(`   Outstanding: ${Number(arSum._sum.balance || 0).toLocaleString()}đ`);

    console.log('\n✅ Full test data seeded successfully!');
    console.log('\n🔗 Refresh http://localhost:3000/bao-cao to see data');
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
