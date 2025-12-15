// scripts/create-unpaid-expense.ts
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
    const farmId = '6a1cdfc3-7a55-43a7-9e96-21eb7be5ac7a';
    const user = await p.user.findFirst({ where: { email: 'test@test.com' } });

    // Find a vendor
    const vendor = await p.partner.findFirst({
        where: { farm_id: farmId, partner_type: 'VENDOR' }
    });

    if (!vendor) {
        console.log('No vendor found');
        return;
    }

    // Create unpaid expense
    const trans = await p.transaction.create({
        data: {
            farm_id: farmId,
            trans_number: 'HD' + Date.now().toString().slice(-6),
            trans_type: 'EXPENSE',
            trans_date: new Date(),
            partner_id: vendor.id,
            amount: 5000000,
            total_amount: 5000000,
            paid_amount: 0,
            payment_status: 'UNPAID',
            description: 'Mua vật tư - CHƯA THANH TOÁN (test)',
            created_by: user!.id,
        }
    });

    console.log('✅ Created UNPAID expense:');
    console.log('  Amount:', Number(trans.amount).toLocaleString() + 'đ');
    console.log('  Status:', trans.payment_status);
    console.log('  Partner:', vendor.name);
}

main().finally(() => p.$disconnect());
