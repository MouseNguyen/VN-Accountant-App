const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient();

    try {
        // Find the mismatched AP transaction
        const ap = await prisma.aPTransaction.findFirst({
            where: { code: 'AP-MH-2411-002' }
        });

        if (!ap) {
            console.log('AP-MH-2411-002 not found');
            return;
        }

        console.log('Before fix:', JSON.stringify(ap, null, 2));

        // Fix: Update AP to match Transaction (paid 2M of 4.4M = 2.4M balance)
        const updated = await prisma.aPTransaction.update({
            where: { id: ap.id },
            data: {
                paid_amount: 2000000,
                balance: 2400000, // 4,400,000 - 2,000,000
                status: 'PARTIAL'
            }
        });

        console.log('\nAfter fix:', JSON.stringify(updated, null, 2));
        console.log('\n✅ AP-MH-2411-002 synced to match Transaction MH-2411-002');

    } finally {
        await prisma.$disconnect();
    }
}

main();
