// scripts/check-stock-locations.ts
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
    const stocks = await p.stock.findMany({
        where: { farm_id: '6a1cdfc3-7a55-43a7-9e96-21eb7be5ac7a' },
        include: { product: { select: { code: true } } }
    });

    console.log('Stock records:');
    for (const s of stocks) {
        console.log(`  ${s.product.code}: location=${s.location_code}, qty=${Number(s.quantity)}`);
    }
}

main().finally(() => p.$disconnect());
