// scripts/seed-simple.ts
// Simple seed - just transactions

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 SIMPLE SEED...\n');

    const farm = await prisma.farm.findFirst();
    if (!farm) {
        console.log('❌ No farm!');
        return;
    }
    console.log(`📍 Farm: ${farm.name}`);

    // Delete old transactions
    await prisma.transaction.deleteMany({ where: { farm_id: farm.id } });
    console.log('   ✅ Deleted old transactions');

    // Get partners
    const allPartners = await prisma.partner.findMany({ where: { farm_id: farm.id } });
    console.log(`   Found ${allPartners.length} partners`);

    // Create transactions with correct types for reports:
    // Reports use INCOME for sales revenue, EXPENSE for purchases
    // SALE/PURCHASE are used for inventory tracking only
    const now = new Date();
    const transactions = [
        // INCOME = Doanh thu bán hàng
        { num: 'BH-001', type: 'INCOME', amount: 2500000, vat: 250000, method: 'BANK_TRANSFER', desc: 'Bán gạo', status: 'PAID' },
        { num: 'BH-002', type: 'INCOME', amount: 800000, vat: 80000, method: 'CASH', desc: 'Bán rau', status: 'PAID' },
        { num: 'BH-003', type: 'INCOME', amount: 1200000, vat: 120000, method: 'BANK_TRANSFER', desc: 'Bán cà chua', status: 'PENDING' }, // Công nợ
        { num: 'BH-004', type: 'INCOME', amount: 3000000, vat: 300000, method: 'BANK_TRANSFER', desc: 'Bán hàng Coopmart', status: 'PARTIAL', paid: 1000000 }, // Công nợ partial
        // EXPENSE = Mua hàng
        { num: 'MH-001', type: 'EXPENSE', amount: 3500000, vat: 350000, method: 'BANK_TRANSFER', desc: 'Mua phân bón', status: 'PAID' },
        { num: 'MH-002', type: 'EXPENSE', amount: 850000, vat: 85000, method: 'CASH', desc: 'Mua thuốc', status: 'PAID' },
        { num: 'MH-003', type: 'EXPENSE', amount: 25000000, vat: 2500000, method: 'CASH', desc: '⚠️ Mua xăng - CASH>=20M', status: 'PENDING' }, // Công nợ
        { num: 'MH-004', type: 'EXPENSE', amount: 5000000, vat: 500000, method: 'BANK_TRANSFER', desc: 'Mua vật tư', status: 'PARTIAL', paid: 2000000 }, // Công nợ partial
        // CASH_IN/CASH_OUT for Thu Chi report
        { num: 'TT-001', type: 'CASH_IN', amount: 5000000, vat: 0, method: 'BANK_TRANSFER', desc: 'Thu tiền', status: 'PAID' },
        { num: 'TT-002', type: 'CASH_IN', amount: 2000000, vat: 0, method: 'CASH', desc: 'Thu tiền mặt', status: 'PAID' },
        { num: 'CT-001', type: 'CASH_OUT', amount: 2000000, vat: 0, method: 'CASH', desc: 'Chi lương', status: 'PAID' },
        { num: 'CT-002', type: 'CASH_OUT', amount: 1500000, vat: 0, method: 'BANK_TRANSFER', desc: 'Trả nợ', status: 'PAID' },
    ];

    for (const t of transactions) {
        const total = t.amount + t.vat;
        const paidAmount = t.status === 'PAID' ? total : (t.paid || 0);

        await prisma.transaction.create({
            data: {
                farm_id: farm.id,
                trans_number: t.num,
                trans_type: t.type as any,
                trans_date: now,
                amount: t.amount,
                subtotal: t.amount,
                vat_amount: t.vat,
                tax_amount: t.vat,
                total_amount: total,
                payment_method: t.method as any,
                payment_status: t.status as any,
                paid_amount: paidAmount,
                description: t.desc,
            }
        });
    }
    console.log(`   ✅ Created ${transactions.length} transactions`);

    // Summary
    const count = await prisma.transaction.count({ where: { farm_id: farm.id } });
    const incomeCount = await prisma.transaction.count({ where: { farm_id: farm.id, trans_type: 'INCOME' } });
    const expenseCount = await prisma.transaction.count({ where: { farm_id: farm.id, trans_type: 'EXPENSE' } });
    const cashInCount = await prisma.transaction.count({ where: { farm_id: farm.id, trans_type: 'CASH_IN' } });
    const cashOutCount = await prisma.transaction.count({ where: { farm_id: farm.id, trans_type: 'CASH_OUT' } });
    const pendingCount = await prisma.transaction.count({ where: { farm_id: farm.id, payment_status: { in: ['PENDING', 'PARTIAL'] } } });

    console.log('\n✅ DONE!');
    console.log(`   Total: ${count}`);
    console.log(`   INCOME: ${incomeCount}, EXPENSE: ${expenseCount}`);
    console.log(`   CASH_IN: ${cashInCount}, CASH_OUT: ${cashOutCount}`);
    console.log(`   Công nợ (PENDING/PARTIAL): ${pendingCount}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
