// scripts/audit-data-consistency.ts
// Comprehensive data audit to find all inconsistencies

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 COMPREHENSIVE DATA AUDIT\n');
    console.log('='.repeat(60));

    // Get test farm
    const user = await prisma.user.findFirst({
        where: { email: 'test@test.com' },
        include: { farm: true },
    });

    if (!user?.farm) {
        console.log('❌ No test user found');
        return;
    }

    const farmId = user.farm_id;
    console.log(`Farm: ${user.farm.name} (${farmId})\n`);

    // ==========================================
    // 1. PRODUCTS - Check stock_qty consistency
    // ==========================================
    console.log('📦 1. PRODUCTS AUDIT');
    console.log('-'.repeat(40));

    const products = await prisma.product.findMany({
        where: { farm_id: farmId },
        orderBy: { code: 'asc' },
    });

    console.log(`Total products: ${products.length}\n`);

    let lowStockProducts = 0;
    let outOfStockProducts = 0;
    let totalValue = 0;

    for (const p of products) {
        const stockQty = Number(p.stock_qty);
        const minStock = Number(p.min_stock);
        const avgCost = Number(p.avg_cost);
        const value = stockQty * avgCost;
        totalValue += value;

        let status = '✅';
        if (stockQty <= 0) {
            status = '🔴 OUT_OF_STOCK';
            outOfStockProducts++;
        } else if (minStock > 0 && stockQty <= minStock) {
            status = '🟡 LOW_STOCK';
            lowStockProducts++;
        }

        console.log(`${p.code.padEnd(10)} | ${p.name.padEnd(20)} | Qty: ${String(stockQty).padStart(6)} ${p.unit} | Min: ${String(minStock).padStart(4)} | Value: ${value.toLocaleString().padStart(12)}đ | ${status}`);
    }

    console.log('-'.repeat(40));
    console.log(`Low stock: ${lowStockProducts}`);
    console.log(`Out of stock: ${outOfStockProducts}`);
    console.log(`Total inventory value: ${totalValue.toLocaleString()}đ\n`);

    // ==========================================
    // 2. STOCK TABLE - Check if exists and matches
    // ==========================================
    console.log('📊 2. STOCK TABLE AUDIT');
    console.log('-'.repeat(40));

    const stocks = await prisma.stock.findMany({
        where: { farm_id: farmId },
        include: { product: true },
    });

    if (stocks.length === 0) {
        console.log('⚠️  No records in Stock table - using Product.stock_qty directly');
    } else {
        console.log(`Stock records: ${stocks.length}`);

        // Compare with products
        for (const stock of stocks) {
            const product = products.find(p => p.id === stock.product_id);
            if (product) {
                const stockQty = Number(stock.quantity);
                const productQty = Number(product.stock_qty);

                if (stockQty !== productQty) {
                    console.log(`❌ MISMATCH: ${product.code} - Stock: ${stockQty}, Product: ${productQty}`);
                }
            }
        }
    }
    console.log('');

    // ==========================================
    // 3. STOCK MOVEMENTS - Verify calculations
    // ==========================================
    console.log('📈 3. STOCK MOVEMENTS AUDIT');
    console.log('-'.repeat(40));

    const movements = await prisma.stockMovement.findMany({
        where: { farm_id: farmId },
        orderBy: { date: 'desc' },
        take: 20,
        include: { product: true },
    });

    console.log(`Recent movements: ${movements.length}`);

    for (const m of movements.slice(0, 10)) {
        const qty = Number(m.quantity);
        const before = Number(m.qty_before);
        const after = Number(m.qty_after);

        let expected = m.type === 'IN' ? before + qty : before - qty;
        let status = after === expected ? '✅' : '❌ WRONG';

        console.log(`${m.type.padEnd(3)} | ${m.product?.code || '?'} | Qty: ${qty} | Before: ${before} | After: ${after} | ${status}`);
    }
    console.log('');

    // ==========================================
    // 4. AR TRANSACTIONS
    // ==========================================
    console.log('💰 4. AR TRANSACTIONS AUDIT');
    console.log('-'.repeat(40));

    const arTxns = await prisma.aRTransaction.findMany({
        where: { farm_id: farmId },
    });

    console.log(`Total AR records: ${arTxns.length}`);

    const invoices = arTxns.filter(t => t.type === 'INVOICE');
    const payments = arTxns.filter(t => t.type === 'PAYMENT');

    const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.amount), 0);
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalBalance = arTxns.reduce((sum, t) => sum + Number(t.balance), 0);

    console.log(`Invoices: ${invoices.length}, Total: ${totalInvoiced.toLocaleString()}đ`);
    console.log(`Payments: ${payments.length}, Total: ${totalPaid.toLocaleString()}đ`);
    console.log(`Outstanding balance: ${totalBalance.toLocaleString()}đ`);
    console.log('');

    // ==========================================
    // 5. TRANSACTIONS (General)
    // ==========================================
    console.log('📋 5. TRANSACTIONS AUDIT');
    console.log('-'.repeat(40));

    const transactions = await prisma.transaction.findMany({
        where: { farm_id: farmId },
    });

    const income = transactions.filter(t => t.trans_type === 'INCOME');
    const expense = transactions.filter(t => t.trans_type === 'EXPENSE');

    const totalIncome = income.reduce((sum, t) => sum + Number(t.total_amount), 0);
    const totalExpense = expense.reduce((sum, t) => sum + Number(t.total_amount), 0);

    console.log(`Income: ${income.length} txns, Total: ${totalIncome.toLocaleString()}đ`);
    console.log(`Expense: ${expense.length} txns, Total: ${totalExpense.toLocaleString()}đ`);
    console.log(`Net: ${(totalIncome - totalExpense).toLocaleString()}đ`);
    console.log('');

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`\nProducts: ${products.length}`);
    console.log(`- Low stock: ${lowStockProducts}`);
    console.log(`- Out of stock: ${outOfStockProducts}`);
    console.log(`- Total alerts should be: ${lowStockProducts + outOfStockProducts}`);
    console.log(`\nInventory value: ${totalValue.toLocaleString()}đ`);
    console.log(`AR Outstanding: ${totalBalance.toLocaleString()}đ`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
