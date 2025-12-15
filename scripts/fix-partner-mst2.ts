// scripts/fix-partner-mst2.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Cập nhật tất cả partner có tên chứa CoopMart
    const result = await prisma.partner.updateMany({
        where: {
            name: { contains: 'CoopMart' },
        },
        data: {
            tax_code: '0309876543',
        },
    });
    console.log(`Đã cập nhật ${result.count} partner`);

    // Verify
    const partners = await prisma.partner.findMany({
        where: { name: { contains: 'CoopMart' } },
        select: { name: true, tax_code: true },
    });
    console.log('Kết quả:', partners);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
