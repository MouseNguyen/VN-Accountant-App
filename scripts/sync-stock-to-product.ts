// scripts/sync-stock-to-product.ts
// Sync Stock table quantities back to Product table

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Syncing Stock quantities to Product table...\n');

    const user = await prisma.user.findFirst({
        where: { email: 'test@test.com' },
    });

    if (!user?.farm_id) {
        console.log('❌ No test user found');
        return;
    }

    const farmId = user.farm_id;

    // Get all stocks with product info
    const stocks = await prisma.stock.findMany({
        where: { farm_id: farmId },
        include: { product: true },
    });

    console.log(`Found ${stocks.length} stock records to sync\n`);

    let updated = 0;
    for (const stock of stocks) {
        const stockQty = Number(stock.quantity);
        const stockAvgCost = Number(stock.avg_cost);
        const productQty = Number(stock.product.stock_qty);

        if (stockQty !== productQty) {
            console.log(`Syncing ${stock.product.code}: ${productQty} -> ${stockQty}`);

            await prisma.product.update({
                where: { id: stock.product_id },
                data: {
                    stock_qty: stockQty,
                    avg_cost: stockAvgCost,
                },
            });
            updated++;
        }
    }

    // Also sync products that have no Stock record but have stock_qty > 0
    const productsWithStock = await prisma.product.findMany({
        where: {
            farm_id: farmId,
            stock_qty: { gt: 0 }
        }
    });

    for (const product of productsWithStock) {
        const hasStock = stocks.some(s => s.product_id === product.id);
        if (!hasStock) {
            // Create stock record for this product
            console.log(`Creating Stock record for ${product.code}`);
            await prisma.stock.create({
                data: {
                    farm_id: farmId,
                    product_id: product.id,
                    quantity: product.stock_qty,
                    avg_cost: product.avg_cost,
                    min_quantity: product.min_stock,
                    total_value: Number(product.stock_qty) * Number(product.avg_cost),
                    location_code: 'MAIN',
                }
            });
            updated++;
        }
    }

    console.log(`\n✅ Updated ${updated} records`);

    // Verify
    console.log('\n📊 Verification:');
    const products = await prisma.product.findMany({
        where: { farm_id: farmId },
        orderBy: { code: 'asc' },
    });

    for (const p of products) {
        const stock = stocks.find(s => s.product_id === p.id);
        const productQty = Number(p.stock_qty);
        const stockQty = stock ? Number(stock.quantity) : 0;

        if (productQty !== stockQty && stock) {
            console.log(`❌ Still mismatched: ${p.code} - Product: ${productQty}, Stock: ${stockQty}`);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
