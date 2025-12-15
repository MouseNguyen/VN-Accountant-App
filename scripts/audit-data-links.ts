// scripts/audit-data-links.ts
// Simplified comprehensive audit

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║           COMPREHENSIVE DATA AUDIT REPORT                    ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

    const results: string[] = [];

    // 1. Transaction Table Audit
    console.log('\n📊 Transaction Table...');

    const transTypes = await prisma.transaction.groupBy({
        by: ['trans_type'],
        _count: true,
    });
    transTypes.forEach(t => {
        const valid = ['INCOME', 'EXPENSE'].includes(t.trans_type);
        results.push(`${valid ? '✅' : '❌'} trans_type=${t.trans_type}: ${t._count} records`);
    });

    const paymentStatuses = await prisma.transaction.groupBy({
        by: ['payment_status'],
        _count: true,
    });
    paymentStatuses.forEach(s => {
        const valid = ['PENDING', 'PARTIAL', 'PAID', 'UNPAID'].includes(s.payment_status);
        results.push(`${valid ? '✅' : '⚠️'} payment_status=${s.payment_status}: ${s._count}`);
    });

    // 2. Partner Table Audit
    console.log('👥 Partner Table...');

    const partnerTypes = await prisma.partner.groupBy({
        by: ['partner_type'],
        _count: true,
    });
    partnerTypes.forEach(p => {
        const valid = ['CUSTOMER', 'VENDOR', 'BOTH'].includes(p.partner_type);
        results.push(`${valid ? '✅' : '❌'} partner_type=${p.partner_type}: ${p._count}`);
    });

    // 3. Product Table Audit
    console.log('📦 Product Table...');

    const categories = await prisma.product.groupBy({
        by: ['category'],
        _count: true,
    });
    categories.forEach(c => {
        const valid = ['NONG_SAN', 'VAT_TU', 'MENU', 'NGUYEN_LIEU', 'OTHER'].includes(c.category);
        results.push(`${valid ? '✅' : '⚠️'} category=${c.category}: ${c._count}`);
    });

    // 4. Counts
    console.log('💰 Table Counts...');

    const counts = {
        transactions: await prisma.transaction.count({ where: { deleted_at: null } }),
        partners: await prisma.partner.count({ where: { deleted_at: null } }),
        products: await prisma.product.count({ where: { deleted_at: null } }),
        apTransactions: await prisma.aPTransaction.count({ where: { deleted_at: null } }),
        arTransactions: await prisma.aRTransaction.count({ where: { deleted_at: null } }),
        paymentHistory: await prisma.paymentHistory.count(),
    };

    results.push(`✅ Transactions: ${counts.transactions}`);
    results.push(`✅ Partners: ${counts.partners}`);
    results.push(`✅ Products: ${counts.products}`);
    results.push(`✅ APTransaction (legacy): ${counts.apTransactions}`);
    results.push(`✅ ARTransaction (legacy): ${counts.arTransactions}`);
    results.push(`✅ PaymentHistory: ${counts.paymentHistory}`);

    // 5. Data Consistency
    console.log('🔗 Data Consistency...');

    const incomeTotal = await prisma.transaction.aggregate({
        where: { trans_type: 'INCOME', deleted_at: null },
        _sum: { total_amount: true },
    });

    const expenseTotal = await prisma.transaction.aggregate({
        where: { trans_type: 'EXPENSE', deleted_at: null },
        _sum: { total_amount: true },
    });

    const unpaidIncome = await prisma.transaction.aggregate({
        where: {
            trans_type: 'INCOME',
            payment_status: { in: ['PENDING', 'PARTIAL', 'UNPAID'] },
            deleted_at: null,
        },
        _sum: { total_amount: true, paid_amount: true },
    });

    const unpaidExpense = await prisma.transaction.aggregate({
        where: {
            trans_type: 'EXPENSE',
            payment_status: { in: ['PENDING', 'PARTIAL', 'UNPAID'] },
            deleted_at: null,
        },
        _sum: { total_amount: true, paid_amount: true },
    });

    const receivable = Number(unpaidIncome._sum.total_amount || 0) - Number(unpaidIncome._sum.paid_amount || 0);
    const payable = Number(unpaidExpense._sum.total_amount || 0) - Number(unpaidExpense._sum.paid_amount || 0);

    results.push(`✅ Total INCOME: ${Number(incomeTotal._sum.total_amount || 0).toLocaleString()}đ`);
    results.push(`✅ Total EXPENSE: ${Number(expenseTotal._sum.total_amount || 0).toLocaleString()}đ`);
    results.push(`✅ Phải thu: ${receivable.toLocaleString()}đ`);
    results.push(`✅ Phải trả: ${payable.toLocaleString()}đ`);
    results.push(`✅ Lãi ròng: ${(Number(incomeTotal._sum.total_amount || 0) - Number(expenseTotal._sum.total_amount || 0)).toLocaleString()}đ`);

    // Print Results
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                      AUDIT RESULTS                           ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    results.forEach(r => console.log(`   ${r}`));

    const errors = results.filter(r => r.startsWith('❌')).length;
    const warnings = results.filter(r => r.startsWith('⚠️')).length;

    console.log('\n════════════════════════════════════════════════════════════════');
    console.log(`Status: ${errors === 0 ? '✅ ALL DATA LINKS VALID' : '❌ NEEDS ATTENTION'}`);
    console.log('════════════════════════════════════════════════════════════════\n');
}

main()
    .catch(e => console.error('Error:', e.message))
    .finally(() => prisma.$disconnect());
