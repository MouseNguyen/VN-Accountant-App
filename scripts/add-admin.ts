// scripts/add-admin.ts
// Simple script to add admin user

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Setting up admin user...\n');

    const passwordHash = await bcrypt.hash('Admin123@', 10);

    // Get any existing farm or create one
    let farm = await prisma.farm.findFirst();

    if (!farm) {
        console.log('No farm found, creating one...');
        farm = await prisma.farm.create({
            data: {
                name: 'Demo Farm',
                business_type: 'FARM',
                tax_code: '0109999999',
            }
        });
        console.log('✅ Created farm');
    } else {
        console.log('✅ Found farm:', farm.name);
    }

    // Upsert admin user
    const admin = await prisma.user.upsert({
        where: { email: 'admin@laba.vn' },
        update: {
            email_verified: true,
            is_active: true,
            password_hash: passwordHash,
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

    console.log('✅ Admin ready:', admin.email);
    console.log('\n📋 Login:');
    console.log('   Email: admin@laba.vn');
    console.log('   Password: Admin123@');
    console.log('\n🚀 Go to http://localhost:3000/login');
}

main().catch(console.error).finally(() => prisma.$disconnect());
