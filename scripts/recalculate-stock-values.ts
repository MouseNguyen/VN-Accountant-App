// scripts/recalculate-stock-values.ts
// Recalculate all stock total_value based on quantity * avg_cost

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Recalculating stock values...\n');

    const user = await prisma.user.findFirst({
        where: { email: 'test@test.com' },
    });

    if (!user?.farm_id) {
        console.log('❌ No test user found');
        return;
    }

    const farmId = user.farm_id;

    const stocks = await prisma.stock.findMany({
        where: { farm_id: farmId },
        include: { product: true },
    });

    let updated = 0;
    for (const stock of stocks) {
        const qty = Number(stock.quantity);
        const avgCost = Number(stock.avg_cost);
        const correctValue = qty * avgCost;
        const currentValue = Number(stock.total_value);

        if (Math.abs(correctValue - currentValue) > 0.01) {
            console.log(`${stock.product.code}: ${currentValue.toLocaleString()} -> ${correctValue.toLocaleString()}`);

            await prisma.stock.update({
                where: { id: stock.id },
                data: { total_value: correctValue },
            });
            updated++;
        }
    }

    console.log(`\n✅ Updated ${updated} records`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
