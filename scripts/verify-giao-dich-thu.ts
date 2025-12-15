// scripts/verify-giao-dich-thu.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('\n=== VERIFY GIAO DỊCH (THU) NUMBERS ===\n');

    const farmId = '6a1cdfc3-7a55-43a7-9e96-21eb7be5ac7a';

    // Get all INCOME transactions
    const incomeTransactions = await prisma.transaction.findMany({
        where: {
            farm_id: farmId,
            trans_type: 'INCOME',
            deleted_at: null,
        },
        include: {
            partner: { select: { name: true } },
        },
        orderBy: { created_at: 'desc' },
    });

    console.log(`📥 Found ${incomeTransactions.length} INCOME transactions:\n`);

    let totalAmount = 0;
    let totalPaid = 0;

    incomeTransactions.forEach((t, i) => {
        const amount = Number(t.total_amount);
        const paid = Number(t.paid_amount);
        const balance = amount - paid;
        totalAmount += amount;
        totalPaid += paid;

        console.log(`${i + 1}. ${t.code || 'N/A'}`);
        console.log(`   Partner: ${t.partner?.name || 'N/A'}`);
        console.log(`   Total: ${amount.toLocaleString()}đ`);
        console.log(`   Paid: ${paid.toLocaleString()}đ`);
        console.log(`   Balance: ${balance.toLocaleString()}đ`);
        console.log(`   Status: ${t.payment_status}`);
        console.log('');
    });

    const laiRao = totalPaid - totalAmount; // If positive = profit, if negative = debt owed to us

    console.log('=== SUMMARY ===');
    console.log(`Tổng Thu (Total Amount): ${totalAmount.toLocaleString()}đ`);
    console.log(`Đã Nhận (Total Paid): ${totalPaid.toLocaleString()}đ`);
    console.log(`Lãi Ròng (Paid - Amount): ${laiRao.toLocaleString()}đ`);
    console.log(`Còn Phải Thu (Amount - Paid): ${(totalAmount - totalPaid).toLocaleString()}đ`);

    // Also check EXPENSE for comparison
    const expenseTransactions = await prisma.transaction.findMany({
        where: {
            farm_id: farmId,
            trans_type: 'EXPENSE',
            deleted_at: null,
        },
    });

    let expenseTotal = 0;
    let expensePaid = 0;
    expenseTransactions.forEach(t => {
        expenseTotal += Number(t.total_amount);
        expensePaid += Number(t.paid_amount);
    });

    console.log('\n=== EXPENSE FOR REFERENCE ===');
    console.log(`Tổng Chi: ${expenseTotal.toLocaleString()}đ`);
    console.log(`Đã Trả: ${expensePaid.toLocaleString()}đ`);
    console.log(`Còn Phải Trả: ${(expenseTotal - expensePaid).toLocaleString()}đ`);

    console.log('\n=== OVERALL ===');
    console.log(`Lãi = Thu - Chi = ${totalAmount.toLocaleString()} - ${expenseTotal.toLocaleString()} = ${(totalAmount - expenseTotal).toLocaleString()}đ`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
