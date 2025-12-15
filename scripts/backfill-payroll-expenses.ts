// scripts/backfill-payroll-expenses.ts
// Backfill EXPENSE transactions for existing payroll payments

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     BACKFILL PAYROLL EXPENSE TRANSACTIONS                    ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // 1. Get all payroll payments
    const payments = await prisma.payrollPayment.findMany({
        include: {
            payroll: {
                select: {
                    id: true,
                    code: true,
                    period_start: true,
                    farm_id: true,
                }
            }
        },
        orderBy: { payment_date: 'asc' },
    });

    console.log(`Found ${payments.length} payroll payments\n`);

    if (payments.length === 0) {
        console.log('No payments to backfill.');
        return;
    }

    // 2. Check which ones already have transactions
    let created = 0;
    let skipped = 0;

    for (const payment of payments) {
        const payroll = payment.payroll;

        // Check if transaction already exists for this payment
        const existingTrans = await prisma.transaction.findFirst({
            where: {
                farm_id: payroll.farm_id,
                code: { startsWith: `LUONG-${payroll.code}` },
                total_amount: payment.amount,
            }
        });

        if (existingTrans) {
            console.log(`⏭️  Skip: LUONG-${payroll.code} - ${Number(payment.amount).toLocaleString()}đ (already exists)`);
            skipped++;
            continue;
        }

        // Get payment count for this payroll (for unique code)
        const paymentIndex = await prisma.payrollPayment.count({
            where: {
                payroll_id: payroll.id,
                payment_date: { lte: payment.payment_date },
            }
        });

        const periodStart = new Date(payroll.period_start);
        const monthYear = `${periodStart.getMonth() + 1}/${periodStart.getFullYear()}`;
        const transCode = `LUONG-${payroll.code}-${paymentIndex}`;

        // Create the transaction
        await prisma.transaction.create({
            data: {
                farm_id: payroll.farm_id,
                trans_number: transCode,
                code: transCode,
                trans_type: 'EXPENSE',
                trans_date: payment.payment_date,
                amount: payment.amount,
                total_amount: payment.amount,
                paid_amount: payment.amount,
                payment_status: 'PAID',
                payment_method: payment.payment_method,
                description: `Chi lương tháng ${monthYear} - ${payroll.code}`,
                notes: payment.note || undefined,
                items: {
                    create: [{
                        description: `Chi lương nhân viên tháng ${monthYear}`,
                        quantity: 1,
                        unit: 'kỳ',
                        unit_price: payment.amount,
                        line_total: payment.amount,
                    }]
                }
            }
        });

        console.log(`✅ Created: ${transCode} - ${Number(payment.amount).toLocaleString()}đ`);
        created++;
    }

    console.log('\n════════════════════════════════════════════════════════════════');
    console.log(`✅ Created: ${created} transactions`);
    console.log(`⏭️  Skipped: ${skipped} (already exist)`);
    console.log('════════════════════════════════════════════════════════════════\n');

    // 3. Verify by checking total expenses
    const totalExpenses = await prisma.transaction.aggregate({
        where: {
            trans_type: 'EXPENSE',
            deleted_at: null,
        },
        _sum: { total_amount: true },
        _count: true,
    });

    console.log('Current EXPENSE totals:');
    console.log(`  Count: ${totalExpenses._count}`);
    console.log(`  Total: ${Number(totalExpenses._sum.total_amount || 0).toLocaleString()}đ`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
