// scripts/debug-reports.ts
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
    const farmId = 'test-farm-001';

    console.log('=== TRANSACTION TYPES IN DB ===');
    const types = await p.transaction.groupBy({
        by: ['trans_type'],
        where: { farm_id: farmId },
        _count: true,
        _sum: { total_amount: true },
    });
    console.table(types.map(t => ({
        type: t.trans_type,
        count: t._count,
        total: Number(t._sum.total_amount),
    })));

    console.log('\n=== TRANSACTION DATES ===');
    const dates = await p.transaction.groupBy({
        by: ['trans_date'],
        where: { farm_id: farmId },
        _count: true,
    });
    console.log('Date range:', dates.map(d => d.trans_date.toISOString().split('T')[0]).sort());

    console.log('\n=== CASH TRANSACTIONS (for Sổ quỹ) ===');
    const cashTrans = await p.transaction.findMany({
        where: {
            farm_id: farmId,
            payment_method: 'CASH',
        },
        select: { trans_number: true, trans_type: true, payment_method: true, total_amount: true },
    });
    console.table(cashTrans.map(t => ({
        code: t.trans_number,
        type: t.trans_type,
        method: t.payment_method,
        amount: Number(t.total_amount),
    })));

    console.log('\n=== BANK TRANSFER TRANSACTIONS (for Sổ NH) ===');
    const bankTrans = await p.transaction.findMany({
        where: {
            farm_id: farmId,
            payment_method: 'BANK_TRANSFER',
        },
        select: { trans_number: true, trans_type: true, payment_method: true, total_amount: true },
    });
    console.table(bankTrans.map(t => ({
        code: t.trans_number,
        type: t.trans_type,
        method: t.payment_method,
        amount: Number(t.total_amount),
    })));

    console.log('\n=== ISSUE CHECK: Reports query for INCOME/EXPENSE but seed uses SALE/PURCHASE? ===');
    const incomeCount = await p.transaction.count({ where: { farm_id: farmId, trans_type: 'INCOME' } });
    const expenseCount = await p.transaction.count({ where: { farm_id: farmId, trans_type: 'EXPENSE' } });
    const saleCount = await p.transaction.count({ where: { farm_id: farmId, trans_type: 'SALE' } });
    const purchaseCount = await p.transaction.count({ where: { farm_id: farmId, trans_type: 'PURCHASE' } });

    console.log('INCOME transactions:', incomeCount);
    console.log('EXPENSE transactions:', expenseCount);
    console.log('SALE transactions:', saleCount);
    console.log('PURCHASE transactions:', purchaseCount);

    if (incomeCount === 0 && saleCount > 0) {
        console.log('\n⚠️  PROBLEM FOUND: Reports query for INCOME but seed creates SALE!');
    }
    if (expenseCount > 0 || purchaseCount > 0) {
        console.log('EXPENSE exists, PURCHASE exists - need to check if reports handle both');
    }
}

main().catch(console.error).finally(() => p.$disconnect());
