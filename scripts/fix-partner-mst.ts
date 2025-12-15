// scripts/fix-partner-mst.ts
// Thêm MST cho partner CoopMart

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Cập nhật MST cho các partner...\n');

    // Tìm và cập nhật CoopMart
    const coopmart = await prisma.partner.findFirst({
        where: { name: { contains: 'CoopMart' } },
    });

    if (coopmart) {
        await prisma.partner.update({
            where: { id: coopmart.id },
            data: { tax_code: '0309876543' },
        });
        console.log(`✅ Đã cập nhật MST cho "${coopmart.name}": 0309876543`);
    } else {
        console.log('❌ Không tìm thấy CoopMart');
    }

    // Tìm tất cả partner không có MST
    const partnersNoMST = await prisma.partner.findMany({
        where: {
            OR: [
                { tax_code: null },
                { tax_code: '' },
            ],
        },
    });

    console.log(`\n📋 Các partner chưa có MST: ${partnersNoMST.length}`);
    for (const p of partnersNoMST) {
        console.log(`   - ${p.name} (${p.partner_type})`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
