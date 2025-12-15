// scripts/update-egg-unit.ts
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
    // Find the egg product (trứng gà)
    const egg = await p.product.findFirst({
        where: { name: { contains: 'Trứng' } }
    });

    if (egg) {
        await p.product.update({
            where: { id: egg.id },
            data: { unit: 'quả' }
        });
        console.log(`Updated ${egg.name}: unit = 'quả'`);
    } else {
        console.log('No egg product found');
    }
}

main().finally(() => p.$disconnect());
