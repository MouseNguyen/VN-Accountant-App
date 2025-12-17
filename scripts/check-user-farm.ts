// scripts/check-user-farm.ts
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
    const user = await p.user.findFirst({
        where: { email: 'test@labaerp.com' },
        select: { email: true, farm_id: true, farm: { select: { name: true, id: true } } }
    });
    console.log('User:', JSON.stringify(user, null, 2));

    // Check if ARTransaction farm_id matches
    const arSample = await p.aRTransaction.findFirst({
        select: { farm_id: true, code: true }
    });
    console.log('AR Sample farm_id:', arSample?.farm_id);
    console.log('Match:', user?.farm_id === arSample?.farm_id);
}

main().catch(console.error).finally(() => p.$disconnect());
