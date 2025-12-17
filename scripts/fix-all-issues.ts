// scripts/fix-all-issues.ts
// Fix all data integrity issues at once
// Run: npx tsx scripts/fix-all-issues.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Fix {
    category: string;
    record: string;
    field: string;
    old_value: string | number;
    new_value: string | number;
    status: 'FIXED' | 'ERROR';
    error?: string;
}

const fixes: Fix[] = [];

async function main() {
    console.log('🔧 LABA ERP - FIX ALL DATA ISSUES');
    console.log('==================================\n');

    try {
        // FIX 1: Partner Balance Sync
        console.log('🔧 FIX 1: Partner Balance Sync');
        console.log('-'.repeat(40));

        const partners = await prisma.partner.findMany({
            where: { deleted_at: null },
            include: {
                transactions: {
                    where: { deleted_at: null },
                    select: { trans_type: true, total_amount: true, paid_amount: true }
                }
            }
        });

        for (const partner of partners) {
            let calculated = 0;

            for (const t of partner.transactions) {
                const outstanding = Number(t.total_amount) - Number(t.paid_amount);

                // Only SALE for customers, PURCHASE for vendors
                if (['SALE', 'INCOME'].includes(t.trans_type) && partner.partner_type === 'CUSTOMER') {
                    calculated += outstanding;
                } else if (['PURCHASE'].includes(t.trans_type) && partner.partner_type === 'VENDOR') {
                    calculated += outstanding;
                }
            }

            const stored = Number(partner.balance);

            if (Math.abs(stored - calculated) > 1) {
                try {
                    await prisma.partner.update({
                        where: { id: partner.id },
                        data: { balance: calculated }
                    });

                    console.log(`✅ ${partner.name}: ${stored.toLocaleString()} → ${calculated.toLocaleString()}`);
                    fixes.push({
                        category: 'Partner Balance',
                        record: partner.name,
                        field: 'balance',
                        old_value: stored,
                        new_value: calculated,
                        status: 'FIXED'
                    });
                } catch (error) {
                    console.log(`❌ ${partner.name}: Failed - ${error}`);
                    fixes.push({
                        category: 'Partner Balance',
                        record: partner.name,
                        field: 'balance',
                        old_value: stored,
                        new_value: calculated,
                        status: 'ERROR',
                        error: String(error)
                    });
                }
            }
        }
        console.log();

        // FIX 2: Sync Transaction paid_amount FROM APTransaction
        console.log('🔧 FIX 2: Sync Transaction from APTransaction');
        console.log('-'.repeat(40));

        const apInvoices = await prisma.aPTransaction.findMany({
            where: { type: 'INVOICE', deleted_at: null }
        });

        for (const ap of apInvoices) {
            // Find corresponding Transaction by code pattern
            const transCode = ap.code.replace('AP-', '');
            const transaction = await prisma.transaction.findFirst({
                where: { code: transCode }
            });

            if (transaction) {
                const transPaid = Number(transaction.paid_amount);
                const apPaid = Number(ap.paid_amount);

                if (Math.abs(transPaid - apPaid) > 1) {
                    try {
                        await prisma.transaction.update({
                            where: { id: transaction.id },
                            data: {
                                paid_amount: apPaid,
                                payment_status: ap.status
                            }
                        });

                        console.log(`✅ ${transCode}: paid_amount ${transPaid.toLocaleString()} → ${apPaid.toLocaleString()}, status → ${ap.status}`);
                        fixes.push({
                            category: 'Transaction Sync',
                            record: transCode,
                            field: 'paid_amount',
                            old_value: transPaid,
                            new_value: apPaid,
                            status: 'FIXED'
                        });
                    } catch (error) {
                        console.log(`❌ ${transCode}: Failed - ${error}`);
                    }
                }
            }
        }
        console.log();

        // FIX 3: Sync Transaction paid_amount FROM ARTransaction
        console.log('🔧 FIX 3: Sync Transaction from ARTransaction');
        console.log('-'.repeat(40));

        const arInvoices = await prisma.aRTransaction.findMany({
            where: { type: 'INVOICE', deleted_at: null }
        });

        for (const ar of arInvoices) {
            // Find corresponding Transaction by code pattern
            const transCode = ar.code.replace('AR-', '');
            const transaction = await prisma.transaction.findFirst({
                where: { code: transCode }
            });

            if (transaction) {
                const transPaid = Number(transaction.paid_amount);
                const arPaid = Number(ar.paid_amount);

                if (Math.abs(transPaid - arPaid) > 1) {
                    try {
                        await prisma.transaction.update({
                            where: { id: transaction.id },
                            data: {
                                paid_amount: arPaid,
                                payment_status: ar.status
                            }
                        });

                        console.log(`✅ ${transCode}: paid_amount ${transPaid.toLocaleString()} → ${arPaid.toLocaleString()}, status → ${ar.status}`);
                        fixes.push({
                            category: 'Transaction Sync',
                            record: transCode,
                            field: 'paid_amount',
                            old_value: transPaid,
                            new_value: arPaid,
                            status: 'FIXED'
                        });
                    } catch (error) {
                        console.log(`❌ ${transCode}: Failed - ${error}`);
                    }
                }
            }
        }
        console.log();

        // SUMMARY
        console.log('='.repeat(60));
        console.log('📊 FIX SUMMARY');
        console.log('='.repeat(60));

        const fixed = fixes.filter(f => f.status === 'FIXED').length;
        const errors = fixes.filter(f => f.status === 'ERROR').length;

        console.log(`\n✅ Fixed: ${fixed}`);
        console.log(`❌ Errors: ${errors}`);
        console.log(`\nTotal: ${fixes.length}`);

        // Save report
        if (fixes.length > 0) {
            const reportPath = `./fix-report-${new Date().toISOString().split('T')[0]}.json`;
            require('fs').writeFileSync(reportPath, JSON.stringify({
                generated_at: new Date().toISOString(),
                summary: { fixed, errors, total: fixes.length },
                fixes
            }, null, 2));
            console.log(`\n📁 Report saved to: ${reportPath}`);
        }

        // Run integrity check again
        console.log('\n🔍 Running integrity check again...\n');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
