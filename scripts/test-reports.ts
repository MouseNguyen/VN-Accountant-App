// scripts/test-reports.ts
// Test accounting reports

import { PrismaClient } from '@prisma/client';
import * as reportService from '../src/services/reports.service';

const prisma = new PrismaClient();

async function main() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║           ACCOUNTING REPORTS TEST                            ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

    const farmId = '6a1cdfc3-7a55-43a7-9e96-21eb7be5ac7a';
    const params = {
        from: '2025-01-01',
        to: '2025-12-31',
    };

    console.log(`\nFarm ID: ${farmId}`);
    console.log(`Period: ${params.from} to ${params.to}\n`);

    try {
        // 1. Cash Book Report
        console.log('📊 1. Cash Book Report (TK 111)...');
        const cashBook = await reportService.getCashBookReport(farmId, params);
        console.log(`   Opening: ${cashBook.opening_balance.toLocaleString()}đ`);
        console.log(`   Entries: ${cashBook.entries.length}`);
        console.log(`   Closing: ${cashBook.closing_balance.toLocaleString()}đ`);

        // 2. Bank Book Report
        console.log('\n📊 2. Bank Book Report (TK 112)...');
        const bankBook = await reportService.getBankBookReport(farmId, params);
        console.log(`   Opening: ${bankBook.opening_balance.toLocaleString()}đ`);
        console.log(`   Entries: ${bankBook.entries.length}`);
        console.log(`   Closing: ${bankBook.closing_balance.toLocaleString()}đ`);

        // 3. Purchase Invoice Report
        console.log('\n📊 3. Purchase Invoice Report (Expense)...');
        const purchase = await reportService.getPurchaseInvoiceReport(farmId, params);
        console.log(`   Invoices: ${purchase.summary.total_invoices}`);
        console.log(`   Goods Value: ${purchase.summary.total_goods_value.toLocaleString()}đ`);
        console.log(`   VAT: ${purchase.summary.total_vat_amount.toLocaleString()}đ`);

        // 4. Sales Invoice Report
        console.log('\n📊 4. Sales Invoice Report (Income)...');
        const sales = await reportService.getSalesInvoiceReport(farmId, params);
        console.log(`   Invoices: ${sales.summary.total_invoices}`);
        console.log(`   Goods Value: ${sales.summary.total_goods_value.toLocaleString()}đ`);
        console.log(`   VAT: ${sales.summary.total_vat_amount.toLocaleString()}đ`);

        // 5. AR 131 Report
        console.log('\n📊 5. AR 131 Report (Receivable)...');
        const ar = await reportService.getAR131Report(farmId, params);
        console.log(`   Customers: ${ar.customers.length}`);
        console.log(`   Opening: ${ar.summary_opening.toLocaleString()}đ`);
        console.log(`   Closing: ${ar.summary_closing.toLocaleString()}đ`);

        // 6. AP 331 Report
        console.log('\n📊 6. AP 331 Report (Payable)...');
        const ap = await reportService.getAP331Report(farmId, params);
        console.log(`   Vendors: ${ap.vendors.length}`);
        console.log(`   Opening: ${ap.summary_opening.toLocaleString()}đ`);
        console.log(`   Closing: ${ap.summary_closing.toLocaleString()}đ`);

        // 7. Stock Movement Report
        console.log('\n📊 7. Stock Movement Report (NXT)...');
        const stock = await reportService.getStockMovementReport(farmId, params);
        console.log(`   Products: ${stock.entries.length}`);
        console.log(`   Opening Value: ${stock.totals.opening_value.toLocaleString()}đ`);
        console.log(`   Closing Value: ${stock.totals.closing_value.toLocaleString()}đ`);

        // 8. Trial Balance Report
        console.log('\n📊 8. Trial Balance Report...');
        const trial = await reportService.getTrialBalanceReport(farmId, params);
        console.log(`   Accounts: ${trial.accounts.length}`);
        console.log(`   Closing Debit: ${trial.totals.closing_debit.toLocaleString()}đ`);
        console.log(`   Closing Credit: ${trial.totals.closing_credit.toLocaleString()}đ`);
        console.log(`   Balanced: ${trial.is_balanced ? '✅ Yes' : '❌ No'}`);

        // 9. Profit/Loss Report
        console.log('\n📊 9. Profit/Loss Report...');
        const pnl = await reportService.getProfitLossReport(farmId, params);
        console.log(`   Revenue: ${pnl.revenue.total.toLocaleString()}đ`);
        console.log(`   COGS: ${pnl.cost_of_goods_sold.toLocaleString()}đ`);
        console.log(`   Expenses: ${pnl.expenses.total.toLocaleString()}đ`);
        console.log(`   Net Profit: ${pnl.net_profit.toLocaleString()}đ`);

        console.log('\n════════════════════════════════════════════════════════════════');
        console.log('✅ ALL REPORTS GENERATED SUCCESSFULLY');
        console.log('════════════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
