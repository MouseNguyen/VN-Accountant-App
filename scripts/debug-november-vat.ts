// scripts/debug-november-vat.ts
// Debug tại sao thuế đầu vào = 0

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Debug VAT tháng 11/2025...\n');

    const farm = await prisma.farm.findFirst();
    if (!farm) {
        console.log('❌ Không tìm thấy farm');
        return;
    }

    console.log(`📍 Farm: ${farm.name}`);

    const nov1 = new Date(2025, 10, 1);
    const nov30 = new Date(2025, 10, 30);

    // 1. Kiểm tra giao dịch EXPENSE
    console.log('\n=== GIAO DỊCH CHI (EXPENSE) ===');
    const expenses = await prisma.transaction.findMany({
        where: {
            farm_id: farm.id,
            trans_type: { in: ['EXPENSE', 'PURCHASE'] },
            trans_date: { gte: nov1, lte: nov30 },
            deleted_at: null,
        },
        include: {
            partner: true,
        },
    });

    console.log(`Tìm thấy ${expenses.length} giao dịch chi:`);
    for (const t of expenses) {
        console.log(`  - ${t.trans_number}: ${t.trans_type}`);
        console.log(`    Tiền hàng: ${Number(t.amount).toLocaleString('vi-VN')}đ`);
        console.log(`    VAT (vat_amount): ${Number(t.vat_amount).toLocaleString('vi-VN')}đ`);
        console.log(`    VAT (tax_amount): ${Number(t.tax_amount).toLocaleString('vi-VN')}đ`);
        console.log(`    Đối tác: ${t.partner?.name || 'KHÔNG CÓ'}`);
        console.log(`    MST: ${t.partner?.tax_code || 'KHÔNG CÓ'}`);
        console.log('');
    }

    // 2. Kiểm tra giao dịch INCOME
    console.log('\n=== GIAO DỊCH THU (INCOME) ===');
    const incomes = await prisma.transaction.findMany({
        where: {
            farm_id: farm.id,
            trans_type: { in: ['INCOME', 'SALE'] },
            trans_date: { gte: nov1, lte: nov30 },
            deleted_at: null,
        },
        include: {
            partner: true,
        },
    });

    console.log(`Tìm thấy ${incomes.length} giao dịch thu:`);
    for (const t of incomes) {
        console.log(`  - ${t.trans_number}: ${t.trans_type}`);
        console.log(`    Tiền hàng: ${Number(t.amount).toLocaleString('vi-VN')}đ`);
        console.log(`    VAT (vat_amount): ${Number(t.vat_amount).toLocaleString('vi-VN')}đ`);
        console.log(`    VAT (tax_amount): ${Number(t.tax_amount).toLocaleString('vi-VN')}đ`);
        console.log('');
    }

    // 3. Tính tổng VAT
    console.log('\n=== TỔNG KẾT ===');

    let inputVat = 0;
    let validInputCount = 0;
    for (const t of expenses) {
        const vat = Number(t.vat_amount) || Number(t.tax_amount) || 0;
        if (vat > 0) {
            // Kiểm tra có MST không
            if (t.partner?.tax_code) {
                inputVat += vat;
                validInputCount++;
                console.log(`✅ ${t.trans_number}: VAT ${vat.toLocaleString('vi-VN')}đ (có MST: ${t.partner.tax_code})`);
            } else {
                console.log(`⚠️ ${t.trans_number}: VAT ${vat.toLocaleString('vi-VN')}đ (KHÔNG CÓ MST - không khấu trừ)`);
            }
        }
    }

    let outputVat = 0;
    for (const t of incomes) {
        const vat = Number(t.vat_amount) || Number(t.tax_amount) || 0;
        outputVat += vat;
    }

    console.log(`\n📊 Kết quả:`);
    console.log(`   VAT đầu vào (khấu trừ): ${inputVat.toLocaleString('vi-VN')}đ (${validInputCount} HĐ)`);
    console.log(`   VAT đầu ra: ${outputVat.toLocaleString('vi-VN')}đ (${incomes.length} HĐ)`);
    console.log(`   Thuế phải nộp: ${(outputVat - inputVat).toLocaleString('vi-VN')}đ`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
