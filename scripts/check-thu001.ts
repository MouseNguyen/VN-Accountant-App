// scripts/check-thu001.ts
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
    const product = await p.product.findFirst({ where: { code: 'THU-001' } });
    console.log('Product THU-001:');
    console.log('  stock_qty:', Number(product?.stock_qty));
    console.log('  avg_cost:', Number(product?.avg_cost));

    const stock = await p.stock.findFirst({ where: { product_id: product?.id } });
    console.log('\nStock record:');
    console.log('  quantity:', Number(stock?.quantity));
    console.log('  avg_cost:', Number(stock?.avg_cost));
}

main().finally(() => p.$disconnect());
