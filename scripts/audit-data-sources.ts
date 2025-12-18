// scripts/audit-data-sources.ts
// Comprehensive audit of all data tables to find empty vs populated tables
// This helps identify UI pages that may be showing 0 data due to wrong data source

import { prisma } from '../src/lib/prisma';

interface TableAudit {
    table: string;
    count: number;
    alternativeTable?: string;
    alternativeCount?: number;
    issue?: string;
}

async function auditDataSources() {
    console.log('\n' + '═'.repeat(60));
    console.log('🔍 DATA SOURCE AUDIT');
    console.log('═'.repeat(60) + '\n');

    const audits: TableAudit[] = [];

    // ========================================================
    // AR MODULE - Accounts Receivable
    // ========================================================
    console.log('📦 AR (Accounts Receivable) Module:');

    const arTransaction = await prisma.aRTransaction.count();
    const arInvoice = await prisma.aRInvoice.count();
    const arPayment = await prisma.aRPayment.count();

    console.log(`   ARTransaction: ${arTransaction} records`);
    console.log(`   ARInvoice:     ${arInvoice} records`);
    console.log(`   ARPayment:     ${arPayment} records`);

    if (arTransaction === 0 && arInvoice > 0) {
        console.log(`   ⚠️  ARTransaction is EMPTY but ARInvoice has data!`);
        audits.push({
            table: 'ARTransaction',
            count: arTransaction,
            alternativeTable: 'ARInvoice',
            alternativeCount: arInvoice,
            issue: 'EMPTY_TABLE'
        });
    }

    // ========================================================
    // AP MODULE - Accounts Payable
    // ========================================================
    console.log('\n📦 AP (Accounts Payable) Module:');

    const apTransaction = await prisma.aPTransaction.count();
    const apInvoice = await prisma.aPInvoice.count();
    const apPayment = await prisma.aPPayment.count();

    console.log(`   APTransaction: ${apTransaction} records`);
    console.log(`   APInvoice:     ${apInvoice} records`);
    console.log(`   APPayment:     ${apPayment} records`);

    if (apTransaction === 0 && apInvoice > 0) {
        console.log(`   ⚠️  APTransaction is EMPTY but APInvoice has data!`);
        audits.push({
            table: 'APTransaction',
            count: apTransaction,
            alternativeTable: 'APInvoice',
            alternativeCount: apInvoice,
            issue: 'EMPTY_TABLE'
        });
    }

    // ========================================================
    // PARTNER BALANCES
    // ========================================================
    console.log('\n📦 Partner Balances:');

    const customerBalance = await prisma.partner.aggregate({
        where: { partner_type: 'CUSTOMER' },
        _sum: { balance: true }
    });
    const vendorBalance = await prisma.partner.aggregate({
        where: { partner_type: 'VENDOR' },
        _sum: { balance: true }
    });

    console.log(`   Customer balance sum: ${Number(customerBalance._sum.balance || 0).toLocaleString()}đ`);
    console.log(`   Vendor balance sum:   ${Number(vendorBalance._sum.balance || 0).toLocaleString()}đ`);

    // ========================================================
    // INVENTORY MODULE
    // ========================================================
    console.log('\n📦 Inventory Module:');

    const stock = await prisma.stock.count();
    const stockMovement = await prisma.stockMovement.count();

    console.log(`   Stock:          ${stock} records`);
    console.log(`   StockMovement:  ${stockMovement} records`);

    // ========================================================
    // TAX MODULE
    // ========================================================
    console.log('\n📦 Tax Module:');

    const vatDeclaration = await prisma.vATDeclaration.count();
    const citCalculation = await prisma.cITCalculation.count();
    const taxSchedule = await prisma.taxSchedule.count();

    console.log(`   VATDeclaration: ${vatDeclaration} records`);
    console.log(`   CITCalculation: ${citCalculation} records`);
    console.log(`   TaxSchedule:    ${taxSchedule} records`);

    // ========================================================
    // TRANSACTION MODULE
    // ========================================================
    console.log('\n📦 Transaction Module:');

    const transaction = await prisma.transaction.count();
    const transactionItem = await prisma.transactionItem.count();

    console.log(`   Transaction:     ${transaction} records`);
    console.log(`   TransactionItem: ${transactionItem} records`);

    // ========================================================
    // SUMMARY
    // ========================================================
    console.log('\n' + '═'.repeat(60));
    console.log('📊 AUDIT SUMMARY');
    console.log('═'.repeat(60));

    if (audits.length === 0) {
        console.log('\n✅ No data source issues found!');
    } else {
        console.log(`\n❌ Found ${audits.length} potential data source issues:\n`);
        audits.forEach((audit, i) => {
            console.log(`${i + 1}. ${audit.table} is EMPTY (0 records)`);
            console.log(`   → Use ${audit.alternativeTable} instead (${audit.alternativeCount} records)`);
        });

        console.log('\n📝 Action Required:');
        console.log('   Check UI pages that query these empty tables.');
        console.log('   Update them to use the alternative tables with data.');
    }

    console.log('\n' + '═'.repeat(60) + '\n');

    return audits;
}

auditDataSources()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
