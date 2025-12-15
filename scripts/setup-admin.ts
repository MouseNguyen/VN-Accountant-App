// scripts/setup-admin.ts
// Create admin user using raw SQL

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Setting up admin user...');

    // Generate bcrypt hash for "Admin123@"
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash('Admin123@', 10);
    const farmId = crypto.randomUUID();
    const userId = crypto.randomUUID();

    try {
        // Check if farm exists
        const existingFarm = await prisma.$queryRaw`SELECT id FROM farms WHERE code = 'DEMO' LIMIT 1` as any[];

        let useFarmId = farmId;
        if (existingFarm.length > 0) {
            useFarmId = existingFarm[0].id;
            console.log('✅ Found existing farm:', useFarmId);
        } else {
            // Create farm
            await prisma.$executeRaw`
                INSERT INTO farms (id, code, name, business_type, tax_code, created_at, updated_at)
                VALUES (${farmId}, 'DEMO', 'Demo Farm', 'FARM', '0109999999', NOW(), NOW())
            `;
            console.log('✅ Created farm:', farmId);
        }

        // Check if user exists
        const existingUser = await prisma.$queryRaw`SELECT id FROM users WHERE email = 'admin@laba.vn' LIMIT 1` as any[];

        if (existingUser.length > 0) {
            // Update user
            await prisma.$executeRaw`
                UPDATE users 
                SET email_verified = true, is_active = true, password_hash = ${passwordHash}
                WHERE email = 'admin@laba.vn'
            `;
            console.log('✅ Updated admin user (verified & active)');
        } else {
            // Create user
            await prisma.$executeRaw`
                INSERT INTO users (id, farm_id, email, password_hash, full_name, role, is_active, email_verified, created_at, updated_at)
                VALUES (${userId}, ${useFarmId}, 'admin@laba.vn', ${passwordHash}, 'Admin Test', 'OWNER', true, true, NOW(), NOW())
            `;
            console.log('✅ Created admin user');
        }

        console.log('\n📋 Login credentials:');
        console.log('   Email: admin@laba.vn');
        console.log('   Password: Admin123@');
        console.log('\n🚀 Ready to test at http://localhost:3000/login');

    } catch (error) {
        console.error('Error:', error);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
