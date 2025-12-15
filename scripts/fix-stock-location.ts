// scripts/fix-stock-location.ts
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
    const result = await p.stock.updateMany({
        where: { farm_id: '6a1cdfc3-7a55-43a7-9e96-21eb7be5ac7a' },
        data: { location_code: 'DEFAULT' }
    });
    console.log('Updated', result.count, 'stock records to location_code=DEFAULT');
}

main().finally(() => p.$disconnect());
