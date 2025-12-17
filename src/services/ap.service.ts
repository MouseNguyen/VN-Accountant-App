// src/services/ap.service.ts
// AP (Accounts Payable) Service - Công nợ Phải trả

import { prisma } from '@/lib/prisma';
import type {
    APTransaction,
    APListParams,
    APListResponse,
    CreateAPInput,
    MakePaymentInput,
    MakePaymentResponse,
    APAgingReport,
    PaymentSchedule,
    CashFlowForecast,
    APSummary,
} from '@/types/ap';

// ==========================================
// FORMAT HELPER
// ==========================================

function formatAPTransaction(ap: any): APTransaction {
    return {
        id: ap.id,
        farm_id: ap.farm_id,
        vendor_id: ap.vendor_id,
        vendor: ap.vendor
            ? {
                id: ap.vendor.id,
                code: ap.vendor.code,
                name: ap.vendor.name,
                phone: ap.vendor.phone || undefined,
                email: ap.vendor.email || undefined,
            }
            : undefined,
        type: ap.type,
        code: ap.code,
        trans_date: ap.trans_date.toISOString().split('T')[0],
        amount: Number(ap.amount),
        paid_amount: Number(ap.paid_amount),
        balance: Number(ap.balance),
        due_date: ap.due_date ? ap.due_date.toISOString().split('T')[0] : null,
        days_overdue: ap.days_overdue || 0,
        status: ap.status,
        transaction_id: ap.transaction_id || null,
        description: ap.description || null,
        notes: ap.notes || null,
        created_at: ap.created_at.toISOString(),
        updated_at: ap.updated_at.toISOString(),
    };
}

// ==========================================
// GENERATE CODES
// ==========================================

async function generateAPCode(
    tx: any,
    farmId: string,
    type: 'INVOICE' | 'PAYMENT' = 'INVOICE'
): Promise<string> {
    const prefix = type === 'INVOICE' ? 'AP' : 'TT-NCC';
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

    const lastAP = await tx.aPTransaction.findFirst({
        where: {
            farm_id: farmId,
            code: { startsWith: `${prefix}-${dateStr}` },
        },
        orderBy: { code: 'desc' },
    });

    let sequence = 1;
    if (lastAP) {
        const lastNum = parseInt(lastAP.code.split('-').pop() || '0', 10);
        sequence = lastNum + 1;
    }

    return `${prefix}-${dateStr}-${String(sequence).padStart(4, '0')}`;
}

async function generatePaymentCode(tx: any, farmId: string): Promise<string> {
    const prefix = 'PC'; // Phiếu Chi
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

    const lastPayment = await tx.transaction.findFirst({
        where: {
            farm_id: farmId,
            code: { startsWith: `${prefix}-${dateStr}` },
        },
        orderBy: { code: 'desc' },
    });

    let sequence = 1;
    if (lastPayment) {
        const lastNum = parseInt(lastPayment.code.split('-').pop() || '0', 10);
        sequence = lastNum + 1;
    }

    return `${prefix}-${dateStr}-${String(sequence).padStart(4, '0')}`;
}

// ==========================================
// GET AP TRANSACTIONS
// ==========================================

export async function getAPTransactions(
    farmId: string,
    params: APListParams
): Promise<APListResponse> {
    const { page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
        farm_id: farmId,
        deleted_at: null,
        // Default to INVOICE type (exclude PAYMENT records from list)
        type: params.type || 'INVOICE',
    };

    if (params.vendor_id) where.vendor_id = params.vendor_id;
    if (params.status) where.status = params.status;

    if (params.date_from || params.date_to) {
        where.trans_date = {};
        if (params.date_from) where.trans_date.gte = new Date(params.date_from);
        if (params.date_to) where.trans_date.lte = new Date(params.date_to);
    }

    if (params.overdue_only) {
        where.status = 'OVERDUE';
    }

    if (params.search) {
        where.OR = [
            { code: { contains: params.search, mode: 'insensitive' } },
            { vendor: { name: { contains: params.search, mode: 'insensitive' } } },
        ];
    }

    // Query
    const [items, total] = await Promise.all([
        prisma.aPTransaction.findMany({
            where,
            include: {
                vendor: {
                    select: { id: true, code: true, name: true, phone: true },
                },
            },
            orderBy: { [params.sort_by || 'trans_date']: params.sort_order || 'desc' },
            skip,
            take: limit,
        }),
        prisma.aPTransaction.count({ where }),
    ]);

    // Summary
    const [payable, overdue, paidThisMonth] = await Promise.all([
        prisma.aPTransaction.aggregate({
            where: { farm_id: farmId, deleted_at: null, type: 'INVOICE', balance: { gt: 0 } },
            _sum: { balance: true },
        }),
        prisma.aPTransaction.aggregate({
            where: { farm_id: farmId, deleted_at: null, status: 'OVERDUE' },
            _sum: { balance: true },
        }),
        prisma.aPTransaction.aggregate({
            where: {
                farm_id: farmId,
                type: 'PAYMENT',
                trans_date: {
                    gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                },
            },
            _sum: { amount: true },
        }),
    ]);

    return {
        items: items.map(formatAPTransaction),
        total,
        page,
        limit,
        hasMore: page * limit < total,
        summary: {
            total_payable: Number(payable._sum.balance || 0),
            total_overdue: Number(overdue._sum.balance || 0),
            total_paid_this_month: Number(paidThisMonth._sum.amount || 0),
        },
    };
}

// ==========================================
// GET AP SUMMARY (for Dashboard)
// ==========================================

export async function getAPSummary(farmId: string): Promise<APSummary> {
    const now = new Date();
    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(now.getDate() + 7);

    const [total, overdue, dueSoon, vendorCount] = await Promise.all([
        // Tổng phải trả
        prisma.aPTransaction.aggregate({
            where: { farm_id: farmId, type: 'INVOICE', balance: { gt: 0 }, deleted_at: null },
            _sum: { balance: true },
        }),
        // Quá hạn
        prisma.aPTransaction.aggregate({
            where: { farm_id: farmId, status: 'OVERDUE', deleted_at: null },
            _sum: { balance: true },
        }),
        // Đến hạn trong 7 ngày
        prisma.aPTransaction.count({
            where: {
                farm_id: farmId,
                type: 'INVOICE',
                balance: { gt: 0 },
                due_date: { gte: now, lte: sevenDaysLater },
                deleted_at: null,
            },
        }),
        // Số NCC đang nợ
        prisma.aPTransaction.groupBy({
            by: ['vendor_id'],
            where: { farm_id: farmId, type: 'INVOICE', balance: { gt: 0 }, deleted_at: null },
        }),
    ]);

    return {
        total_payable: Number(total._sum.balance || 0),
        total_overdue: Number(overdue._sum.balance || 0),
        due_soon_count: dueSoon,
        vendor_count: vendorCount.length,
    };
}

// ==========================================
// CREATE AP FROM PURCHASE
// ==========================================

export async function createAPFromPurchase(
    farmId: string,
    userId: string,
    input: CreateAPInput
): Promise<APTransaction> {
    return prisma.$transaction(
        async (tx) => {
            // 1. Validate vendor
            const vendor = await tx.partner.findUnique({
                where: { id: input.vendor_id },
                select: { id: true, name: true, payment_term_days: true },
            });

            if (!vendor) throw new Error('Nhà cung cấp không tồn tại');

            // 2. Generate code
            const code = await generateAPCode(tx, farmId);

            // 3. Calculate due date
            const transDate = new Date(input.trans_date);
            let dueDate = input.due_date ? new Date(input.due_date) : null;

            if (!dueDate && vendor.payment_term_days) {
                dueDate = new Date(transDate);
                dueDate.setDate(dueDate.getDate() + vendor.payment_term_days);
            }

            // 4. Create AP Transaction
            const apTrans = await tx.aPTransaction.create({
                data: {
                    farm_id: farmId,
                    vendor_id: input.vendor_id,
                    type: 'INVOICE',
                    code,
                    trans_date: transDate,
                    amount: input.amount,
                    paid_amount: 0,
                    balance: input.amount,
                    due_date: dueDate,
                    status: 'UNPAID',
                    transaction_id: input.transaction_id,
                    description: input.description,
                },
                include: {
                    vendor: { select: { id: true, code: true, name: true } },
                },
            });

            // 5. Update vendor balance (Ta nợ NCC = balance âm)
            await tx.partner.update({
                where: { id: input.vendor_id },
                data: { balance: { decrement: input.amount } },
            });

            return formatAPTransaction(apTrans);
        },
        { timeout: 10000 }
    );
}

// ==========================================
// MAKE PAYMENT
// ==========================================

export async function makePayment(
    farmId: string,
    userId: string,
    input: MakePaymentInput
): Promise<MakePaymentResponse> {
    return prisma.$transaction(
        async (tx) => {
            // 1. Validate vendor
            const vendor = await tx.partner.findFirst({
                where: { id: input.vendor_id, farm_id: farmId },
            });

            if (!vendor) throw new Error('Nhà cung cấp không tồn tại');

            // Note: Account balance checking is skipped since we don't have
            // a dedicated payment accounts table with balance tracking.
            // This should be implemented when cash/bank accounts are added.

            // 2. Get invoices to allocate
            let invoices: any[];

            if (input.invoice_ids && input.invoice_ids.length > 0) {
                invoices = await tx.aPTransaction.findMany({
                    where: {
                        id: { in: input.invoice_ids },
                        farm_id: farmId,
                        vendor_id: input.vendor_id,
                        type: 'INVOICE',
                        balance: { gt: 0 },
                    },
                    orderBy: { trans_date: 'asc' },
                });
            } else if (input.auto_allocate) {
                // FIFO - oldest first
                invoices = await tx.aPTransaction.findMany({
                    where: {
                        farm_id: farmId,
                        vendor_id: input.vendor_id,
                        type: 'INVOICE',
                        balance: { gt: 0 },
                    },
                    orderBy: { trans_date: 'asc' },
                });
            } else {
                invoices = [];
            }

            // 4. Create payment transaction (Expense)
            const paymentCode = await generatePaymentCode(tx, farmId);

            // Map payment method to Prisma enum
            const paymentMethodMap = {
                'CASH': 'CASH' as const,
                'BANK': 'BANK_TRANSFER' as const,
            };

            const payment = await tx.transaction.create({
                data: {
                    farm_id: farmId,
                    code: paymentCode,
                    trans_number: paymentCode,
                    trans_type: 'EXPENSE',
                    trans_date: new Date(input.payment_date),
                    partner_id: input.vendor_id,
                    payment_method: paymentMethodMap[input.payment_method],
                    amount: input.amount,
                    total_amount: input.amount,
                    paid_amount: input.amount,
                    payment_status: 'PAID',
                    description: `Trả tiền NCC ${vendor.name}`,
                    notes: input.notes,
                    created_by: userId,
                },
            });

            // 5. Create AP Payment record
            const apPaymentCode = await generateAPCode(tx, farmId, 'PAYMENT');

            await tx.aPTransaction.create({
                data: {
                    farm_id: farmId,
                    vendor_id: input.vendor_id,
                    type: 'PAYMENT',
                    code: apPaymentCode,
                    trans_date: new Date(input.payment_date),
                    amount: input.amount,
                    paid_amount: 0,
                    balance: 0,
                    status: 'PAID',
                    transaction_id: payment.id,
                    description: `Trả tiền - ${paymentCode}`,
                },
            });

            // 6. Allocate payment to invoices (FIFO)
            let remaining = input.amount;
            const allocations: MakePaymentResponse['allocations'] = [];

            for (const invoice of invoices) {
                if (remaining <= 0) break;

                const invoiceBalance = Number(invoice.balance);
                const allocateAmount = Math.min(remaining, invoiceBalance);

                const newBalance = invoiceBalance - allocateAmount;
                const newPaidAmount = Number(invoice.paid_amount) + allocateAmount;
                const newStatus = newBalance === 0 ? 'PAID' : 'PARTIAL';

                await tx.aPTransaction.update({
                    where: { id: invoice.id },
                    data: {
                        paid_amount: newPaidAmount,
                        balance: newBalance,
                        status: newStatus,
                    },
                });

                await tx.aPPaymentAllocation.create({
                    data: {
                        farm_id: farmId,
                        ap_transaction_id: invoice.id,
                        payment_id: payment.id,
                        amount: allocateAmount,
                    },
                });

                allocations.push({
                    invoice_id: invoice.id,
                    invoice_code: invoice.code,
                    amount_allocated: allocateAmount,
                    remaining_balance: newBalance,
                    status: newStatus,
                });

                // Sync to Transaction table (for Báo cáo Công nợ consistency)
                // AP code pattern: AP-MH-2411-002 -> Transaction code: MH-2411-002
                if (invoice.transaction_id) {
                    await tx.transaction.update({
                        where: { id: invoice.transaction_id },
                        data: {
                            paid_amount: newPaidAmount,
                            payment_status: newStatus,
                        },
                    });
                } else {
                    // Fallback: try to find by code pattern
                    const transCode = invoice.code.replace('AP-', '');
                    const linkedTrans = await tx.transaction.findFirst({
                        where: { code: transCode, farm_id: farmId },
                    });
                    if (linkedTrans) {
                        await tx.transaction.update({
                            where: { id: linkedTrans.id },
                            data: {
                                paid_amount: newPaidAmount,
                                payment_status: newStatus,
                            },
                        });
                    }
                }

                remaining -= allocateAmount;
            }

            // Note: Account balance update is skipped since Account model
            // is a chart of accounts, not a cash/bank account with balance.
            // When payment accounts are implemented, add balance update here.

            // 8. Update vendor balance
            await tx.partner.update({
                where: { id: input.vendor_id },
                data: { balance: { increment: input.amount } },
            });

            const updatedVendor = await tx.partner.findUnique({
                where: { id: input.vendor_id },
                select: { id: true, name: true, balance: true },
            });

            return {
                payment_id: payment.id,
                payment_code: paymentCode,
                amount: input.amount,
                allocations,
                vendor: {
                    id: input.vendor_id,
                    name: vendor.name,
                    new_balance: Number(updatedVendor?.balance || 0),
                },
            };
        },
        { timeout: 15000 }
    );
}

// ==========================================
// AP AGING REPORT
// ==========================================

export async function getAPAgingReport(farmId: string): Promise<APAgingReport> {
    const now = new Date();

    // Raw query with correct partner_type filter
    const items = await prisma.$queryRaw<
        Array<{
            vendor_id: string;
            vendor_code: string;
            vendor_name: string;
            total_balance: number;
            current_amount: number;
            days_1_30: number;
            days_31_60: number;
            days_61_90: number;
            over_90: number;
        }>
    >`
    SELECT 
      p.id as vendor_id,
      p.code as vendor_code,
      p.name as vendor_name,
      COALESCE(SUM(ap.balance), 0)::numeric as total_balance,
      COALESCE(SUM(CASE WHEN ap.due_date IS NULL OR ap.due_date >= ${now} THEN ap.balance ELSE 0 END), 0)::numeric as current_amount,
      COALESCE(SUM(CASE WHEN ap.due_date < ${now} AND ap.due_date >= ${now}::date - 30 THEN ap.balance ELSE 0 END), 0)::numeric as days_1_30,
      COALESCE(SUM(CASE WHEN ap.due_date < ${now}::date - 30 AND ap.due_date >= ${now}::date - 60 THEN ap.balance ELSE 0 END), 0)::numeric as days_31_60,
      COALESCE(SUM(CASE WHEN ap.due_date < ${now}::date - 60 AND ap.due_date >= ${now}::date - 90 THEN ap.balance ELSE 0 END), 0)::numeric as days_61_90,
      COALESCE(SUM(CASE WHEN ap.due_date < ${now}::date - 90 THEN ap.balance ELSE 0 END), 0)::numeric as over_90
    FROM partners p
    LEFT JOIN ap_transactions ap ON p.id = ap.vendor_id 
      AND ap.farm_id = ${farmId}::uuid
      AND ap.type = 'INVOICE'
      AND ap.balance > 0
      AND ap.deleted_at IS NULL
    WHERE p.farm_id = ${farmId}::uuid
      AND p.partner_type IN ('VENDOR', 'BOTH')
      AND p.deleted_at IS NULL
    GROUP BY p.id, p.code, p.name
    HAVING COALESCE(SUM(ap.balance), 0) > 0
    ORDER BY total_balance DESC
  `;

    const formattedItems = items.map((item) => ({
        vendor_id: item.vendor_id,
        vendor_code: item.vendor_code,
        vendor_name: item.vendor_name,
        total_balance: Number(item.total_balance),
        current: Number(item.current_amount),
        days_1_30: Number(item.days_1_30),
        days_31_60: Number(item.days_31_60),
        days_61_90: Number(item.days_61_90),
        over_90: Number(item.over_90),
    }));

    const totals = formattedItems.reduce(
        (acc, item) => ({
            total_balance: acc.total_balance + item.total_balance,
            current: acc.current + item.current,
            days_1_30: acc.days_1_30 + item.days_1_30,
            days_31_60: acc.days_31_60 + item.days_31_60,
            days_61_90: acc.days_61_90 + item.days_61_90,
            over_90: acc.over_90 + item.over_90,
        }),
        { total_balance: 0, current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, over_90: 0 }
    );

    return {
        as_of_date: now.toISOString().split('T')[0],
        items: formattedItems,
        totals,
        generated_at: now.toISOString(),
    };
}

// ==========================================
// PAYMENT SCHEDULE
// ==========================================

export async function getPaymentSchedule(farmId: string): Promise<PaymentSchedule> {
    const now = new Date();

    // Query from Transaction table instead of APTransaction
    const unpaidTransactions = await prisma.transaction.findMany({
        where: {
            farm_id: farmId,
            trans_type: { in: ['PURCHASE', 'EXPENSE'] },
            payment_status: { in: ['PENDING', 'PARTIAL', 'UNPAID'] },
            deleted_at: null,
        },
        include: {
            partner: { select: { id: true, name: true, payment_term_days: true } },
        },
        orderBy: { trans_date: 'asc' },
    });

    const thisWeekEnd = new Date(now);
    thisWeekEnd.setDate(now.getDate() + 7);

    const nextWeekEnd = new Date(thisWeekEnd);
    nextWeekEnd.setDate(thisWeekEnd.getDate() + 7);

    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const schedule: PaymentSchedule = {
        overdue: [],
        this_week: [],
        next_week: [],
        this_month: [],
        later: [],
        summary: {
            overdue_amount: 0,
            this_week_amount: 0,
            next_week_amount: 0,
            this_month_amount: 0,
        },
        generated_at: now.toISOString(),
    };

    for (const t of unpaidTransactions) {
        // Calculate due date from trans_date + payment_term_days
        const paymentTermDays = t.partner?.payment_term_days || 30;
        const dueDate = new Date(t.trans_date);
        dueDate.setDate(dueDate.getDate() + paymentTermDays);

        const daysUntilDue = Math.ceil(
            (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        const balance = Number(t.total_amount) - Number(t.paid_amount);

        const item = {
            invoice_id: t.id,
            invoice_code: t.code || '',
            vendor_id: t.partner_id || '',
            vendor_name: t.partner?.name || '',
            amount: Number(t.total_amount),
            balance: balance,
            due_date: dueDate.toISOString().split('T')[0],
            days_until_due: daysUntilDue,
            priority: (daysUntilDue < 0 ? 'high' : daysUntilDue <= 7 ? 'medium' : 'low') as
                | 'high'
                | 'medium'
                | 'low',
        };

        if (daysUntilDue < 0) {
            schedule.overdue.push(item);
            schedule.summary.overdue_amount += item.balance;
        } else if (dueDate <= thisWeekEnd) {
            schedule.this_week.push(item);
            schedule.summary.this_week_amount += item.balance;
        } else if (dueDate <= nextWeekEnd) {
            schedule.next_week.push(item);
            schedule.summary.next_week_amount += item.balance;
        } else if (dueDate <= thisMonthEnd) {
            schedule.this_month.push(item);
            schedule.summary.this_month_amount += item.balance;
        } else {
            schedule.later.push(item);
        }
    }

    return schedule;
}

// ==========================================
// CASH FLOW FORECAST
// ==========================================

export async function getCashFlowForecast(
    farmId: string,
    days: number = 30
): Promise<CashFlowForecast> {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + days);

    // Current total balance - placeholder since Account doesn't have balance
    // In a real implementation, this would sum cash/bank account balances
    const currentBalance = 0; // TODO: Implement when payment accounts are added

    // Get AR due dates (expected income)
    const arDue = await prisma.aRTransaction.findMany({
        where: {
            farm_id: farmId,
            type: 'INVOICE',
            balance: { gt: 0 },
            due_date: { gte: now, lte: endDate },
            deleted_at: null,
        },
        select: { due_date: true, balance: true },
    });

    // Get AP due dates (expected expense)
    const apDue = await prisma.aPTransaction.findMany({
        where: {
            farm_id: farmId,
            type: 'INVOICE',
            balance: { gt: 0 },
            due_date: { gte: now, lte: endDate },
            deleted_at: null,
        },
        select: { due_date: true, balance: true },
    });

    // Build daily forecast
    const dailyForecast: CashFlowForecast['daily_forecast'] = [];
    let runningBalance = currentBalance;
    let minBalance = currentBalance;
    let minBalanceDate = now.toISOString().split('T')[0];
    let daysWithNegative = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    for (let i = 0; i < days; i++) {
        const date = new Date(now);
        date.setDate(now.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        const income = arDue
            .filter((ar) => ar.due_date?.toISOString().split('T')[0] === dateStr)
            .reduce((sum, ar) => sum + Number(ar.balance), 0);

        const expense = apDue
            .filter((ap) => ap.due_date?.toISOString().split('T')[0] === dateStr)
            .reduce((sum, ap) => sum + Number(ap.balance), 0);

        const openingBalance = runningBalance;
        runningBalance = runningBalance + income - expense;

        if (runningBalance < minBalance) {
            minBalance = runningBalance;
            minBalanceDate = dateStr;
        }

        if (runningBalance < 0) {
            daysWithNegative++;
        }

        totalIncome += income;
        totalExpense += expense;

        dailyForecast.push({
            date: dateStr,
            expected_income: income,
            expected_expense: expense,
            payroll_due: 0, // TODO: Add payroll integration
            opening_balance: openingBalance,
            closing_balance: runningBalance,
            is_negative: runningBalance < 0,
        });
    }

    return {
        from_date: now.toISOString().split('T')[0],
        to_date: endDate.toISOString().split('T')[0],
        current_balance: currentBalance,
        daily_forecast: dailyForecast,
        summary: {
            total_expected_income: totalIncome,
            total_expected_expense: totalExpense,
            min_balance: minBalance,
            min_balance_date: minBalanceDate,
            days_with_negative_balance: daysWithNegative,
        },
        generated_at: now.toISOString(),
    };
}
