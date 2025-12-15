// scripts/verify-aging-report.ts
// Verify aging report data

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     VERIFY AGING REPORT DATA                                 ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const farmId = '6a1cdfc3-7a55-43a7-9e96-21eb7be5ac7a';
    const today = new Date();

    // Get all INCOME transactions with outstanding balance
    const transactions = await prisma.transaction.findMany({
        where: {
            farm_id: farmId,
            trans_type: 'INCOME',
            deleted_at: null,
            payment_status: { in: ['PENDING', 'PARTIAL', 'UNPAID'] },
        },
        include: {
            partner: { select: { code: true, name: true, payment_term_days: true } },
        },
        orderBy: { trans_date: 'desc' },
    });

    console.log(`Found ${transactions.length} outstanding INCOME transactions\n`);

    let totalReceivable = 0;
    const customerTotals = new Map<string, { name: string, code: string, amount: number, overdue: boolean }>();

    for (const t of transactions) {
        const outstanding = Number(t.total_amount) - Number(t.paid_amount);
        if (outstanding <= 0) continue;

        // Calculate due date
        const paymentTermDays = t.partner?.payment_term_days || 30;
        const dueDate = new Date(t.trans_date);
        dueDate.setDate(dueDate.getDate() + paymentTermDays);

        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const isOverdue = daysOverdue > 0;

        console.log(`${t.code || t.trans_number}:`);
        console.log(`  Partner: ${t.partner?.name || t.partner_name || 'N/A'}`);
        console.log(`  Trans Date: ${t.trans_date.toISOString().split('T')[0]}`);
        console.log(`  Due Date: ${dueDate.toISOString().split('T')[0]}`);
        console.log(`  Outstanding: ${outstanding.toLocaleString()}đ`);
        console.log(`  Days Overdue: ${daysOverdue > 0 ? daysOverdue : 'Not due yet'}`);
        console.log('');

        totalReceivable += outstanding;

        // Group by customer
        const customerId = t.partner_id || 'unknown';
        const current = customerTotals.get(customerId) || {
            name: t.partner?.name || t.partner_name || 'Unknown',
            code: t.partner?.code || 'N/A',
            amount: 0,
            overdue: false,
        };
        current.amount += outstanding;
        if (isOverdue) current.overdue = true;
        customerTotals.set(customerId, current);
    }

    console.log('════════════════════════════════════════════════════════════════');
    console.log(`\n📊 SUMMARY:`);
    console.log(`Total Receivable: ${totalReceivable.toLocaleString()}đ\n`);

    console.log('📋 BY CUSTOMER:');
    for (const [id, data] of customerTotals) {
        const status = data.overdue ? '🟠 Overdue' : '🟢 OK';
        console.log(`  ${data.code} - ${data.name}: ${data.amount.toLocaleString()}đ ${status}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
