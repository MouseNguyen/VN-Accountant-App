const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient();

    try {
        console.log('=== SYNC TRANSACTION TABLE FROM AP TRANSACTION ===\n');

        // Get all AP invoices
        const apInvoices = await prisma.aPTransaction.findMany({
            where: { type: 'INVOICE' }
        });

        for (const ap of apInvoices) {
            // Find corresponding transaction by code pattern
            // AP-MH-2411-002 -> MH-2411-002
            const transCode = ap.code.replace('AP-', '');

            const transaction = await prisma.transaction.findFirst({
                where: { code: transCode }
            });

            if (transaction) {
                const transPaid = Number(transaction.paid_amount);
                const apPaid = Number(ap.paid_amount);

                if (transPaid !== apPaid) {
                    console.log(`Syncing ${transCode}:`);
                    console.log(`  Transaction.paid_amount: ${transPaid.toLocaleString()} -> ${apPaid.toLocaleString()}`);
                    console.log(`  AP status: ${ap.status}`);

                    // Update Transaction
                    await prisma.transaction.update({
                        where: { id: transaction.id },
                        data: {
                            paid_amount: ap.paid_amount,
                            payment_status: ap.status
                        }
                    });

                    console.log(`  ✅ Updated!`);
                } else {
                    console.log(`${transCode}: Already in sync ✓`);
                }
            } else {
                console.log(`${transCode}: Transaction not found (AP code: ${ap.code})`);
            }
        }

        console.log('\n=== VERIFICATION ===');
        const vendor = await prisma.partner.findFirst({
            where: { name: { contains: 'Thuốc BVTV' } }
        });

        if (vendor) {
            const transactions = await prisma.transaction.findMany({
                where: { partner_id: vendor.id, trans_type: 'PURCHASE' }
            });

            transactions.forEach(t => {
                console.log(`${t.code}: paid=${Number(t.paid_amount).toLocaleString()}, status=${t.payment_status}`);
            });
        }

    } finally {
        await prisma.$disconnect();
    }
}

main();
