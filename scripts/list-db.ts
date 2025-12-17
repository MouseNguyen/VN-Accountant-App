// scripts/list-db.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('=== FARMS ===');
    const farms = await prisma.farm.findMany({ take: 5 });
    console.table(farms.map(f => ({ id: f.id, name: f.name })));

    console.log('\n=== USERS ===');
    const users = await prisma.user.findMany({ take: 5 });
    console.table(users.map(u => ({
        email: u.email,
        active: u.is_active,
        verified: u.email_verified,
        farm_id: u.farm_id
    })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
