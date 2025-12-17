// scripts/sync-stock-to-product.ts
// Sync script to update Product.stock_qty from Stock.quantity
// This fixes data inconsistency between the two tables

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function syncStockToProduct() {
    console.log('🔄 Starting Stock → Product sync...\n');

    // Get all stocks with their products
    const stocks = await prisma.stock.findMany({
        include: {
            product: { select: { id: true, code: true, name: true, stock_qty: true, avg_cost: true } }
        }
    });

    console.log(`Found ${stocks.length} Stock records to sync\n`);

    let updated = 0;
    let skipped = 0;

    for (const stock of stocks) {
        const stockQty = Number(stock.quantity);
        const productQty = Number(stock.product.stock_qty);
        const stockAvgCost = Number(stock.avg_cost);
        const productAvgCost = Number(stock.product.avg_cost);

        // Check if sync needed
        if (stockQty !== productQty || stockAvgCost !== productAvgCost) {
            console.log(`📦 ${stock.product.code} - ${stock.product.name}`);
            console.log(`   Product.stock_qty: ${productQty} → ${stockQty}`);
            console.log(`   Product.avg_cost: ${productAvgCost} → ${stockAvgCost}`);

            await prisma.product.update({
                where: { id: stock.product_id },
                data: {
                    stock_qty: stockQty,
                    avg_cost: stockAvgCost,
                }
            });

            updated++;
        } else {
            skipped++;
        }
    }

    console.log(`\n✅ Sync complete!`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped (already synced): ${skipped}`);

    await prisma.$disconnect();
}

syncStockToProduct().catch(console.error);
