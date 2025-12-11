// prisma/seed/index.ts
// Main seed file - Run with: npx tsx prisma/seed/index.ts

import { PrismaClient, AccountType, TaxRateType } from '@prisma/client';
import { ACCOUNTS_SEED } from './accounts';
import { TAX_RATES_SEED } from './tax-rates';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Bắt đầu seed database...\n');

    // ==================== Seed Accounts ====================
    console.log('📊 Seeding hệ thống tài khoản kế toán...');

    for (const account of ACCOUNTS_SEED) {
        await prisma.account.upsert({
            where: { code: account.code },
            update: {},
            create: {
                code: account.code,
                name: account.name,
                name_en: account.name_en || null,
                type: account.type as AccountType,
                level: account.level,
                parent_code: account.parent_code || null,
                is_active: true,
                is_system: true,
            },
        });
    }
    console.log(`   ✅ Đã tạo ${ACCOUNTS_SEED.length} tài khoản kế toán\n`);

    // ==================== Seed Tax Rates ====================
    console.log('💰 Seeding thuế suất...');

    for (const taxRate of TAX_RATES_SEED) {
        await prisma.taxRate.upsert({
            where: { code: taxRate.code },
            update: {},
            create: {
                code: taxRate.code,
                name: taxRate.name,
                rate: taxRate.rate,
                type: taxRate.type as TaxRateType,
                is_active: true,
            },
        });
    }
    console.log(`   ✅ Đã tạo ${TAX_RATES_SEED.length} thuế suất\n`);

    // ==================== Summary ====================
    console.log('─'.repeat(50));
    console.log('🎉 Seed hoàn tất!');
    console.log('─'.repeat(50));

    const accountCount = await prisma.account.count();
    const taxRateCount = await prisma.taxRate.count();

    console.log(`📊 Tài khoản kế toán: ${accountCount}`);
    console.log(`💰 Thuế suất: ${taxRateCount}`);
    console.log('\n📝 Lưu ý: Tax Rules sẽ được tạo tự động khi tạo Farm mới\n');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error('❌ Lỗi khi seed:', e);
        await prisma.$disconnect();
        process.exit(1);
    });
