// scripts/quick-integrity-check.ts
// Quick data integrity check for LABA ERP
// Run: npx tsx scripts/quick-integrity-check.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Issue {
    category: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    record_code?: string;
    field: string;
    expected: string | number;
    actual: string | number;
}

const issues: Issue[] = [];

function addIssue(issue: Issue) {
    issues.push(issue);
    const icon = issue.severity === 'CRITICAL' ? '🔴' :
        issue.severity === 'HIGH' ? '🟡' :
            issue.severity === 'MEDIUM' ? '🔵' : '⚪';
    console.log(`${icon} [${issue.severity}] ${issue.category}: ${issue.description}`);
}

async function main() {
    console.log('🔍 LABA ERP - QUICK DATA INTEGRITY CHECK');
    console.log('=========================================\n');

    try {
        // Check 1: Partner Balance Sync
        console.log('📊 CHECK 1: Partner Balance vs Transaction Sync');
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
                if (['SALE', 'INCOME'].includes(t.trans_type) && partner.partner_type === 'CUSTOMER') {
                    calculated += outstanding;
                } else if (['PURCHASE'].includes(t.trans_type) && partner.partner_type === 'VENDOR') {
                    calculated += outstanding;
                }
            }
            const stored = Number(partner.balance);
            if (Math.abs(stored - calculated) > 1) {
                addIssue({
                    category: 'Partner Balance',
                    severity: 'CRITICAL',
                    description: `${partner.name}: Stored=${stored.toLocaleString()}, Calculated=${calculated.toLocaleString()}`,
                    record_code: partner.code,
                    field: 'balance',
                    expected: calculated,
                    actual: stored
                });
            }
        }
        console.log(`✓ Checked ${partners.length} partners\n`);

        // Check 2: Transaction vs AP Sync
        console.log('📊 CHECK 2: Transaction vs APTransaction Balance Sync');
        const apInvoices = await prisma.aPTransaction.findMany({
            where: { type: 'INVOICE', deleted_at: null },
            include: { transaction: { select: { code: true, total_amount: true, paid_amount: true } } }
        });

        for (const ap of apInvoices) {
            if (!ap.transaction) continue;
            const transBalance = Number(ap.transaction.total_amount) - Number(ap.transaction.paid_amount);
            const apBalance = Number(ap.balance);
            if (Math.abs(transBalance - apBalance) > 1) {
                addIssue({
                    category: 'AP Balance Sync',
                    severity: 'CRITICAL',
                    description: `${ap.code}: Transaction balance=${transBalance.toLocaleString()}, AP balance=${apBalance.toLocaleString()}`,
                    record_code: ap.code,
                    field: 'balance',
                    expected: transBalance,
                    actual: apBalance
                });
            }
        }
        console.log(`✓ Checked ${apInvoices.length} AP invoices\n`);

        // Check 3: Transaction vs AR Sync
        console.log('📊 CHECK 3: Transaction vs ARTransaction Balance Sync');
        const arInvoices = await prisma.aRTransaction.findMany({
            where: { type: 'INVOICE', deleted_at: null },
            include: { transaction: { select: { code: true, total_amount: true, paid_amount: true } } }
        });

        for (const ar of arInvoices) {
            if (!ar.transaction) continue;
            const transBalance = Number(ar.transaction.total_amount) - Number(ar.transaction.paid_amount);
            const arBalance = Number(ar.balance);
            if (Math.abs(transBalance - arBalance) > 1) {
                addIssue({
                    category: 'AR Balance Sync',
                    severity: 'CRITICAL',
                    description: `${ar.code}: Transaction balance=${transBalance.toLocaleString()}, AR balance=${arBalance.toLocaleString()}`,
                    record_code: ar.code,
                    field: 'balance',
                    expected: transBalance,
                    actual: arBalance
                });
            }
        }
        console.log(`✓ Checked ${arInvoices.length} AR invoices\n`);

        // Check 4: Future Dates
        console.log('📊 CHECK 4: Future Date Transactions');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const futureTransactions = await prisma.transaction.findMany({
            where: { trans_date: { gt: tomorrow }, deleted_at: null },
            select: { code: true, trans_date: true }
        });
        for (const t of futureTransactions) {
            addIssue({
                category: 'Future Date',
                severity: 'LOW',
                description: `${t.code}: Date is ${t.trans_date.toISOString().split('T')[0]}`,
                record_code: t.code,
                field: 'trans_date',
                expected: '<= today',
                actual: t.trans_date.toISOString().split('T')[0]
            });
        }
        console.log(`✓ Found ${futureTransactions.length} future transactions\n`);

        // Check 5: Payment Status Consistency
        console.log('📊 CHECK 5: Payment Status Consistency');
        const transactions = await prisma.transaction.findMany({
            where: { deleted_at: null },
            select: { code: true, total_amount: true, paid_amount: true, payment_status: true }
        });

        let statusIssues = 0;
        for (const t of transactions) {
            const total = Number(t.total_amount);
            const paid = Number(t.paid_amount);
            let expected: string;
            if (paid <= 0) expected = 'PENDING';
            else if (paid >= total) expected = 'PAID';
            else expected = 'PARTIAL';

            if (t.payment_status !== expected && t.payment_status !== 'UNPAID' &&
                !(expected === 'PENDING' && t.payment_status === 'UNPAID')) {
                statusIssues++;
                if (statusIssues <= 5) { // Only show first 5
                    addIssue({
                        category: 'Payment Status',
                        severity: 'MEDIUM',
                        description: `${t.code}: Status=${t.payment_status}, Expected=${expected} (paid=${paid}, total=${total})`,
                        record_code: t.code,
                        field: 'payment_status',
                        expected,
                        actual: t.payment_status
                    });
                }
            }
        }
        if (statusIssues > 5) {
            console.log(`   ... and ${statusIssues - 5} more status issues`);
        }
        console.log(`✓ Checked ${transactions.length} transactions\n`);

        // SUMMARY
        console.log('='.repeat(60));
        console.log('📊 SUMMARY');
        console.log('='.repeat(60));

        const critical = issues.filter(i => i.severity === 'CRITICAL').length;
        const high = issues.filter(i => i.severity === 'HIGH').length;
        const medium = issues.filter(i => i.severity === 'MEDIUM').length;
        const low = issues.filter(i => i.severity === 'LOW').length;

        console.log(`\n🔴 CRITICAL: ${critical}`);
        console.log(`🟡 HIGH: ${high}`);
        console.log(`🔵 MEDIUM: ${medium}`);
        console.log(`⚪ LOW: ${low}`);
        console.log(`\nTotal issues: ${issues.length}`);

        // Save report
        if (issues.length > 0) {
            const reportPath = `./integrity-report-${new Date().toISOString().split('T')[0]}.json`;
            require('fs').writeFileSync(reportPath, JSON.stringify({
                generated_at: new Date().toISOString(),
                summary: { critical, high, medium, low, total: issues.length },
                issues
            }, null, 2));
            console.log(`\n📁 Report saved to: ${reportPath}`);
        } else {
            console.log('\n✅ No data integrity issues found!');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
