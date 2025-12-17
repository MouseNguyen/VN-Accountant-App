// scripts/quick-admin.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Creating admin user...');

    const passwordHash = await bcrypt.hash('Admin123@', 10);

    // Create farm
    const farm = await prisma.farm.upsert({
        where: { id: '00000000-0000-4000-a000-000000000001' },
        update: {},
        create: {
            id: '00000000-0000-4000-a000-000000000001',
            name: 'Nông trại Demo',
            owner_name: 'Admin Test',
            business_type: 'FARM',
            tax_code: '0109999999',
        }
    });
    console.log('✅ Farm ready:', farm.id);

    // Create user
    const user = await prisma.user.upsert({
        where: { email: 'admin@laba.vn' },
        update: {
            password_hash: passwordHash,
            email_verified: true,
            is_active: true,
        },
        create: {
            farm_id: farm.id,
            email: 'admin@laba.vn',
            password_hash: passwordHash,
            full_name: 'Admin Test',
            role: 'OWNER',
            is_active: true,
            email_verified: true,
        }
    });
    console.log('✅ User ready:', user.email);

    console.log('\n📋 Login credentials:');
    console.log('   Email: admin@laba.vn');
    console.log('   Password: Admin123@');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
