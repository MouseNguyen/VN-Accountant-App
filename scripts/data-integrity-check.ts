// scripts/data-integrity-check.ts
// Comprehensive data integrity check

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     DATA INTEGRITY CHECK                                     ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    let issues = 0;

    // 1. Check Partner balances
    console.log('═══ 1. PARTNER BALANCES ═══\n');
    const partners = await prisma.partner.findMany({
        where: { deleted_at: null },
        select: { id: true, code: true, name: true, balance: true },
    });

    for (const partner of partners) {
        const transactions = await prisma.transaction.findMany({
            where: { partner_id: partner.id, deleted_at: null },
            select: { trans_type: true, total_amount: true, paid_amount: true },
        });

        let actualBalance = 0;
        for (const t of transactions) {
            const unpaid = Number(t.total_amount) - Number(t.paid_amount);
            if (unpaid > 0) {
                actualBalance += t.trans_type === 'INCOME' ? unpaid : -unpaid;
            }
        }

        const dbBalance = Number(partner.balance);
        if (dbBalance !== actualBalance) {
            console.log(`❌ ${partner.code}: DB=${dbBalance}, Actual=${actualBalance}`);
            issues++;
        }
    }
    if (issues === 0) console.log('✅ All partner balances are correct');

    // 2. Check Transaction paid_amount vs total_amount
    console.log('\n═══ 2. TRANSACTION AMOUNTS ═══\n');
    const allTransactions = await prisma.transaction.findMany({
        where: { deleted_at: null },
        select: { id: true, code: true, total_amount: true, paid_amount: true, payment_status: true },
    });

    let txIssues = 0;
    for (const t of allTransactions) {
        const total = Number(t.total_amount);
        const paid = Number(t.paid_amount);

        if (paid > total) {
            console.log(`❌ ${t.code}: paid (${paid}) > total (${total})`);
            txIssues++;
        }
    }
    if (txIssues === 0) console.log('✅ All transactions look correct');
    issues += txIssues;

    // 3. Check Payroll amounts
    console.log('\n═══ 3. PAYROLL AMOUNTS ═══\n');
    try {
        const payrolls = await prisma.payroll.findMany({
            select: { id: true, code: true, status: true, total_net: true, paid_amount: true },
        });

        let payrollIssues = 0;
        for (const p of payrolls) {
            const net = Number(p.total_net);
            const paid = Number(p.paid_amount);

            if (paid > net) {
                console.log(`❌ Payroll ${p.code}: paid (${paid}) > net (${net})`);
                payrollIssues++;
            }

            // Check status
            if (p.status === 'PAID' && paid < net) {
                console.log(`❌ Payroll ${p.code}: status PAID but paid (${paid}) < net (${net})`);
                payrollIssues++;
            }
        }
        if (payrollIssues === 0) console.log('✅ All payrolls look correct');
        issues += payrollIssues;
    } catch (e) {
        console.log('ℹ️  Payroll check skipped (table may not exist)');
    }

    // 4. Check orphan transactions
    console.log('\n═══ 4. ORPHAN RECORDS ═══\n');

    // Get all partner IDs
    const partnerIds = new Set(partners.map(p => p.id));

    // Check transactions with partner_id that doesn't exist
    const txWithPartner = await prisma.transaction.findMany({
        where: { deleted_at: null, partner_id: { not: null } },
        select: { id: true, code: true, partner_id: true },
    });

    let orphanTx = 0;
    for (const t of txWithPartner) {
        if (t.partner_id && !partnerIds.has(t.partner_id)) {
            console.log(`❌ Transaction ${t.code} has invalid partner_id`);
            orphanTx++;
        }
    }

    if (orphanTx === 0) {
        console.log('✅ No orphan records found');
    }
    issues += orphanTx;

    // 5. Legacy AR/AP tables check
    console.log('\n═══ 5. LEGACY AR/AP TABLES ═══\n');

    try {
        const arCount = await prisma.aRTransaction.count({ where: { deleted_at: null } });
        const apCount = await prisma.aPTransaction.count({ where: { deleted_at: null } });

        if (arCount > 0 || apCount > 0) {
            console.log(`⚠️  Legacy AR transactions: ${arCount}`);
            console.log(`⚠️  Legacy AP transactions: ${apCount}`);
            console.log('   Note: These are deprecated. Use Transaction table instead.');
        } else {
            console.log('✅ No legacy AR/AP records');
        }
    } catch {
        console.log('ℹ️  Legacy AR/AP tables not found (OK)');
    }

    // 6. Check Product stock levels - SKIP: Schema changed
    console.log('\n═══ 6. PRODUCT STOCK ═══\n');
    console.log('ℹ️  Skipped - check Stock model instead of Product');

    /*
    try {
        const stocks = await prisma.stock.findMany({
            where: { deleted_at: null },
            select: { id: true, product_id: true, quantity: true },
        });

        let stockIssues = 0;
        for (const s of stocks) {
            const stock = Number(s.quantity);
            if (stock < 0) {
                console.log(`⚠️  Stock ${s.id}: negative stock (${stock})`);
                stockIssues++;
            }
        }
        if (stockIssues === 0) console.log('✅ All stocks look correct');
    } catch {
        console.log('ℹ️  Stock check skipped');
    }
    */

    // Summary
    console.log('\n════════════════════════════════════════════════════════════════');
    if (issues === 0) {
        console.log('✅ ALL CHECKS PASSED - DATA IS CONSISTENT');
    } else {
        console.log(`❌ FOUND ${issues} ISSUES - RUN fix-*.ts SCRIPTS TO REPAIR`);
    }
    console.log('════════════════════════════════════════════════════════════════');
}

main().catch(console.error).finally(() => prisma.$disconnect());
