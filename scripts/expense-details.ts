const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient();

    try {
        console.log('=== CHI PHÍ EXPENSE DETAILS ===\n');

        const expenses = await prisma.transaction.findMany({
            where: {
                trans_type: 'EXPENSE',
                deleted_at: null
            },
            select: {
                code: true,
                description: true,
                total_amount: true,
                trans_date: true,
                partner: { select: { name: true } }
            },
            orderBy: { trans_date: 'asc' }
        });

        expenses.forEach(t => {
            console.log('-----------------------------------');
            console.log(`Mã: ${t.code}`);
            console.log(`Ngày: ${t.trans_date.toISOString().split('T')[0]}`);
            console.log(`Số tiền: ${Number(t.total_amount).toLocaleString()} đ`);
            console.log(`Mô tả: ${t.description || '(không có mô tả)'}`);
            console.log(`Đối tác: ${t.partner?.name || '(không có)'}`);
        });

        console.log('\n=== PHÂN LOẠI ===');

        const cpTransactions = expenses.filter(t => t.code.startsWith('CP-'));
        const pcTransactions = expenses.filter(t => t.code.startsWith('PC-'));

        console.log('\nCP-* = Chi phí hoạt động (Operating Expenses):');
        cpTransactions.forEach(t => {
            console.log(`  ${t.code}: ${Number(t.total_amount).toLocaleString()} đ - ${t.description || 'Chi phí chung'}`);
        });
        const cpTotal = cpTransactions.reduce((sum, t) => sum + Number(t.total_amount), 0);
        console.log(`  TỔNG: ${cpTotal.toLocaleString()} đ`);

        console.log('\nPC-* = Thanh toán công nợ (AP Payments):');
        pcTransactions.forEach(t => {
            console.log(`  ${t.code}: ${Number(t.total_amount).toLocaleString()} đ - ${t.description || t.partner?.name || '...'}`);
        });
        const pcTotal = pcTransactions.reduce((sum, t) => sum + Number(t.total_amount), 0);
        console.log(`  TỔNG: ${pcTotal.toLocaleString()} đ`);

    } finally {
        await prisma.$disconnect();
    }
}

main();
