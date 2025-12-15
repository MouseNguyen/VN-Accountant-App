// scripts/debug-stock-alerts.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({
        where: { email: 'test@test.com' },
    });

    if (!user?.farm_id) {
        console.log('❌ No test user found');
        return;
    }

    const farmId = user.farm_id;

    console.log('🔍 Debug Stock Alerts\n');

    // Check all products with their stock status
    const products = await prisma.product.findMany({
        where: { farm_id: farmId },
        orderBy: { code: 'asc' },
    });

    console.log('📦 All Products:');
    console.log('Code           | Name                    | StockQty  | MinStock | Active | Deleted');
    console.log('-'.repeat(90));

    for (const p of products) {
        const stockQty = Number(p.stock_qty);
        const minStock = Number(p.min_stock);
        console.log(
            `${p.code.padEnd(14)} | ${p.name.substring(0, 23).padEnd(23)} | ${String(stockQty).padStart(9)} | ${String(minStock).padStart(8)} | ${p.is_active ? 'Yes' : 'No '} | ${p.deleted_at ? 'Yes' : 'No'}`
        );
    }

    console.log('\n📊 Stock Table:');
    const stocks = await prisma.stock.findMany({
        where: { farm_id: farmId },
        include: { product: true },
    });

    for (const s of stocks) {
        console.log(`${s.product.code}: ${Number(s.quantity)} (min: ${Number(s.min_quantity) || 'null'})`);
    }

    // Run the same queries as the service
    console.log('\n🔴 OUT_OF_STOCK Query:');
    const outOfStock = await prisma.$queryRaw<Array<{ id: string; code: string; name: string }>>`
        SELECT 
          p.id,
          p.code,
          p.name
        FROM products p
        LEFT JOIN stocks s ON p.id = s.product_id AND s.farm_id = ${farmId}
        WHERE p.farm_id = ${farmId}
          AND p.deleted_at IS NULL
          AND p.is_active = true
          AND COALESCE(s.min_quantity, p.min_stock) IS NOT NULL
          AND COALESCE(s.min_quantity, p.min_stock) > 0
          AND COALESCE(s.quantity, 0) <= 0
    `;
    console.log(`Found ${outOfStock.length}:`);
    outOfStock.forEach(p => console.log(`  - ${p.code}: ${p.name}`));

    console.log('\n🟡 LOW_STOCK Query:');
    const lowStock = await prisma.$queryRaw<Array<{ id: string; code: string; name: string; quantity: string; min_quantity: string }>>`
        SELECT 
          p.id,
          p.code,
          p.name,
          COALESCE(s.quantity, 0) as quantity,
          COALESCE(s.min_quantity, p.min_stock) as min_quantity
        FROM products p
        LEFT JOIN stocks s ON p.id = s.product_id AND s.farm_id = ${farmId}
        WHERE p.farm_id = ${farmId}
          AND p.deleted_at IS NULL
          AND COALESCE(s.min_quantity, p.min_stock) IS NOT NULL
          AND COALESCE(s.min_quantity, p.min_stock) > 0
          AND COALESCE(s.quantity, 0) <= COALESCE(s.min_quantity, p.min_stock)
          AND COALESCE(s.quantity, 0) > 0
    `;
    console.log(`Found ${lowStock.length}:`);
    lowStock.forEach(p => console.log(`  - ${p.code}: ${p.name}, qty: ${p.quantity}, min: ${p.min_quantity}`));

    console.log('\n🔵 SLOW_MOVING Query:');
    const slowMoving = await prisma.$queryRaw<Array<{ id: string; code: string }>>`
        SELECT 
          p.id,
          p.code
        FROM stocks s
        JOIN products p ON s.product_id = p.id
        WHERE s.farm_id = ${farmId}
          AND p.deleted_at IS NULL
          AND s.quantity > 0
          AND s.last_movement_at IS NOT NULL
          AND s.last_movement_at < NOW() - INTERVAL '60 days'
    `;
    console.log(`Found ${slowMoving.length}`);

    console.log('\n📊 Total alerts:', outOfStock.length + lowStock.length + slowMoving.length);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
