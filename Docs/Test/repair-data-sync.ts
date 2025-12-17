// scripts/repair-data-sync.ts
// Auto-repair Data Sync Issues for LABA ERP
// Run: npx tsx scripts/repair-data-sync.ts [--dry-run]

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');

interface RepairResult {
    category: string;
    table: string;
    record_id: string;
    record_code?: string;
    field: string;
    old_value: string | number;
    new_value: string | number;
    status: 'FIXED' | 'SKIPPED' | 'ERROR';
    error?: string;
}

const repairs: RepairResult[] = [];

function log(message: string) {
    const prefix = DRY_RUN ? '[DRY-RUN] ' : '';
    console.log(prefix + message);
}

// ============================================================
// REPAIR 1: Sync Partner Balance from Transactions
// ============================================================
async function repairPartnerBalances() {
    console.log('\n' + '='.repeat(60));
    console.log('🔧 REPAIR 1: Partner Balance Sync');
    console.log('='.repeat(60));

    const partners = await prisma.partner.findMany({
        where: { deleted_at: null },
        include: {
            transactions: {
                where: { deleted_at: null },
                select: {
                    id: true,
                    code: true,
                    trans_type: true,
                    total_amount: true,
                    paid_amount: true,
                }
            }
        }
    });

    let fixed = 0;
    for (const partner of partners) {
        let calculatedBalance = 0;

        for (const t of partner.transactions) {
            const outstanding = Number(t.total_amount) - Number(t.paid_amount);
            
            if (['SALE', 'INCOME'].includes(t.trans_type)) {
                if (partner.partner_type === 'CUSTOMER') {
                    calculatedBalance += outstanding;
                }
            } else if (['PURCHASE', 'EXPENSE'].includes(t.trans_type)) {
                if (partner.partner_type === 'VENDOR') {
                    calculatedBalance += outstanding;
                }
            }
        }

        const storedBalance = Number(partner.balance);
        const diff = Math.abs(storedBalance - calculatedBalance);

        if (diff > 1) {
            log(`${partner.name}: ${storedBalance.toLocaleString()} → ${calculatedBalance.toLocaleString()}`);
            
            if (!DRY_RUN) {
                try {
                    await prisma.partner.update({
                        where: { id: partner.id },
                        data: { balance: calculatedBalance }
                    });
                    repairs.push({
                        category: 'Partner Balance',
                        table: 'Partner',
                        record_id: partner.id,
                        record_code: partner.code,
                        field: 'balance',
                        old_value: storedBalance,
                        new_value: calculatedBalance,
                        status: 'FIXED'
                    });
                    fixed++;
                } catch (error) {
                    repairs.push({
                        category: 'Partner Balance',
                        table: 'Partner',
                        record_id: partner.id,
                        record_code: partner.code,
                        field: 'balance',
                        old_value: storedBalance,
                        new_value: calculatedBalance,
                        status: 'ERROR',
                        error: String(error)
                    });
                }
            } else {
                repairs.push({
                    category: 'Partner Balance',
                    table: 'Partner',
                    record_id: partner.id,
                    record_code: partner.code,
                    field: 'balance',
                    old_value: storedBalance,
                    new_value: calculatedBalance,
                    status: 'SKIPPED'
                });
            }
        }
    }

    console.log(`✓ ${DRY_RUN ? 'Would fix' : 'Fixed'} ${fixed} partner balances`);
}

// ============================================================
// REPAIR 2: Sync Transaction.paid_amount from Payment History
// ============================================================
async function repairTransactionPaidAmounts() {
    console.log('\n' + '='.repeat(60));
    console.log('🔧 REPAIR 2: Transaction Paid Amount Sync');
    console.log('='.repeat(60));

    // Get all transactions with partner
    const transactions = await prisma.transaction.findMany({
        where: { 
            deleted_at: null,
            partner_id: { not: null }
        },
        select: {
            id: true,
            code: true,
            total_amount: true,
            paid_amount: true,
            payment_status: true,
            partner_id: true,
        }
    });

    let fixed = 0;
    for (const trans of transactions) {
        // Sum payments from PaymentAllocation
        const allocations = await prisma.paymentAllocation.aggregate({
            where: { transaction_id: trans.id },
            _sum: { amount: true }
        });

        const calculatedPaid = Number(allocations._sum.amount || 0);
        const storedPaid = Number(trans.paid_amount);
        const total = Number(trans.total_amount);

        if (Math.abs(calculatedPaid - storedPaid) > 1) {
            // Determine correct status
            let newStatus: string;
            if (calculatedPaid <= 0) newStatus = 'UNPAID';
            else if (calculatedPaid >= total) newStatus = 'PAID';
            else newStatus = 'PARTIAL';

            log(`${trans.code}: paid_amount ${storedPaid.toLocaleString()} → ${calculatedPaid.toLocaleString()}, status → ${newStatus}`);
            
            if (!DRY_RUN) {
                try {
                    await prisma.transaction.update({
                        where: { id: trans.id },
                        data: { 
                            paid_amount: calculatedPaid,
                            payment_status: newStatus as any
                        }
                    });
                    repairs.push({
                        category: 'Transaction Paid Amount',
                        table: 'Transaction',
                        record_id: trans.id,
                        record_code: trans.code,
                        field: 'paid_amount',
                        old_value: storedPaid,
                        new_value: calculatedPaid,
                        status: 'FIXED'
                    });
                    fixed++;
                } catch (error) {
                    repairs.push({
                        category: 'Transaction Paid Amount',
                        table: 'Transaction',
                        record_id: trans.id,
                        record_code: trans.code,
                        field: 'paid_amount',
                        old_value: storedPaid,
                        new_value: calculatedPaid,
                        status: 'ERROR',
                        error: String(error)
                    });
                }
            }
        }
    }

    console.log(`✓ ${DRY_RUN ? 'Would fix' : 'Fixed'} ${fixed} transaction paid amounts`);
}

// ============================================================
// REPAIR 3: Sync Product.stock_qty from Stock table
// ============================================================
async function repairProductStockQty() {
    console.log('\n' + '='.repeat(60));
    console.log('🔧 REPAIR 3: Product Stock Qty Sync');
    console.log('='.repeat(60));

    const products = await prisma.product.findMany({
        where: { deleted_at: null },
        select: {
            id: true,
            code: true,
            name: true,
            stock_qty: true,
        }
    });

    let fixed = 0;
    for (const product of products) {
        const stockRecords = await prisma.stock.aggregate({
            where: { product_id: product.id },
            _sum: { quantity: true }
        });

        const stockQty = Number(stockRecords._sum.quantity || 0);
        const productQty = Number(product.stock_qty);

        if (Math.abs(stockQty - productQty) > 0.001) {
            log(`${product.name}: stock_qty ${productQty} → ${stockQty}`);
            
            if (!DRY_RUN) {
                try {
                    await prisma.product.update({
                        where: { id: product.id },
                        data: { stock_qty: stockQty }
                    });
                    repairs.push({
                        category: 'Product Stock Qty',
                        table: 'Product',
                        record_id: product.id,
                        record_code: product.code,
                        field: 'stock_qty',
                        old_value: productQty,
                        new_value: stockQty,
                        status: 'FIXED'
                    });
                    fixed++;
                } catch (error) {
                    repairs.push({
                        category: 'Product Stock Qty',
                        table: 'Product',
                        record_id: product.id,
                        record_code: product.code,
                        field: 'stock_qty',
                        old_value: productQty,
                        new_value: stockQty,
                        status: 'ERROR',
                        error: String(error)
                    });
                }
            }
        }
    }

    console.log(`✓ ${DRY_RUN ? 'Would fix' : 'Fixed'} ${fixed} product stock quantities`);
}

// ============================================================
// REPAIR 4: Sync AR/AP Transaction balances
// ============================================================
async function repairARAPBalances() {
    console.log('\n' + '='.repeat(60));
    console.log('🔧 REPAIR 4: AR/AP Transaction Balance Sync');
    console.log('='.repeat(60));

    // Fix AR balances
    const arTransactions = await prisma.aRTransaction.findMany({
        include: {
            transaction: {
                select: { total_amount: true, paid_amount: true, code: true }
            }
        }
    });

    let fixedAR = 0;
    for (const ar of arTransactions) {
        if (!ar.transaction) continue;

        const expectedBalance = Number(ar.transaction.total_amount) - Number(ar.transaction.paid_amount);
        const currentBalance = Number(ar.balance);

        if (Math.abs(expectedBalance - currentBalance) > 1) {
            const newStatus = expectedBalance <= 0 ? 'PAID' : 
                              expectedBalance < Number(ar.amount) ? 'PARTIAL' : 'UNPAID';

            log(`AR ${ar.transaction.code}: balance ${currentBalance.toLocaleString()} → ${expectedBalance.toLocaleString()}`);
            
            if (!DRY_RUN) {
                try {
                    await prisma.aRTransaction.update({
                        where: { id: ar.id },
                        data: { 
                            balance: expectedBalance,
                            paid_amount: Number(ar.transaction.paid_amount),
                            status: newStatus as any
                        }
                    });
                    fixedAR++;
                } catch (error) {
                    console.error(`Error fixing AR ${ar.id}:`, error);
                }
            }
        }
    }

    // Fix AP balances
    const apTransactions = await prisma.aPTransaction.findMany({
        include: {
            transaction: {
                select: { total_amount: true, paid_amount: true, code: true }
            }
        }
    });

    let fixedAP = 0;
    for (const ap of apTransactions) {
        if (!ap.transaction) continue;

        const expectedBalance = Number(ap.transaction.total_amount) - Number(ap.transaction.paid_amount);
        const currentBalance = Number(ap.balance);

        if (Math.abs(expectedBalance - currentBalance) > 1) {
            const newStatus = expectedBalance <= 0 ? 'PAID' : 
                              expectedBalance < Number(ap.amount) ? 'PARTIAL' : 'UNPAID';

            log(`AP ${ap.transaction.code}: balance ${currentBalance.toLocaleString()} → ${expectedBalance.toLocaleString()}`);
            
            if (!DRY_RUN) {
                try {
                    await prisma.aPTransaction.update({
                        where: { id: ap.id },
                        data: { 
                            balance: expectedBalance,
                            paid_amount: Number(ap.transaction.paid_amount),
                            status: newStatus as any
                        }
                    });
                    fixedAP++;
                } catch (error) {
                    console.error(`Error fixing AP ${ap.id}:`, error);
                }
            }
        }
    }

    console.log(`✓ ${DRY_RUN ? 'Would fix' : 'Fixed'} ${fixedAR} AR balances, ${fixedAP} AP balances`);
}

// ============================================================
// REPAIR 5: Fix Payment Status based on paid_amount
// ============================================================
async function repairPaymentStatuses() {
    console.log('\n' + '='.repeat(60));
    console.log('🔧 REPAIR 5: Payment Status Sync');
    console.log('='.repeat(60));

    const transactions = await prisma.transaction.findMany({
        where: { deleted_at: null },
        select: {
            id: true,
            code: true,
            total_amount: true,
            paid_amount: true,
            payment_status: true,
        }
    });

    let fixed = 0;
    for (const trans of transactions) {
        const total = Number(trans.total_amount);
        const paid = Number(trans.paid_amount);

        let expectedStatus: string;
        if (paid <= 0) expectedStatus = 'UNPAID';
        else if (paid >= total) expectedStatus = 'PAID';
        else expectedStatus = 'PARTIAL';

        // Also accept PENDING as equivalent to UNPAID
        const currentStatus = trans.payment_status === 'PENDING' ? 'UNPAID' : trans.payment_status;

        if (currentStatus !== expectedStatus) {
            log(`${trans.code}: status ${trans.payment_status} → ${expectedStatus}`);
            
            if (!DRY_RUN) {
                try {
                    await prisma.transaction.update({
                        where: { id: trans.id },
                        data: { payment_status: expectedStatus as any }
                    });
                    repairs.push({
                        category: 'Payment Status',
                        table: 'Transaction',
                        record_id: trans.id,
                        record_code: trans.code,
                        field: 'payment_status',
                        old_value: trans.payment_status,
                        new_value: expectedStatus,
                        status: 'FIXED'
                    });
                    fixed++;
                } catch (error) {
                    repairs.push({
                        category: 'Payment Status',
                        table: 'Transaction',
                        record_id: trans.id,
                        record_code: trans.code,
                        field: 'payment_status',
                        old_value: trans.payment_status,
                        new_value: expectedStatus,
                        status: 'ERROR',
                        error: String(error)
                    });
                }
            }
        }
    }

    console.log(`✓ ${DRY_RUN ? 'Would fix' : 'Fixed'} ${fixed} payment statuses`);
}

// ============================================================
// MAIN FUNCTION
// ============================================================
async function main() {
    console.log('🔧 LABA ERP - DATA SYNC REPAIR TOOL');
    console.log('====================================');
    console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes)' : '⚡ LIVE (making changes)'}`);
    console.log(`Started at: ${new Date().toISOString()}`);

    if (!DRY_RUN) {
        console.log('\n⚠️  WARNING: This will modify your database!');
        console.log('Press Ctrl+C within 5 seconds to cancel...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    try {
        await repairPartnerBalances();
        await repairTransactionPaidAmounts();
        await repairProductStockQty();
        await repairARAPBalances();
        await repairPaymentStatuses();

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 REPAIR SUMMARY');
        console.log('='.repeat(60));

        const fixed = repairs.filter(r => r.status === 'FIXED').length;
        const skipped = repairs.filter(r => r.status === 'SKIPPED').length;
        const errors = repairs.filter(r => r.status === 'ERROR').length;

        console.log(`\n✅ Fixed: ${fixed}`);
        console.log(`⏭️  Skipped (dry-run): ${skipped}`);
        console.log(`❌ Errors: ${errors}`);
        console.log(`\nTotal changes: ${repairs.length}`);

        if (repairs.length > 0) {
            // Export to JSON
            const reportPath = `./repair-report-${new Date().toISOString().split('T')[0]}.json`;
            require('fs').writeFileSync(reportPath, JSON.stringify({
                generated_at: new Date().toISOString(),
                mode: DRY_RUN ? 'dry-run' : 'live',
                summary: { fixed, skipped, errors, total: repairs.length },
                repairs
            }, null, 2));
            console.log(`\n📁 Report saved to: ${reportPath}`);
        }

        if (DRY_RUN) {
            console.log('\n💡 To apply fixes, run without --dry-run flag:');
            console.log('   npx tsx scripts/repair-data-sync.ts');
        }

    } catch (error) {
        console.error('Error running repair:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
