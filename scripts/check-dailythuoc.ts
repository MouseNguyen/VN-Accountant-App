const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient();

    try {
        console.log('=== AP TRANSACTIONS FOR ĐẠI LÝ THUỐC BVTV ===\n');

        // Find vendor
        const vendor = await prisma.partner.findFirst({
            where: { name: { contains: 'Thuốc BVTV' } }
        });

        if (!vendor) {
            console.log('Vendor not found!');
            return;
        }

        console.log('Vendor:', vendor.name);
        console.log('Vendor ID:', vendor.id);

        // Get all AP transactions for this vendor
        const aps = await prisma.aPTransaction.findMany({
            where: { vendor_id: vendor.id },
            orderBy: { trans_date: 'asc' }
        });

        console.log('\n=== AP RECORDS ===');
        aps.forEach(ap => {
            console.log('---');
            console.log(`Code: ${ap.code}`);
            console.log(`Type: ${ap.type}`);
            console.log(`Amount: ${Number(ap.amount).toLocaleString()} đ`);
            console.log(`Paid: ${Number(ap.paid_amount).toLocaleString()} đ`);
            console.log(`Balance: ${Number(ap.balance).toLocaleString()} đ`);
            console.log(`Status: ${ap.status}`);
        });

        // Sum up
        const totalBalance = aps
            .filter(ap => ap.type === 'INVOICE')
            .reduce((sum, ap) => sum + Number(ap.balance), 0);

        console.log('\n=== SUMMARY ===');
        console.log(`Total AP Balance: ${totalBalance.toLocaleString()} đ`);

        // Check payments
        const payments = await prisma.transaction.findMany({
            where: {
                partner_id: vendor.id,
                trans_type: 'EXPENSE',
                code: { startsWith: 'PC-' }
            }
        });

        console.log('\n=== PAYMENT TRANSACTIONS ===');
        let totalPaid = 0;
        payments.forEach(p => {
            const amt = Number(p.total_amount);
            totalPaid += amt;
            console.log(`${p.code}: ${amt.toLocaleString()} đ - ${p.trans_date.toISOString().split('T')[0]}`);
        });
        console.log(`Total Payments: ${totalPaid.toLocaleString()} đ`);

    } finally {
        await prisma.$disconnect();
    }
}

main();
