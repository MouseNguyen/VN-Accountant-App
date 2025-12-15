// scripts/delete-test-user.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🗑️ Deleting test@test.com...\n');

    try {
        // Delete any refresh tokens first
        await prisma.refreshToken.deleteMany({
            where: { user: { email: 'test@test.com' } }
        });
        console.log('✅ Deleted refresh tokens');

        // Delete the user
        const user = await prisma.user.delete({
            where: { email: 'test@test.com' }
        });
        console.log(`✅ Deleted user: ${user.email}`);
    } catch (error: unknown) {
        if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
            console.log('ℹ️ User test@test.com does not exist');
        } else {
            throw error;
        }
    }

    // Verify remaining users
    const users = await prisma.user.findMany();
    console.log(`\n📧 Remaining users: ${users.length}`);
    users.forEach(u => console.log(`   - ${u.email}`));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
