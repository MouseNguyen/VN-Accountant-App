// scripts/seed-ap-test-data.ts
// Script to seed AP test data for testing

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding AP test data...\n');

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

    // Clean up previous AP data
    await prisma.aPPaymentAllocation.deleteMany({ where: { farm_id: farm.id } });
    await prisma.aPTransaction.deleteMany({ where: { farm_id: farm.id } });
    console.log('🧹 Cleaned up previous AP data\n');

    // Create test vendors
    const vendors = [
        {
            code: 'NCC001',
            name: 'Siêu thị CoopMart',
            phone: '0909111222',
            email: 'coopmart@example.com',
            partner_type: 'VENDOR' as const,
            credit_limit: 100_000_000, // 100 triệu
            payment_term_days: 30,
        },
        {
            code: 'NCC002',
            name: 'Chợ Bến Thành',
            phone: '0909333444',
            partner_type: 'VENDOR' as const,
            credit_limit: 50_000_000, // 50 triệu
            payment_term_days: 15,
        },
        {
            code: 'NCC003',
            name: 'Công ty CP Vật tư Nông nghiệp',
            phone: '0909555666',
            partner_type: 'VENDOR' as const,
            credit_limit: 200_000_000, // 200 triệu
            payment_term_days: 45,
        },
    ];

    const createdVendors = [];
    for (const v of vendors) {
        const existing = await prisma.partner.findFirst({
            where: { farm_id: farm.id, code: v.code },
        });
        if (existing) {
            await prisma.partner.update({
                where: { id: existing.id },
                data: { ...v, balance: 0 },
            });
            createdVendors.push(existing);
            console.log(`📝 Updated vendor: ${v.name}`);
        } else {
            const created = await prisma.partner.create({
                data: { ...v, farm_id: farm.id, balance: 0 },
            });
            createdVendors.push(created);
            console.log(`➕ Created vendor: ${v.name}`);
        }
    }

    console.log(`\n✅ ${createdVendors.length} vendors ready\n`);

    // Create AP Transactions (Invoices)
    const today = new Date();
    const generateCode = (prefix: string, index: number) =>
        `${prefix}${today.toISOString().slice(2, 10).replace(/-/g, '')}-${String(index).padStart(3, '0')}`;

    const apTransactions = [
        // Vendor 1 - CoopMart (Overdue)
        {
            vendor_id: createdVendors[0].id,
            code: generateCode('AP', 1),
            type: 'INVOICE' as const,
            amount: 25_000_000,
            trans_date: new Date(today.getTime() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
            due_date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000), // Overdue 10 days
            days_overdue: 10,
            status: 'OVERDUE' as const,
            description: 'Mua hàng tháng 11 - CoopMart',
        },
        {
            vendor_id: createdVendors[0].id,
            code: generateCode('AP', 2),
            type: 'INVOICE' as const,
            amount: 18_000_000,
            trans_date: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 days ago  
            due_date: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000), // Due in 15 days
            days_overdue: 0,
            status: 'UNPAID' as const,
            description: 'Mua hàng tháng 12 - CoopMart',
        },

        // Vendor 2 - Chợ Bến Thành (Mixed)
        {
            vendor_id: createdVendors[1].id,
            code: generateCode('AP', 3),
            type: 'INVOICE' as const,
            amount: 8_500_000,
            trans_date: new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
            due_date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000), // Overdue 10 days
            days_overdue: 10,
            status: 'OVERDUE' as const,
            description: 'Mua rau củ quả - Chợ Bến Thành',
        },
        {
            vendor_id: createdVendors[1].id,
            code: generateCode('AP', 4),
            type: 'INVOICE' as const,
            amount: 6_200_000,
            trans_date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
            due_date: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000), // Due in 10 days
            days_overdue: 0,
            status: 'UNPAID' as const,
            description: 'Mua trái cây - Chợ Bến Thành',
        },

        // Vendor 3 - Công ty Vật tư (Partially paid)
        {
            vendor_id: createdVendors[2].id,
            code: generateCode('AP', 5),
            type: 'INVOICE' as const,
            amount: 45_000_000,
            paid_amount: 20_000_000,
            balance: 25_000_000,
            trans_date: new Date(today.getTime() - 50 * 24 * 60 * 60 * 1000), // 50 days ago
            due_date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000), // Overdue 5 days
            days_overdue: 5,
            status: 'PARTIAL' as const,
            description: 'Mua phân bón - Công ty Vật tư NN',
        },
        {
            vendor_id: createdVendors[2].id,
            code: generateCode('AP', 6),
            type: 'INVOICE' as const,
            amount: 32_000_000,
            trans_date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
            due_date: new Date(today.getTime() + 35 * 24 * 60 * 60 * 1000), // Due in 35 days
            days_overdue: 0,
            status: 'UNPAID' as const,
            description: 'Mua thuốc BVTV - Công ty Vật tư NN',
        },
    ];

    let totalBalance = 0;
    for (const ap of apTransactions) {
        const balance = ap.balance ?? ap.amount;
        const paidAmount = ap.paid_amount ?? 0;

        await prisma.aPTransaction.create({
            data: {
                farm_id: farm.id,
                vendor_id: ap.vendor_id,
                code: ap.code,
                type: ap.type,
                amount: ap.amount,
                paid_amount: paidAmount,
                balance: balance,
                trans_date: ap.trans_date,
                due_date: ap.due_date,
                days_overdue: ap.days_overdue,
                status: ap.status,
                description: ap.description,
            },
        });

        // Update vendor balance (negative for payables)
        await prisma.partner.update({
            where: { id: ap.vendor_id },
            data: { balance: { decrement: balance } },
        });

        totalBalance += balance;
        console.log(`📄 Created AP: ${ap.code} - ${new Intl.NumberFormat('vi-VN').format(ap.amount)}đ (${ap.status})`);
    }

    console.log(`\n✅ Created ${apTransactions.length} AP transactions`);
    console.log(`💰 Total payable: ${new Intl.NumberFormat('vi-VN').format(totalBalance)}đ\n`);

    // Summary
    console.log('='.repeat(50));
    console.log('📊 TEST DATA SUMMARY');
    console.log('='.repeat(50));
    console.log('\n🏢 VENDORS:');
    for (const v of vendors) {
        const partner = await prisma.partner.findFirst({
            where: { farm_id: farm.id, code: v.code },
        });
        console.log(`  • ${v.name}: Balance ${new Intl.NumberFormat('vi-VN').format(Number(partner?.balance || 0))}đ`);
    }

    // Count by status
    const stats = await prisma.aPTransaction.groupBy({
        by: ['status'],
        where: { farm_id: farm.id },
        _count: true,
        _sum: { balance: true },
    });

    console.log('\n📈 AP BY STATUS:');
    for (const s of stats) {
        console.log(`  • ${s.status}: ${s._count} items, ${new Intl.NumberFormat('vi-VN').format(Number(s._sum.balance || 0))}đ`);
    }

    console.log('\n✅ Test data seeded successfully!');
    console.log('\n🔗 Test URLs:');
    console.log('  • AP List: http://localhost:3000/cong-no/phai-tra');
    console.log('  • Make Payment: http://localhost:3000/cong-no/phai-tra/tra-tien');
    console.log('  • Payment Schedule: http://localhost:3000/cong-no/phai-tra/lich-thanh-toan');
    console.log('  • AP Summary API: http://localhost:3000/api/ap/summary');
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
