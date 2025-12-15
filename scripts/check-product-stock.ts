// scripts/check-product-stock.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const product = await prisma.product.findFirst({
        where: { code: 'THU-001' },
    });

    if (product) {
        console.log('Product:', product.code);
        console.log('stock_qty:', product.stock_qty);
        console.log('typeof stock_qty:', typeof product.stock_qty);
        console.log('Number(stock_qty):', Number(product.stock_qty));
    }
}

main().finally(() => prisma.$disconnect());
