// scripts/check-ar-ap.ts
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
    const farmId = 'test-farm-001';

    console.log('=== ARTransaction (Phải thu) ===');
    const arRows = await p.aRTransaction.findMany({
        where: { farm_id: farmId },
        take: 10,
        select: { code: true, type: true, amount: true, balance: true, status: true }
    });
    console.table(arRows.map(r => ({
        code: r.code,
        type: r.type,
        amount: Number(r.amount),
        balance: Number(r.balance),
        status: r.status
    })));

    console.log('\n=== APTransaction (Phải trả) ===');
    const apRows = await p.aPTransaction.findMany({
        where: { farm_id: farmId },
        take: 10,
        select: { code: true, type: true, amount: true, balance: true, status: true }
    });
    console.table(apRows.map(r => ({
        code: r.code,
        type: r.type,
        amount: Number(r.amount),
        balance: Number(r.balance),
        status: r.status
    })));

    console.log('\n=== Unpaid Transactions ===');
    const unpaid = await p.transaction.findMany({
        where: {
            farm_id: farmId,
            payment_status: { in: ['PENDING', 'PARTIAL', 'UNPAID'] }
        },
        select: { code: true, trans_type: true, total_amount: true, paid_amount: true, payment_status: true }
    });
    console.table(unpaid.map(t => ({
        code: t.code,
        type: t.trans_type,
        total: Number(t.total_amount),
        paid: Number(t.paid_amount),
        status: t.payment_status
    })));
}

main().catch(console.error).finally(() => p.$disconnect());
