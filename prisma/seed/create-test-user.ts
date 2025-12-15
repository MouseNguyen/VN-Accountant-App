// prisma/seed/create-test-user.ts
// Create a test user for development

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    // Check if test user already exists
    const existingUser = await prisma.user.findUnique({
        where: { email: 'test@test.com' },
    });

    if (existingUser) {
        console.log('Test user already exists:', existingUser.email);
        return;
    }

    // Create farm
    const farm = await prisma.farm.create({
        data: {
            name: 'Nông Trại Test',
            owner_name: 'Test User',
            business_type: 'FARM',
        },
    });

    // Hash password
    const passwordHash = await bcrypt.hash('Test1234', 12);

    // Create user
    const user = await prisma.user.create({
        data: {
            farm_id: farm.id,
            email: 'test@test.com',
            password_hash: passwordHash,
            full_name: 'Test User',
            role: 'OWNER',
        },
    });

    console.log('✅ Created test user:');
    console.log('   Email: test@test.com');
    console.log('   Password: Test1234');
    console.log('   Farm:', farm.name);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
