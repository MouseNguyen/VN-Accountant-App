// scripts/find-data-sync-bugs.ts
// Comprehensive Data Sync Bug Finder
// Detects mismatches between related tables that should stay in sync

import { prisma } from '../src/lib/prisma';

interface SyncIssue {
    type: string;
    table1: string;
    table2: string;
    field: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    count: number;
    examples: any[];
}

async function findDataSyncBugs(): Promise<SyncIssue[]> {
    const issues: SyncIssue[] = [];

    // ========================================================
    // CHECK 1: VAT Declaration → TaxSchedule Status
    // ========================================================
    console.log('1️⃣  Checking VAT Declaration → TaxSchedule...');
    try {
        const vatMismatch = await prisma.$queryRaw<any[]>`
            SELECT 
                vd.id as declaration_id,
                vd.period_code as period,
                vd.status as declaration_status,
                ts.id as schedule_id,
                ts.status as schedule_status
            FROM vat_declarations vd
            LEFT JOIN tax_schedules ts ON 
                ts.tax_type = 'VAT' AND 
                ts.period = vd.period_code AND 
                ts.farm_id = vd.farm_id
            WHERE vd.status = 'SUBMITTED' 
                AND (ts.status IS NULL OR ts.status NOT IN ('SUBMITTED', 'PAID'))
        `;

        if (vatMismatch.length > 0) {
            issues.push({
                type: 'VAT_STATUS_MISMATCH',
                table1: 'vat_declarations',
                table2: 'tax_schedules',
                field: 'status',
                severity: 'HIGH',
                count: vatMismatch.length,
                examples: vatMismatch.slice(0, 3)
            });
        }
        console.log(`   ${vatMismatch.length === 0 ? '✅' : '❌'} ${vatMismatch.length} issues`);
    } catch (e) {
        console.log(`   ⚠️  Skipped (table may not exist)`);
    }

    // ========================================================
    // CHECK 2: CIT Calculation → TaxSchedule Status
    // ========================================================
    console.log('2️⃣  Checking CIT Calculation → TaxSchedule...');
    try {
        const citMismatch = await prisma.$queryRaw<any[]>`
            SELECT 
                cc.id as calculation_id,
                cc.period,
                cc.status as calculation_status,
                ts.id as schedule_id,
                ts.status as schedule_status
            FROM cit_calculations cc
            LEFT JOIN tax_schedules ts ON 
                ts.tax_type = 'CIT' AND 
                ts.period = cc.period AND 
                ts.farm_id = cc.farm_id
            WHERE cc.status = 'SUBMITTED' 
                AND (ts.status IS NULL OR ts.status NOT IN ('SUBMITTED', 'PAID'))
        `;

        if (citMismatch.length > 0) {
            issues.push({
                type: 'CIT_STATUS_MISMATCH',
                table1: 'cit_calculations',
                table2: 'tax_schedules',
                field: 'status',
                severity: 'HIGH',
                count: citMismatch.length,
                examples: citMismatch.slice(0, 3)
            });
        }
        console.log(`   ${citMismatch.length === 0 ? '✅' : '❌'} ${citMismatch.length} issues`);
    } catch (e) {
        console.log(`   ⚠️  Skipped (table may not exist)`);
    }

    // ========================================================
    // CHECK 3: Customer Balance vs Unpaid AR Invoices
    // ========================================================
    console.log('3️⃣  Checking Customer Balance vs AR Invoices...');
    try {
        const customerBalanceMismatch = await prisma.$queryRaw<any[]>`
            SELECT 
                p.id,
                p.name,
                p.code,
                COALESCE(p.balance, 0) as stored_balance,
                COALESCE(SUM(ar.total_amount - ar.paid_amount), 0) as calculated_balance
            FROM partners p
            LEFT JOIN ar_invoices ar ON 
                ar.customer_id = p.id AND 
                ar.status IN ('POSTED', 'PARTIALLY_PAID')
            WHERE p.partner_type = 'CUSTOMER'
            GROUP BY p.id, p.name, p.code, p.balance
            HAVING ABS(COALESCE(p.balance, 0) - COALESCE(SUM(ar.total_amount - ar.paid_amount), 0)) > 0.01
        `;

        if (customerBalanceMismatch.length > 0) {
            issues.push({
                type: 'CUSTOMER_BALANCE_MISMATCH',
                table1: 'partners',
                table2: 'ar_invoices',
                field: 'balance',
                severity: 'HIGH',
                count: customerBalanceMismatch.length,
                examples: customerBalanceMismatch.slice(0, 3)
            });
        }
        console.log(`   ${customerBalanceMismatch.length === 0 ? '✅' : '❌'} ${customerBalanceMismatch.length} issues`);
    } catch (e) {
        console.log(`   ⚠️  Skipped (table may not exist)`);
    }

    // ========================================================
    // CHECK 4: Vendor Balance vs Unpaid AP Invoices
    // ========================================================
    console.log('4️⃣  Checking Vendor Balance vs AP Invoices...');
    try {
        const vendorBalanceMismatch = await prisma.$queryRaw<any[]>`
            SELECT 
                p.id,
                p.name,
                p.code,
                COALESCE(p.balance, 0) as stored_balance,
                COALESCE(SUM(ap.total_amount - ap.paid_amount), 0) as calculated_balance
            FROM partners p
            LEFT JOIN ap_invoices ap ON 
                ap.vendor_id = p.id AND 
                ap.status IN ('POSTED', 'PARTIALLY_PAID')
            WHERE p.partner_type = 'VENDOR'
            GROUP BY p.id, p.name, p.code, p.balance
            HAVING ABS(COALESCE(p.balance, 0) - COALESCE(SUM(ap.total_amount - ap.paid_amount), 0)) > 0.01
        `;

        if (vendorBalanceMismatch.length > 0) {
            issues.push({
                type: 'VENDOR_BALANCE_MISMATCH',
                table1: 'partners',
                table2: 'ap_invoices',
                field: 'balance',
                severity: 'HIGH',
                count: vendorBalanceMismatch.length,
                examples: vendorBalanceMismatch.slice(0, 3)
            });
        }
        console.log(`   ${vendorBalanceMismatch.length === 0 ? '✅' : '❌'} ${vendorBalanceMismatch.length} issues`);
    } catch (e) {
        console.log(`   ⚠️  Skipped (table may not exist)`);
    }

    // ========================================================
    // CHECK 5: AR Payment Allocated vs Sum of Allocations
    // ========================================================
    console.log('5️⃣  Checking AR Payment Allocations...');
    try {
        const paymentAllocationMismatch = await prisma.$queryRaw<any[]>`
            SELECT 
                p.id,
                p.payment_number,
                COALESCE(p.allocated_amount, 0) as stored_allocated,
                COALESCE(SUM(a.amount), 0) as calculated_allocated
            FROM ar_payments p
            LEFT JOIN ar_invoice_payment_allocations a ON a.payment_id = p.id
            WHERE p.status != 'VOID'
            GROUP BY p.id, p.payment_number, p.allocated_amount
            HAVING ABS(COALESCE(p.allocated_amount, 0) - COALESCE(SUM(a.amount), 0)) > 0.01
        `;

        if (paymentAllocationMismatch.length > 0) {
            issues.push({
                type: 'PAYMENT_ALLOCATION_MISMATCH',
                table1: 'ar_payments',
                table2: 'ar_invoice_payment_allocations',
                field: 'allocated_amount',
                severity: 'MEDIUM',
                count: paymentAllocationMismatch.length,
                examples: paymentAllocationMismatch.slice(0, 3)
            });
        }
        console.log(`   ${paymentAllocationMismatch.length === 0 ? '✅' : '❌'} ${paymentAllocationMismatch.length} issues`);
    } catch (e) {
        console.log(`   ⚠️  Skipped (table may not exist)`);
    }

    // ========================================================
    // CHECK 6: AR Invoice Paid vs Sum of Allocations
    // ========================================================
    console.log('6️⃣  Checking AR Invoice Paid Amount...');
    try {
        const invoicePaidMismatch = await prisma.$queryRaw<any[]>`
            SELECT 
                i.id,
                i.invoice_number,
                COALESCE(i.paid_amount, 0) as stored_paid,
                COALESCE(SUM(a.amount), 0) as calculated_paid
            FROM ar_invoices i
            LEFT JOIN ar_invoice_payment_allocations a ON a.invoice_id = i.id
            WHERE i.status NOT IN ('VOID', 'DRAFT')
            GROUP BY i.id, i.invoice_number, i.paid_amount
            HAVING ABS(COALESCE(i.paid_amount, 0) - COALESCE(SUM(a.amount), 0)) > 0.01
        `;

        if (invoicePaidMismatch.length > 0) {
            issues.push({
                type: 'INVOICE_PAID_MISMATCH',
                table1: 'ar_invoices',
                table2: 'ar_invoice_payment_allocations',
                field: 'paid_amount',
                severity: 'MEDIUM',
                count: invoicePaidMismatch.length,
                examples: invoicePaidMismatch.slice(0, 3)
            });
        }
        console.log(`   ${invoicePaidMismatch.length === 0 ? '✅' : '❌'} ${invoicePaidMismatch.length} issues`);
    } catch (e) {
        console.log(`   ⚠️  Skipped (table may not exist)`);
    }

    // ========================================================
    // CHECK 7: Stock Quantity vs Sum of Movements
    // ========================================================
    console.log('7️⃣  Checking Stock Quantity vs Movements...');
    try {
        const stockMismatch = await prisma.$queryRaw<any[]>`
            SELECT 
                s.id,
                s.product_id,
                p.name as product_name,
                s.quantity as stored_qty,
                COALESCE(
                    SUM(CASE WHEN sm.type IN ('IN', 'ADJUST_IN') THEN sm.quantity ELSE -sm.quantity END),
                    0
                ) as calculated_qty
            FROM stocks s
            JOIN products p ON p.id = s.product_id
            LEFT JOIN stock_movements sm ON sm.product_id = s.product_id AND sm.farm_id = s.farm_id
            GROUP BY s.id, s.product_id, p.name, s.quantity
            HAVING ABS(s.quantity - COALESCE(
                SUM(CASE WHEN sm.type IN ('IN', 'ADJUST_IN') THEN sm.quantity ELSE -sm.quantity END),
                0
            )) > 0.01
        `;

        if (stockMismatch.length > 0) {
            issues.push({
                type: 'STOCK_QUANTITY_MISMATCH',
                table1: 'stocks',
                table2: 'stock_movements',
                field: 'quantity',
                severity: 'HIGH',
                count: stockMismatch.length,
                examples: stockMismatch.slice(0, 3)
            });
        }
        console.log(`   ${stockMismatch.length === 0 ? '✅' : '❌'} ${stockMismatch.length} issues`);
    } catch (e) {
        console.log(`   ⚠️  Skipped (table may not exist)`);
    }

    // ========================================================
    // CHECK 8: AR Invoice Status vs Paid Amount
    // ========================================================
    console.log('8️⃣  Checking AR Invoice Status vs Paid Amount...');
    try {
        const statusMismatch = await prisma.$queryRaw<any[]>`
            SELECT id, invoice_number, status, total_amount, paid_amount
            FROM ar_invoices
            WHERE 
                (status = 'PAID' AND paid_amount < total_amount) OR
                (status = 'PARTIALLY_PAID' AND paid_amount >= total_amount) OR
                (status = 'POSTED' AND paid_amount > 0)
        `;

        if (statusMismatch.length > 0) {
            issues.push({
                type: 'INVOICE_STATUS_MISMATCH',
                table1: 'ar_invoices',
                table2: 'ar_invoices',
                field: 'status vs paid_amount',
                severity: 'MEDIUM',
                count: statusMismatch.length,
                examples: statusMismatch.slice(0, 3)
            });
        }
        console.log(`   ${statusMismatch.length === 0 ? '✅' : '❌'} ${statusMismatch.length} issues`);
    } catch (e) {
        console.log(`   ⚠️  Skipped (table may not exist)`);
    }

    // ========================================================
    // CHECK 9: Transaction Total vs Sum of Items
    // ========================================================
    console.log('9️⃣  Checking Transaction Totals vs Items...');
    try {
        const transactionMismatch = await prisma.$queryRaw<any[]>`
            SELECT 
                t.id,
                t.code,
                t.trans_number,
                t.amount as stored_amount,
                COALESCE(SUM(ti.line_total), 0) as calculated_amount
            FROM transactions t
            LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
            WHERE t.deleted_at IS NULL
            GROUP BY t.id, t.code, t.trans_number, t.amount
            HAVING COUNT(ti.id) > 0 AND ABS(t.amount - COALESCE(SUM(ti.line_total), 0)) > 0.01
        `;

        if (transactionMismatch.length > 0) {
            issues.push({
                type: 'TRANSACTION_TOTAL_MISMATCH',
                table1: 'transactions',
                table2: 'transaction_items',
                field: 'amount',
                severity: 'MEDIUM',
                count: transactionMismatch.length,
                examples: transactionMismatch.slice(0, 3)
            });
        }
        console.log(`   ${transactionMismatch.length === 0 ? '✅' : '❌'} ${transactionMismatch.length} issues`);
    } catch (e) {
        console.log(`   ⚠️  Skipped (table may not exist)`);
    }

    return issues;
}

// ========================================================
// MAIN - Run and Report
// ========================================================
async function main() {
    console.log('\n' + '═'.repeat(60));
    console.log('🔍 DATA SYNC BUG FINDER');
    console.log('═'.repeat(60) + '\n');

    const issues = await findDataSyncBugs();

    console.log('\n' + '═'.repeat(60));
    console.log('📊 RESULTS SUMMARY');
    console.log('═'.repeat(60));

    if (issues.length === 0) {
        console.log('\n✅ All 9 checks passed! No data sync issues found.\n');
    } else {
        console.log(`\n❌ Found ${issues.length} issue type(s):\n`);

        const highIssues = issues.filter(i => i.severity === 'HIGH');
        const medIssues = issues.filter(i => i.severity === 'MEDIUM');

        if (highIssues.length > 0) {
            console.log('🔴 HIGH SEVERITY:');
            for (const issue of highIssues) {
                console.log(`   ${issue.type}: ${issue.count} records`);
                console.log(`      ${issue.table1} ↔ ${issue.table2}.${issue.field}`);
            }
        }

        if (medIssues.length > 0) {
            console.log('\n🟡 MEDIUM SEVERITY:');
            for (const issue of medIssues) {
                console.log(`   ${issue.type}: ${issue.count} records`);
                console.log(`      ${issue.table1} ↔ ${issue.table2}.${issue.field}`);
            }
        }

        console.log('\n📝 Run `npx tsx scripts/fix-data-sync-bugs.ts` to auto-fix these issues.');
    }

    console.log('\n' + '═'.repeat(60) + '\n');

    return issues;
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
