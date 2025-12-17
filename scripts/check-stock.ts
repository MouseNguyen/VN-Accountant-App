// scripts/check-stock.ts
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
    const farmId = 'test-farm-001';

    console.log('=== PRODUCT TABLE (stock_qty) ===');
    const products = await p.product.findMany({
        where: { farm_id: farmId, deleted_at: null },
        select: { id: true, code: true, name: true, stock_qty: true, avg_cost: true },
        take: 10
    });
    console.table(products.map(pr => ({
        code: pr.code,
        name: pr.name.substring(0, 20),
        stock_qty: Number(pr.stock_qty),
        avg_cost: Number(pr.avg_cost)
    })));

    console.log('\n=== STOCK TABLE ===');
    const stocks = await p.stock.findMany({
        where: { farm_id: farmId },
        include: { product: { select: { code: true, name: true } } },
        take: 10
    });

    if (stocks.length === 0) {
        console.log('No records in Stock table!');
    } else {
        console.table(stocks.map(s => ({
            code: s.product.code,
            name: s.product.name.substring(0, 20),
            quantity: Number(s.quantity),
            avg_cost: Number(s.avg_cost)
        })));
    }

    console.log('\n=== STOCK MOVEMENTS ===');
    const movements = await p.stockMovement.findMany({
        where: { farm_id: farmId },
        include: { product: { select: { code: true, name: true } } },
        orderBy: { created_at: 'desc' },
        take: 10
    });

    if (movements.length === 0) {
        console.log('No StockMovement records!');
    } else {
        console.table(movements.map(m => ({
            code: m.code,
            type: m.type,
            product: m.product?.code,
            qty: Number(m.quantity),
            date: m.date.toISOString().split('T')[0]
        })));
    }

    await p.$disconnect();
}

main().catch(console.error);
