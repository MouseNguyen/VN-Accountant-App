// scripts/seed-ar-test-data.ts
// Script to seed AR test data for testing

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding AR test data...\n');

    // Get the farm for test@test.com user
    const user = await prisma.user.findFirst({
        where: { email: 'test@test.com' },
        include: { farm: true },
    });

    if (!user || !user.farm) {
        console.log('❌ No test user or farm found. User: test@test.com');
        return;
    }

    const farm = user.farm;
    console.log(`✅ Using farm: ${farm.name} (${farm.id})`);
    console.log(`👤 User: ${user.email}\n`);

    // Clean up previous AR data
    await prisma.aRPaymentAllocation.deleteMany({ where: { farm_id: farm.id } });
    await prisma.aRTransaction.deleteMany({ where: { farm_id: farm.id } });
    console.log('🧹 Cleaned up previous AR data\n');

    // Create test customers
    const customers = [
        {
            code: 'KH001',
            name: 'Công ty ABC',
            phone: '0901234567',
            email: 'abc@example.com',
            partner_type: 'CUSTOMER' as const,
            credit_limit: 50_000_000, // 50 triệu
            payment_term_days: 30,
        },
        {
            code: 'KH002',
            name: 'Anh Nguyễn Văn A',
            phone: '0912345678',
            partner_type: 'CUSTOMER' as const,
            credit_limit: 20_000_000, // 20 triệu
            payment_term_days: 15,
        },
        {
            code: 'KH003',
            name: 'Chị Trần Thị B',
            phone: '0923456789',
            partner_type: 'CUSTOMER' as const,
            credit_limit: 0, // No credit limit
            payment_term_days: 7,
        },
    ];

    const createdCustomers = [];
    for (const c of customers) {
        const existing = await prisma.partner.findFirst({
            where: { farm_id: farm.id, code: c.code },
        });
        if (existing) {
            await prisma.partner.update({
                where: { id: existing.id },
                data: { ...c, balance: 0 },
            });
            createdCustomers.push(existing);
            console.log(`📝 Updated customer: ${c.name}`);
        } else {
            const created = await prisma.partner.create({
                data: { ...c, farm_id: farm.id, balance: 0 },
            });
            createdCustomers.push(created);
            console.log(`➕ Created customer: ${c.name}`);
        }
    }

    console.log(`\n✅ ${createdCustomers.length} customers ready\n`);

    // Create AR Transactions (Invoices)
    const today = new Date();
    const generateCode = (prefix: string, index: number) =>
        `${prefix}${today.toISOString().slice(2, 10).replace(/-/g, '')}-${String(index).padStart(3, '0')}`;

    const arTransactions = [
        // Customer 1 - ABC Company
        {
            customer_id: createdCustomers[0].id,
            code: generateCode('AR', 1),
            type: 'INVOICE' as const,
            amount: 15_000_000,
            trans_date: new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
            due_date: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000), // Overdue 15 days
            days_overdue: 15,
            status: 'OVERDUE' as const,
        },
        {
            customer_id: createdCustomers[0].id,
            code: generateCode('AR', 2),
            type: 'INVOICE' as const,
            amount: 8_000_000,
            trans_date: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
            due_date: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000), // Due in 10 days
            days_overdue: 0,
            status: 'UNPAID' as const,
        },
        {
            customer_id: createdCustomers[0].id,
            code: generateCode('AR', 3),
            type: 'INVOICE' as const,
            amount: 12_000_000,
            trans_date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
            due_date: new Date(today.getTime() + 25 * 24 * 60 * 60 * 1000), // Due in 25 days
            days_overdue: 0,
            status: 'UNPAID' as const,
        },

        // Customer 2 - Anh Nguyễn Văn A
        {
            customer_id: createdCustomers[1].id,
            code: generateCode('AR', 4),
            type: 'INVOICE' as const,
            amount: 5_000_000,
            trans_date: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
            due_date: new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000), // Overdue 45 days
            days_overdue: 45,
            status: 'OVERDUE' as const,
        },
        {
            customer_id: createdCustomers[1].id,
            code: generateCode('AR', 5),
            type: 'INVOICE' as const,
            amount: 3_500_000,
            trans_date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
            due_date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000), // Due in 5 days
            days_overdue: 0,
            status: 'UNPAID' as const,
        },

        // Customer 3 - Chị Trần Thị B (partially paid)
        {
            customer_id: createdCustomers[2].id,
            code: generateCode('AR', 6),
            type: 'INVOICE' as const,
            amount: 10_000_000,
            paid_amount: 4_000_000,
            balance: 6_000_000,
            trans_date: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            due_date: new Date(today.getTime() - 23 * 24 * 60 * 60 * 1000), // Overdue 23 days
            days_overdue: 23,
            status: 'PARTIAL' as const,
        },
    ];

    let totalBalance = 0;
    for (const ar of arTransactions) {
        const balance = ar.balance ?? ar.amount;
        const paidAmount = ar.paid_amount ?? 0;

        await prisma.aRTransaction.create({
            data: {
                farm_id: farm.id,
                customer_id: ar.customer_id,
                code: ar.code,
                type: ar.type,
                amount: ar.amount,
                paid_amount: paidAmount,
                balance: balance,
                trans_date: ar.trans_date,
                due_date: ar.due_date,
                days_overdue: ar.days_overdue,
                status: ar.status,
                description: `Hóa đơn bán hàng - ${ar.code}`,
            },
        });

        // Update customer balance
        await prisma.partner.update({
            where: { id: ar.customer_id },
            data: { balance: { increment: balance } },
        });

        totalBalance += balance;
        console.log(`📄 Created AR: ${ar.code} - ${new Intl.NumberFormat('vi-VN').format(ar.amount)}đ (${ar.status})`);
    }

    console.log(`\n✅ Created ${arTransactions.length} AR transactions`);
    console.log(`💰 Total receivable: ${new Intl.NumberFormat('vi-VN').format(totalBalance)}đ\n`);

    // Summary
    console.log('='.repeat(50));
    console.log('📊 TEST DATA SUMMARY');
    console.log('='.repeat(50));
    console.log('\n👥 CUSTOMERS:');
    for (const c of customers) {
        const partner = await prisma.partner.findFirst({
            where: { farm_id: farm.id, code: c.code },
        });
        console.log(`  • ${c.name}: Balance ${new Intl.NumberFormat('vi-VN').format(Number(partner?.balance || 0))}đ, Credit Limit ${new Intl.NumberFormat('vi-VN').format(c.credit_limit)}đ`);
    }

    // Count by status
    const stats = await prisma.aRTransaction.groupBy({
        by: ['status'],
        where: { farm_id: farm.id },
        _count: true,
        _sum: { balance: true },
    });

    console.log('\n📈 AR BY STATUS:');
    for (const s of stats) {
        console.log(`  • ${s.status}: ${s._count} items, ${new Intl.NumberFormat('vi-VN').format(Number(s._sum.balance || 0))}đ`);
    }

    console.log('\n✅ Test data seeded successfully!');
    console.log('\n🔗 Test URLs:');
    console.log('  • AR List: http://localhost:3000/cong-no/phai-thu');
    console.log('  • Collect Payment: http://localhost:3000/cong-no/phai-thu/thu-tien');
    console.log('  • Aging Report: http://localhost:3000/bao-cao/cong-no');
    console.log('  • AR Summary API: http://localhost:3000/api/ar/summary');
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
