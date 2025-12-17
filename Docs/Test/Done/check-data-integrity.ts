// scripts/check-data-integrity.ts
// Comprehensive Data Integrity Check for LABA ERP
// Run: npx tsx scripts/check-data-integrity.ts

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Colors for console output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

interface IntegrityIssue {
    category: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    table: string;
    record_id: string;
    record_code?: string;
    field: string;
    expected: string | number;
    actual: string | number;
    description: string;
}

const issues: IntegrityIssue[] = [];

function addIssue(issue: IntegrityIssue) {
    issues.push(issue);
    const color = issue.severity === 'CRITICAL' ? RED :
        issue.severity === 'HIGH' ? YELLOW :
            issue.severity === 'MEDIUM' ? BLUE : RESET;
    console.log(`${color}[${issue.severity}]${RESET} ${issue.category}: ${issue.description}`);
}

// ============================================================
// 1. PARTNER BALANCE vs TRANSACTION SYNC
// ============================================================
async function checkPartnerBalanceSync() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CHECK 1: Partner Balance vs Transaction Sync');
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
                    payment_status: true,
                }
            }
        }
    });

    for (const partner of partners) {
        let calculatedBalance = 0;

        for (const t of partner.transactions) {
            const outstanding = Number(t.total_amount) - Number(t.paid_amount);

            // SALE/INCOME → Customer owes us (positive)
            // PURCHASE/EXPENSE → We owe vendor (negative for vendor, but stored as positive)
            if (['SALE', 'INCOME'].includes(t.trans_type)) {
                if (partner.partner_type === 'CUSTOMER') {
                    calculatedBalance += outstanding;
                }
            } else if (['PURCHASE', 'EXPENSE'].includes(t.trans_type)) {
                if (partner.partner_type === 'VENDOR') {
                    calculatedBalance += outstanding; // Stored as positive for vendors
                }
            }
        }

        const storedBalance = Number(partner.balance);
        const diff = Math.abs(storedBalance - calculatedBalance);

        if (diff > 1) { // Allow 1 VND rounding difference
            addIssue({
                category: 'Partner Balance Sync',
                severity: 'CRITICAL',
                table: 'Partner',
                record_id: partner.id,
                record_code: partner.code,
                field: 'balance',
                expected: calculatedBalance,
                actual: storedBalance,
                description: `${partner.name}: Balance mismatch. Stored=${storedBalance.toLocaleString()}, Calculated=${calculatedBalance.toLocaleString()}, Diff=${diff.toLocaleString()}`
            });
        }
    }

    console.log(`✓ Checked ${partners.length} partners`);
}

// ============================================================
// 2. TRANSACTION vs AR/AP TRANSACTION SYNC
// ============================================================
async function checkTransactionARAPSync() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CHECK 2: Transaction vs AR/AP Transaction Sync');
    console.log('='.repeat(60));

    // Check SALE/INCOME transactions should have AR records if unpaid
    const unpaidSales = await prisma.transaction.findMany({
        where: {
            trans_type: { in: ['SALE', 'INCOME'] },
            payment_status: { in: ['UNPAID', 'PARTIAL', 'PENDING'] },
            deleted_at: null,
            partner_id: { not: null },
        },
        select: {
            id: true,
            code: true,
            trans_type: true,
            total_amount: true,
            paid_amount: true,
            partner_id: true,
        }
    });

    for (const trans of unpaidSales) {
        const arRecord = await prisma.aRTransaction.findFirst({
            where: { transaction_id: trans.id }
        });

        if (!arRecord) {
            addIssue({
                category: 'AR Transaction Missing',
                severity: 'HIGH',
                table: 'Transaction',
                record_id: trans.id,
                record_code: trans.code ?? undefined,
                field: 'ARTransaction',
                expected: 'Should exist',
                actual: 'Missing',
                description: `${trans.code} (${trans.trans_type}): Unpaid but no ARTransaction record`
            });
        } else {
            // Check if amounts match
            const transBalance = Number(trans.total_amount) - Number(trans.paid_amount);
            const arBalance = Number(arRecord.balance);

            if (Math.abs(transBalance - arBalance) > 1) {
                addIssue({
                    category: 'AR Balance Mismatch',
                    severity: 'CRITICAL',
                    table: 'ARTransaction',
                    record_id: arRecord.id,
                    record_code: trans.code ?? undefined,
                    field: 'balance',
                    expected: transBalance,
                    actual: arBalance,
                    description: `${trans.code}: AR balance mismatch. Transaction=${transBalance.toLocaleString()}, AR=${arBalance.toLocaleString()}`
                });
            }
        }
    }

    // Check PURCHASE/EXPENSE transactions should have AP records if unpaid
    const unpaidPurchases = await prisma.transaction.findMany({
        where: {
            trans_type: { in: ['PURCHASE', 'EXPENSE'] },
            payment_status: { in: ['UNPAID', 'PARTIAL', 'PENDING'] },
            deleted_at: null,
            partner_id: { not: null },
        },
        select: {
            id: true,
            code: true,
            trans_type: true,
            total_amount: true,
            paid_amount: true,
            partner_id: true,
        }
    });

    for (const trans of unpaidPurchases) {
        const apRecord = await prisma.aPTransaction.findFirst({
            where: { transaction_id: trans.id }
        });

        if (!apRecord) {
            addIssue({
                category: 'AP Transaction Missing',
                severity: 'HIGH',
                table: 'Transaction',
                record_id: trans.id,
                record_code: trans.code ?? undefined,
                field: 'APTransaction',
                expected: 'Should exist',
                actual: 'Missing',
                description: `${trans.code} (${trans.trans_type}): Unpaid but no APTransaction record`
            });
        } else {
            // Check if amounts match
            const transBalance = Number(trans.total_amount) - Number(trans.paid_amount);
            const apBalance = Number(apRecord.balance);

            if (Math.abs(transBalance - apBalance) > 1) {
                addIssue({
                    category: 'AP Balance Mismatch',
                    severity: 'CRITICAL',
                    table: 'APTransaction',
                    record_id: apRecord.id,
                    record_code: trans.code ?? undefined,
                    field: 'balance',
                    expected: transBalance,
                    actual: apBalance,
                    description: `${trans.code}: AP balance mismatch. Transaction=${transBalance.toLocaleString()}, AP=${apBalance.toLocaleString()}`
                });
            }
        }
    }

    console.log(`✓ Checked ${unpaidSales.length} unpaid sales, ${unpaidPurchases.length} unpaid purchases`);
}

// ============================================================
// 3. STOCK vs PRODUCT SYNC
// ============================================================
async function checkStockProductSync() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CHECK 3: Stock vs Product Sync');
    console.log('='.repeat(60));

    const products = await prisma.product.findMany({
        where: { deleted_at: null },
        select: {
            id: true,
            code: true,
            name: true,
            stock_qty: true,
            farm_id: true,
        }
    });

    for (const product of products) {
        // Sum stock from Stock table
        const stockRecords = await prisma.stock.aggregate({
            where: { product_id: product.id },
            _sum: { quantity: true }
        });

        const stockQty = Number(stockRecords._sum.quantity || 0);
        const productQty = Number(product.stock_qty);
        const diff = Math.abs(stockQty - productQty);

        if (diff > 0.001) { // Allow small rounding difference
            addIssue({
                category: 'Stock Quantity Sync',
                severity: 'HIGH',
                table: 'Product',
                record_id: product.id,
                record_code: product.code,
                field: 'stock_qty',
                expected: stockQty,
                actual: productQty,
                description: `${product.name}: Product.stock_qty=${productQty}, Stock.quantity=${stockQty}`
            });
        }
    }

    console.log(`✓ Checked ${products.length} products`);
}

// ============================================================
// 4. STOCK vs STOCK MOVEMENT RECONCILIATION
// ============================================================
async function checkStockMovementReconciliation() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CHECK 4: Stock vs Stock Movement Reconciliation');
    console.log('='.repeat(60));

    const stocks = await prisma.stock.findMany({
        include: {
            product: { select: { code: true, name: true } }
        }
    });

    for (const stock of stocks) {
        // Calculate from movements
        const movements = await prisma.stockMovement.findMany({
            where: { product_id: stock.product_id },
            select: { type: true, quantity: true }
        });

        let calculatedQty = 0;
        for (const m of movements) {
            if (['IN', 'ADJUSTMENT_IN', 'TRANSFER_IN'].includes(m.type)) {
                calculatedQty += Number(m.quantity);
            } else if (['OUT', 'ADJUSTMENT_OUT', 'TRANSFER_OUT'].includes(m.type)) {
                calculatedQty -= Number(m.quantity);
            }
        }

        const stockQty = Number(stock.quantity);
        const diff = Math.abs(stockQty - calculatedQty);

        if (diff > 0.001 && movements.length > 0) {
            addIssue({
                category: 'Stock Movement Reconciliation',
                severity: 'MEDIUM',
                table: 'Stock',
                record_id: stock.id,
                record_code: stock.product.code,
                field: 'quantity',
                expected: calculatedQty,
                actual: stockQty,
                description: `${stock.product.name}: Stock=${stockQty}, From Movements=${calculatedQty}`
            });
        }
    }

    console.log(`✓ Checked ${stocks.length} stock records`);
}

// ============================================================
// 5. TRANSACTION CALCULATION INTEGRITY
// ============================================================
async function checkTransactionCalculations() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CHECK 5: Transaction Calculation Integrity');
    console.log('='.repeat(60));

    const transactions = await prisma.transaction.findMany({
        where: { deleted_at: null },
        select: {
            id: true,
            code: true,
            subtotal: true,
            tax_amount: true,
            discount_amount: true,
            total_amount: true,
            paid_amount: true,
            payment_status: true,
        }
    });

    for (const trans of transactions) {
        const subtotal = Number(trans.subtotal || 0);
        const tax = Number(trans.tax_amount || 0);
        const discount = Number(trans.discount_amount || 0);
        const total = Number(trans.total_amount);
        const paid = Number(trans.paid_amount);

        // Check total calculation
        const expectedTotal = subtotal + tax - discount;
        if (Math.abs(total - expectedTotal) > 1 && subtotal > 0) {
            addIssue({
                category: 'Transaction Total Calculation',
                severity: 'MEDIUM',
                table: 'Transaction',
                record_id: trans.id,
                record_code: trans.code,
                field: 'total_amount',
                expected: expectedTotal,
                actual: total,
                description: `${trans.code}: Total mismatch. subtotal(${subtotal})+tax(${tax})-discount(${discount})=${expectedTotal}, stored=${total}`
            });
        }

        // Check payment status consistency
        const balance = total - paid;
        let expectedStatus: string;
        if (paid <= 0) expectedStatus = 'PENDING';
        else if (paid >= total) expectedStatus = 'PAID';
        else expectedStatus = 'PARTIAL';

        if (trans.payment_status !== expectedStatus && trans.payment_status !== 'UNPAID') {
            addIssue({
                category: 'Payment Status Mismatch',
                severity: 'MEDIUM',
                table: 'Transaction',
                record_id: trans.id,
                record_code: trans.code,
                field: 'payment_status',
                expected: expectedStatus,
                actual: trans.payment_status,
                description: `${trans.code}: Status should be ${expectedStatus} (paid=${paid}, total=${total})`
            });
        }
    }

    console.log(`✓ Checked ${transactions.length} transactions`);
}

// ============================================================
// 6. PAYROLL CALCULATION INTEGRITY
// ============================================================
async function checkPayrollCalculations() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CHECK 6: Payroll Calculation Integrity');
    console.log('='.repeat(60));

    const payrollItems = await prisma.payrollItem.findMany({
        include: {
            payroll: { select: { code: true, status: true } },
            worker: { select: { code: true, name: true } }
        }
    });

    for (const item of payrollItems) {
        const gross = Number(item.gross_amount);
        const insurance = Number(item.insurance_employee || 0);
        const pit = Number(item.pit_amount || 0);
        const deductions = Number(item.total_deductions || 0);
        const net = Number(item.net_amount);

        // Net = Gross - Insurance - PIT - Other Deductions
        const expectedNet = gross - insurance - pit - deductions;
        const diff = Math.abs(net - expectedNet);

        if (diff > 1 && gross > 0) {
            addIssue({
                category: 'Payroll Net Calculation',
                severity: 'HIGH',
                table: 'PayrollItem',
                record_id: item.id,
                record_code: `${item.payroll.code}-${item.worker.code}`,
                field: 'net_amount',
                expected: expectedNet,
                actual: net,
                description: `${item.worker.name}: Net mismatch. Gross(${gross})-Ins(${insurance})-PIT(${pit})-Ded(${deductions})=${expectedNet}, stored=${net}`
            });
        }

        // Check insurance calculation (10.5% for employee)
        if (gross > 0 && insurance > 0) {
            const expectedInsurance = gross * 0.105;
            const insuranceDiff = Math.abs(insurance - expectedInsurance);
            if (insuranceDiff > gross * 0.01) { // Allow 1% variance
                addIssue({
                    category: 'Payroll Insurance Calculation',
                    severity: 'MEDIUM',
                    table: 'PayrollItem',
                    record_id: item.id,
                    record_code: `${item.payroll.code}-${item.worker.code}`,
                    field: 'insurance_employee',
                    expected: Math.round(expectedInsurance),
                    actual: insurance,
                    description: `${item.worker.name}: Insurance should be ~10.5% of gross`
                });
            }
        }
    }

    console.log(`✓ Checked ${payrollItems.length} payroll items`);
}

// ============================================================
// 7. ORPHAN RECORDS CHECK
// ============================================================
async function checkOrphanRecords() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CHECK 7: Orphan Records');
    console.log('='.repeat(60));

    // Transaction items without transaction
    const orphanItems = await prisma.transactionItem.findMany({
        where: {
            transaction: null
        }
    });

    for (const item of orphanItems) {
        addIssue({
            category: 'Orphan Record',
            severity: 'LOW',
            table: 'TransactionItem',
            record_id: item.id,
            field: 'transaction_id',
            expected: 'Valid transaction',
            actual: 'null',
            description: `TransactionItem ${item.id} has no parent transaction`
        });
    }

    // Stock movements without product
    const orphanMovements = await prisma.stockMovement.findMany({
        where: {
            product: null
        }
    });

    for (const m of orphanMovements) {
        addIssue({
            category: 'Orphan Record',
            severity: 'LOW',
            table: 'StockMovement',
            record_id: m.id,
            record_code: m.code,
            field: 'product_id',
            expected: 'Valid product',
            actual: 'null',
            description: `StockMovement ${m.code} has no product`
        });
    }

    console.log(`✓ Checked for orphan records`);
}

// ============================================================
// 8. DUPLICATE CHECK
// ============================================================
async function checkDuplicates() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CHECK 8: Duplicate Records');
    console.log('='.repeat(60));

    // Duplicate transaction codes
    const dupTransactions = await prisma.$queryRaw<Array<{ code: string; count: bigint }>>`
        SELECT code, COUNT(*) as count
        FROM transactions
        WHERE deleted_at IS NULL
        GROUP BY code, farm_id
        HAVING COUNT(*) > 1
    `;

    for (const dup of dupTransactions) {
        addIssue({
            category: 'Duplicate Code',
            severity: 'MEDIUM',
            table: 'Transaction',
            record_id: 'multiple',
            record_code: dup.code,
            field: 'code',
            expected: '1',
            actual: Number(dup.count),
            description: `Transaction code "${dup.code}" appears ${dup.count} times`
        });
    }

    // Duplicate partner codes
    const dupPartners = await prisma.$queryRaw<Array<{ code: string; count: bigint }>>`
        SELECT code, COUNT(*) as count
        FROM partners
        WHERE deleted_at IS NULL
        GROUP BY code, farm_id
        HAVING COUNT(*) > 1
    `;

    for (const dup of dupPartners) {
        addIssue({
            category: 'Duplicate Code',
            severity: 'MEDIUM',
            table: 'Partner',
            record_id: 'multiple',
            record_code: dup.code,
            field: 'code',
            expected: '1',
            actual: Number(dup.count),
            description: `Partner code "${dup.code}" appears ${dup.count} times`
        });
    }

    console.log(`✓ Checked for duplicates`);
}

// ============================================================
// 9. DATE CONSISTENCY CHECK
// ============================================================
async function checkDateConsistency() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CHECK 9: Date Consistency');
    console.log('='.repeat(60));

    // Transactions with future dates
    const futureTransactions = await prisma.transaction.findMany({
        where: {
            trans_date: { gt: new Date() },
            deleted_at: null
        },
        select: { id: true, code: true, trans_date: true }
    });

    for (const trans of futureTransactions) {
        addIssue({
            category: 'Future Date',
            severity: 'LOW',
            table: 'Transaction',
            record_id: trans.id,
            record_code: trans.code,
            field: 'trans_date',
            expected: '<= today',
            actual: trans.trans_date.toISOString(),
            description: `${trans.code} has future date: ${trans.trans_date.toISOString().split('T')[0]}`
        });
    }

    // Payments before transaction date
    const invalidPayments = await prisma.$queryRaw<Array<{ id: string; code: string }>>`
        SELECT t.id, t.code
        FROM transactions t
        JOIN payment_histories ph ON ph.partner_id = t.partner_id
        WHERE ph.payment_date < t.trans_date
        AND t.deleted_at IS NULL
        LIMIT 10
    `;

    console.log(`✓ Checked date consistency`);
}

// ============================================================
// 10. NEGATIVE VALUE CHECK
// ============================================================
async function checkNegativeValues() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CHECK 10: Negative Value Check');
    console.log('='.repeat(60));

    // Negative stock quantities (if not allowed)
    const negativeStocks = await prisma.stock.findMany({
        where: {
            quantity: { lt: 0 }
        },
        include: {
            product: { select: { code: true, name: true } },
            farm: { select: { allow_negative_stock: true } }
        }
    });

    for (const stock of negativeStocks) {
        if (!stock.farm?.allow_negative_stock) {
            addIssue({
                category: 'Negative Stock',
                severity: 'HIGH',
                table: 'Stock',
                record_id: stock.id,
                record_code: stock.product.code,
                field: 'quantity',
                expected: '>= 0',
                actual: Number(stock.quantity),
                description: `${stock.product.name}: Negative stock ${stock.quantity} (negative stock not allowed)`
            });
        }
    }

    // Negative amounts in transactions
    const negativeTransactions = await prisma.transaction.findMany({
        where: {
            OR: [
                { total_amount: { lt: 0 } },
                { paid_amount: { lt: 0 } }
            ],
            deleted_at: null
        },
        select: { id: true, code: true, total_amount: true, paid_amount: true }
    });

    for (const trans of negativeTransactions) {
        addIssue({
            category: 'Negative Amount',
            severity: 'HIGH',
            table: 'Transaction',
            record_id: trans.id,
            record_code: trans.code,
            field: 'amount',
            expected: '>= 0',
            actual: `total=${trans.total_amount}, paid=${trans.paid_amount}`,
            description: `${trans.code}: Has negative amounts`
        });
    }

    console.log(`✓ Checked for negative values`);
}

// ============================================================
// MAIN FUNCTION
// ============================================================
async function main() {
    console.log('🔍 LABA ERP - COMPREHENSIVE DATA INTEGRITY CHECK');
    console.log('================================================');
    console.log(`Started at: ${new Date().toISOString()}`);

    try {
        await checkPartnerBalanceSync();
        await checkTransactionARAPSync();
        await checkStockProductSync();
        await checkStockMovementReconciliation();
        await checkTransactionCalculations();
        await checkPayrollCalculations();
        await checkOrphanRecords();
        await checkDuplicates();
        await checkDateConsistency();
        await checkNegativeValues();

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 SUMMARY');
        console.log('='.repeat(60));

        const critical = issues.filter(i => i.severity === 'CRITICAL').length;
        const high = issues.filter(i => i.severity === 'HIGH').length;
        const medium = issues.filter(i => i.severity === 'MEDIUM').length;
        const low = issues.filter(i => i.severity === 'LOW').length;

        console.log(`\n${RED}CRITICAL: ${critical}${RESET}`);
        console.log(`${YELLOW}HIGH: ${high}${RESET}`);
        console.log(`${BLUE}MEDIUM: ${medium}${RESET}`);
        console.log(`LOW: ${low}`);
        console.log(`\nTotal issues: ${issues.length}`);

        if (issues.length > 0) {
            // Group by category
            const byCategory = issues.reduce((acc, issue) => {
                acc[issue.category] = (acc[issue.category] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            console.log('\nBy Category:');
            Object.entries(byCategory)
                .sort((a, b) => b[1] - a[1])
                .forEach(([cat, count]) => {
                    console.log(`  ${cat}: ${count}`);
                });

            // Export to JSON
            const reportPath = `./integrity-report-${new Date().toISOString().split('T')[0]}.json`;
            require('fs').writeFileSync(reportPath, JSON.stringify({
                generated_at: new Date().toISOString(),
                summary: { critical, high, medium, low, total: issues.length },
                by_category: byCategory,
                issues
            }, null, 2));
            console.log(`\n📁 Full report saved to: ${reportPath}`);
        } else {
            console.log(`\n${GREEN}✅ No data integrity issues found!${RESET}`);
        }

    } catch (error) {
        console.error('Error running integrity check:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
