const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient();

    try {
        console.log('=== TRANSACTION vs AP TRANSACTION SYNC CHECK ===\n');

        // Find PURCHASE transactions for Đại lý Thuốc BVTV
        const vendor = await prisma.partner.findFirst({
            where: { name: { contains: 'Thuốc BVTV' } }
        });

        if (!vendor) {
            console.log('Vendor not found!');
            return;
        }

        // Get PURCHASE transactions
        const transactions = await prisma.transaction.findMany({
            where: {
                partner_id: vendor.id,
                trans_type: 'PURCHASE',
                deleted_at: null
            }
        });

        console.log('=== TRANSACTION TABLE ===');
        transactions.forEach(t => {
            console.log('---');
            console.log(`Code: ${t.code}`);
            console.log(`Total: ${Number(t.total_amount).toLocaleString()} đ`);
            console.log(`Paid: ${Number(t.paid_amount).toLocaleString()} đ`);
            console.log(`Remaining: ${(Number(t.total_amount) - Number(t.paid_amount)).toLocaleString()} đ`);
            console.log(`Payment Status: ${t.payment_status}`);
        });

        // Get corresponding AP transactions
        console.log('\n=== AP TRANSACTION TABLE ===');
        const aps = await prisma.aPTransaction.findMany({
            where: {
                vendor_id: vendor.id,
                type: 'INVOICE'
            }
        });

        aps.forEach(ap => {
            console.log('---');
            console.log(`Code: ${ap.code}`);
            console.log(`Amount: ${Number(ap.amount).toLocaleString()} đ`);
            console.log(`Paid: ${Number(ap.paid_amount).toLocaleString()} đ`);
            console.log(`Balance: ${Number(ap.balance).toLocaleString()} đ`);
            console.log(`Status: ${ap.status}`);
        });

        console.log('\n=== DISCREPANCY ===');
        console.log('The Báo cáo Công nợ uses Transaction table, not APTransaction!');
        console.log('Transaction.paid_amount is NOT being updated when AP payments are made.');

    } finally {
        await prisma.$disconnect();
    }
}

main();
