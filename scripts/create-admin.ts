// scripts/create-admin.ts
// Create admin user for testing

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Creating/Updating admin user for testing...');

    // Check if farm exists
    let farm = await prisma.farm.findFirst({
        where: { code: 'DEMO' }
    });

    if (!farm) {
        console.log('Creating demo farm...');
        farm = await prisma.farm.create({
            data: {
                code: 'DEMO',
                name: 'Demo Farm',
                business_type: 'FARM',
                tax_code: '0109999999',
            }
        });
        console.log('✅ Created farm:', farm.id);
    }

    // Check if admin user exists
    let admin = await prisma.user.findFirst({
        where: { email: 'admin@laba.vn' }
    });

    const passwordHash = await bcrypt.hash('Admin123@', 10);

    if (!admin) {
        console.log('Creating admin user...');
        admin = await prisma.user.create({
            data: {
                farm_id: farm.id,
                email: 'admin@laba.vn',
                password_hash: passwordHash,
                full_name: 'Admin Test',
                role: 'OWNER',
                is_active: true,
                email_verified: true, // Already verified!
            }
        });
        console.log('✅ Created admin user');
    } else {
        // Update to ensure verified
        await prisma.user.update({
            where: { id: admin.id },
            data: {
                email_verified: true,
                is_active: true,
                password_hash: passwordHash,
            }
        });
        console.log('✅ Updated admin user (verified & active)');
    }

    console.log('\n📋 Login credentials:');
    console.log('   Email: admin@laba.vn');
    console.log('   Password: Admin123@');
    console.log('\n🚀 Ready to test at http://localhost:3000/login');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
