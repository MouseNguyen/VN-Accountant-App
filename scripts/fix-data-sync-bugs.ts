// scripts/fix-data-sync-bugs.ts
// Auto-fix Data Sync Issues
// Run after find-data-sync-bugs.ts to repair mismatches

import { prisma } from '../src/lib/prisma';

interface FixResult {
    check: string;
    fixed: number | bigint;
    status: 'OK' | 'FIXED' | 'SKIPPED';
}

async function fixDataSyncBugs(): Promise<FixResult[]> {
    const results: FixResult[] = [];

    console.log('\n' + '═'.repeat(60));
    console.log('🔧 DATA SYNC BUG FIXER');
    console.log('═'.repeat(60) + '\n');

    // ========================================================
    // FIX 1: VAT Declaration → Tax Schedule
    // ========================================================
    console.log('1️⃣  Syncing VAT Declaration → TaxSchedule...');
    try {
        const vatFixed = await prisma.$executeRaw`
            UPDATE tax_schedules ts
            SET status = 'SUBMITTED', updated_at = NOW()
            FROM vat_declarations vd
            WHERE ts.tax_type = 'VAT'
              AND ts.period = vd.period_code
              AND ts.farm_id = vd.farm_id
              AND vd.status = 'SUBMITTED'
              AND ts.status NOT IN ('SUBMITTED', 'PAID')
        `;
        results.push({ check: 'VAT → TaxSchedule', fixed: vatFixed, status: vatFixed > 0 ? 'FIXED' : 'OK' });
        console.log(`   ${vatFixed > 0 ? '✅' : '✓'} Fixed ${vatFixed} records`);
    } catch (e) {
        results.push({ check: 'VAT → TaxSchedule', fixed: 0, status: 'SKIPPED' });
        console.log(`   ⚠️  Skipped`);
    }

    // ========================================================
    // FIX 2: CIT Calculation → Tax Schedule
    // ========================================================
    console.log('2️⃣  Syncing CIT Calculation → TaxSchedule...');
    try {
        const citFixed = await prisma.$executeRaw`
            UPDATE tax_schedules ts
            SET status = 'SUBMITTED', updated_at = NOW()
            FROM cit_calculations cc
            WHERE ts.tax_type = 'CIT'
              AND ts.period = cc.period
              AND ts.farm_id = cc.farm_id
              AND cc.status = 'SUBMITTED'
              AND ts.status NOT IN ('SUBMITTED', 'PAID')
        `;
        results.push({ check: 'CIT → TaxSchedule', fixed: citFixed, status: citFixed > 0 ? 'FIXED' : 'OK' });
        console.log(`   ${citFixed > 0 ? '✅' : '✓'} Fixed ${citFixed} records`);
    } catch (e) {
        results.push({ check: 'CIT → TaxSchedule', fixed: 0, status: 'SKIPPED' });
        console.log(`   ⚠️  Skipped`);
    }

    // ========================================================
    // FIX 3: Customer Balance (recalculate from AR Invoices)
    // ========================================================
    console.log('3️⃣  Recalculating Customer Balances...');
    try {
        const customerFixed = await prisma.$executeRaw`
            UPDATE partners p
            SET balance = sub.calculated_balance, updated_at = NOW()
            FROM (
                SELECT 
                    p2.id,
                    COALESCE(SUM(ar.total_amount - ar.paid_amount), 0) as calculated_balance
                FROM partners p2
                LEFT JOIN ar_invoices ar ON 
                    ar.customer_id = p2.id AND 
                    ar.status IN ('POSTED', 'PARTIALLY_PAID')
                WHERE p2.partner_type = 'CUSTOMER'
                GROUP BY p2.id
            ) sub
            WHERE p.id = sub.id 
              AND ABS(COALESCE(p.balance, 0) - sub.calculated_balance) > 0.01
        `;
        results.push({ check: 'Customer Balance', fixed: customerFixed, status: customerFixed > 0 ? 'FIXED' : 'OK' });
        console.log(`   ${customerFixed > 0 ? '✅' : '✓'} Fixed ${customerFixed} records`);
    } catch (e) {
        results.push({ check: 'Customer Balance', fixed: 0, status: 'SKIPPED' });
        console.log(`   ⚠️  Skipped`);
    }

    // ========================================================
    // FIX 4: Vendor Balance (recalculate from AP Invoices)
    // ========================================================
    console.log('4️⃣  Recalculating Vendor Balances...');
    try {
        const vendorFixed = await prisma.$executeRaw`
            UPDATE partners p
            SET balance = sub.calculated_balance, updated_at = NOW()
            FROM (
                SELECT 
                    p2.id,
                    COALESCE(SUM(ap.total_amount - ap.paid_amount), 0) as calculated_balance
                FROM partners p2
                LEFT JOIN ap_invoices ap ON 
                    ap.vendor_id = p2.id AND 
                    ap.status IN ('POSTED', 'PARTIALLY_PAID')
                WHERE p2.partner_type = 'VENDOR'
                GROUP BY p2.id
            ) sub
            WHERE p.id = sub.id 
              AND ABS(COALESCE(p.balance, 0) - sub.calculated_balance) > 0.01
        `;
        results.push({ check: 'Vendor Balance', fixed: vendorFixed, status: vendorFixed > 0 ? 'FIXED' : 'OK' });
        console.log(`   ${vendorFixed > 0 ? '✅' : '✓'} Fixed ${vendorFixed} records`);
    } catch (e) {
        results.push({ check: 'Vendor Balance', fixed: 0, status: 'SKIPPED' });
        console.log(`   ⚠️  Skipped`);
    }

    // ========================================================
    // FIX 5: AR Payment Allocated Amount
    // ========================================================
    console.log('5️⃣  Recalculating Payment Allocations...');
    try {
        const paymentFixed = await prisma.$executeRaw`
            UPDATE ar_payments p
            SET allocated_amount = sub.calculated_allocated, updated_at = NOW()
            FROM (
                SELECT 
                    p2.id,
                    COALESCE(SUM(a.amount), 0) as calculated_allocated
                FROM ar_payments p2
                LEFT JOIN ar_invoice_payment_allocations a ON a.payment_id = p2.id
                WHERE p2.status != 'VOID'
                GROUP BY p2.id
            ) sub
            WHERE p.id = sub.id 
              AND ABS(COALESCE(p.allocated_amount, 0) - sub.calculated_allocated) > 0.01
        `;
        results.push({ check: 'Payment Allocation', fixed: paymentFixed, status: paymentFixed > 0 ? 'FIXED' : 'OK' });
        console.log(`   ${paymentFixed > 0 ? '✅' : '✓'} Fixed ${paymentFixed} records`);
    } catch (e) {
        results.push({ check: 'Payment Allocation', fixed: 0, status: 'SKIPPED' });
        console.log(`   ⚠️  Skipped`);
    }

    // ========================================================
    // FIX 6: AR Invoice Paid Amount
    // ========================================================
    console.log('6️⃣  Recalculating Invoice Paid Amounts...');
    try {
        const invoiceFixed = await prisma.$executeRaw`
            UPDATE ar_invoices i
            SET paid_amount = sub.calculated_paid, updated_at = NOW()
            FROM (
                SELECT 
                    i2.id,
                    COALESCE(SUM(a.amount), 0) as calculated_paid
                FROM ar_invoices i2
                LEFT JOIN ar_invoice_payment_allocations a ON a.invoice_id = i2.id
                WHERE i2.status NOT IN ('VOID', 'DRAFT')
                GROUP BY i2.id
            ) sub
            WHERE i.id = sub.id 
              AND ABS(COALESCE(i.paid_amount, 0) - sub.calculated_paid) > 0.01
        `;
        results.push({ check: 'Invoice Paid', fixed: invoiceFixed, status: invoiceFixed > 0 ? 'FIXED' : 'OK' });
        console.log(`   ${invoiceFixed > 0 ? '✅' : '✓'} Fixed ${invoiceFixed} records`);
    } catch (e) {
        results.push({ check: 'Invoice Paid', fixed: 0, status: 'SKIPPED' });
        console.log(`   ⚠️  Skipped`);
    }

    // ========================================================
    // FIX 7: Stock Quantity (Note: use move_type not movement_type)
    // ========================================================
    console.log('7️⃣  Recalculating Stock Quantities...');
    try {
        const stockFixed = await prisma.$executeRaw`
            UPDATE stocks s
            SET quantity = sub.calculated_qty, updated_at = NOW()
            FROM (
                SELECT 
                    s2.id,
                    COALESCE(
                        SUM(CASE WHEN sm.type IN ('IN', 'ADJUST_IN') THEN sm.quantity ELSE -sm.quantity END),
                        0
                    ) as calculated_qty
                FROM stocks s2
                LEFT JOIN stock_movements sm ON sm.product_id = s2.product_id AND sm.farm_id = s2.farm_id
                GROUP BY s2.id
            ) sub
            WHERE s.id = sub.id 
              AND ABS(s.quantity - sub.calculated_qty) > 0.01
        `;
        results.push({ check: 'Stock Quantity', fixed: stockFixed, status: stockFixed > 0 ? 'FIXED' : 'OK' });
        console.log(`   ${stockFixed > 0 ? '✅' : '✓'} Fixed ${stockFixed} records`);
    } catch (e) {
        results.push({ check: 'Stock Quantity', fixed: 0, status: 'SKIPPED' });
        console.log(`   ⚠️  Skipped`);
    }

    // ========================================================
    // FIX 8: Invoice Status (match to paid_amount)
    // ========================================================
    console.log('8️⃣  Correcting Invoice Statuses...');
    try {
        // PAID but not fully paid → PARTIALLY_PAID
        const paidToPartial = await prisma.$executeRaw`
            UPDATE ar_invoices
            SET status = 'PARTIALLY_PAID', updated_at = NOW()
            WHERE status = 'PAID' AND paid_amount < total_amount AND paid_amount > 0
        `;

        // PARTIALLY_PAID but fully paid → PAID
        const partialToPaid = await prisma.$executeRaw`
            UPDATE ar_invoices
            SET status = 'PAID', updated_at = NOW()
            WHERE status = 'PARTIALLY_PAID' AND paid_amount >= total_amount
        `;

        // POSTED with payments → PARTIALLY_PAID or PAID
        const postedToPartial = await prisma.$executeRaw`
            UPDATE ar_invoices
            SET status = CASE 
                WHEN paid_amount >= total_amount THEN 'PAID'
                ELSE 'PARTIALLY_PAID'
            END, updated_at = NOW()
            WHERE status = 'POSTED' AND paid_amount > 0
        `;

        const totalStatusFixed = Number(paidToPartial) + Number(partialToPaid) + Number(postedToPartial);
        results.push({ check: 'Invoice Status', fixed: totalStatusFixed, status: totalStatusFixed > 0 ? 'FIXED' : 'OK' });
        console.log(`   ${totalStatusFixed > 0 ? '✅' : '✓'} Fixed ${totalStatusFixed} records`);
    } catch (e) {
        results.push({ check: 'Invoice Status', fixed: 0, status: 'SKIPPED' });
        console.log(`   ⚠️  Skipped`);
    }

    return results;
}

// ========================================================
// MAIN
// ========================================================
async function main() {
    const results = await fixDataSyncBugs();

    console.log('\n' + '═'.repeat(60));
    console.log('📊 FIX SUMMARY');
    console.log('═'.repeat(60) + '\n');

    const totalFixed = results.reduce((sum, r) => sum + Number(r.fixed || 0), 0);
    const fixedCount = results.filter(r => r.status === 'FIXED').length;
    const skippedCount = results.filter(r => r.status === 'SKIPPED').length;

    console.log(`   ✅ Clean: ${results.filter(r => r.status === 'OK').length}`);
    console.log(`   🔧 Fixed: ${fixedCount} checks, ${totalFixed} total records`);
    if (skippedCount > 0) {
        console.log(`   ⚠️  Skipped: ${skippedCount}`);
    }

    console.log('\n📝 Run `npx tsx scripts/find-data-sync-bugs.ts` to verify all issues resolved.');
    console.log('\n' + '═'.repeat(60) + '\n');

    return results;
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
