
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking for products with decimal selling_price (VND should be integer)...\n');

    const products = await prisma.product.findMany();
    let count = 0;

    for (const p of products) {
        if (Number(p.selling_price) % 1 !== 0) {
            console.log(`[FAIL] Product: ${p.name} (Code: ${p.code}) - Price: ${p.selling_price}`);
            count++;
        }
    }

    if (count === 0) {
        console.log('✅ No products with decimal prices found.');
    } else {
        console.log(`\n❌ Found ${count} products with decimal prices.`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
