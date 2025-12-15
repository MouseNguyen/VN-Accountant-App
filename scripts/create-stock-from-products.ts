// scripts/create-stock-from-products.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const farmId = '6a1cdfc3-7a55-43a7-9e96-21eb7be5ac7a';

    const products = await prisma.product.findMany({
        where: { farm_id: farmId }
    });

    console.log(`Creating stock records for ${products.length} products...`);

    for (const prod of products) {
        await prisma.stock.create({
            data: {
                farm_id: prod.farm_id,
                product_id: prod.id,
                quantity: prod.stock_qty,
                avg_cost: prod.avg_cost,
                min_quantity: prod.min_stock,
                total_value: Number(prod.stock_qty) * Number(prod.avg_cost),
                location_code: 'MAIN'
            }
        });
        console.log(`✅ ${prod.code}: ${Number(prod.stock_qty)} ${prod.unit}`);
    }

    console.log('\nDone!');
}

main().finally(() => prisma.$disconnect());
