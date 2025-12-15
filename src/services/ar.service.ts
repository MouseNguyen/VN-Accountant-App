// src/services/ar.service.ts
// AR (Accounts Receivable) Service - Công nợ phải thu

import prisma from '@/lib/prisma';
import { roundMoney } from '@/lib/decimal';
import type {
    ARTransaction,
    ARListParams,
    ARListResponse,
    CreateARInput,
    CollectPaymentInput,
    CollectPaymentResponse,
    ARAgingReport,
    ARAgingItem,
    CustomerARSummary,
    ARSummary,
} from '@/types/ar';
import type { ARAPStatus } from '@prisma/client';

// ==========================================
// GET AR TRANSACTIONS
// ==========================================

export async function getARTransactions(
    farmId: string,
    params: ARListParams
): Promise<ARListResponse> {
    const { page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
        farm_id: farmId,
        deleted_at: null,
    };

    if (params.customer_id) where.customer_id = params.customer_id;
    if (params.type) where.type = params.type;
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
            { customer: { name: { contains: params.search, mode: 'insensitive' } } },
        ];
    }

    // Query
    const [items, total] = await Promise.all([
        prisma.aRTransaction.findMany({
            where,
            include: {
                customer: {
                    select: { id: true, code: true, name: true, phone: true },
                },
            },
            orderBy: { [params.sort_by || 'trans_date']: params.sort_order || 'desc' },
            skip,
            take: limit,
        }),
        prisma.aRTransaction.count({ where }),
    ]);

    // Summary
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [receivable, overdue, paidThisMonth] = await Promise.all([
        prisma.aRTransaction.aggregate({
            where: { farm_id: farmId, deleted_at: null, type: 'INVOICE', balance: { gt: 0 } },
            _sum: { balance: true },
        }),
        prisma.aRTransaction.aggregate({
            where: { farm_id: farmId, deleted_at: null, status: 'OVERDUE', balance: { gt: 0 } },
            _sum: { balance: true },
        }),
        prisma.aRTransaction.aggregate({
            where: {
                farm_id: farmId,
                type: 'PAYMENT',
                trans_date: { gte: thisMonthStart },
                deleted_at: null,
            },
            _sum: { amount: true },
        }),
    ]);

    return {
        items: items.map(formatARTransaction),
        total,
        page,
        limit,
        hasMore: page * limit < total,
        summary: {
            total_receivable: roundMoney(Number(receivable._sum.balance || 0)),
            total_overdue: roundMoney(Number(overdue._sum.balance || 0)),
            total_paid_this_month: roundMoney(Number(paidThisMonth._sum.amount || 0)),
        },
    };
}

// ==========================================
// GET AR TRANSACTION BY ID
// ==========================================

export async function getARTransactionById(
    farmId: string,
    id: string
): Promise<ARTransaction | null> {
    const ar = await prisma.aRTransaction.findFirst({
        where: { id, farm_id: farmId, deleted_at: null },
        include: {
            customer: {
                select: { id: true, code: true, name: true, phone: true, email: true },
            },
            payments: true,
        },
    });

    return ar ? formatARTransaction(ar) : null;
}

// ==========================================
// CREATE AR FROM SALE
// ==========================================

export async function createARFromSale(
    farmId: string,
    input: CreateARInput,
    userId?: string
): Promise<ARTransaction> {
    return prisma.$transaction(
        async (tx) => {
            // 1. Kiểm tra customer
            const customer = await tx.partner.findFirst({
                where: { id: input.customer_id, farm_id: farmId, partner_type: 'CUSTOMER' },
                select: {
                    id: true,
                    name: true,
                    credit_limit: true,
                    balance: true,
                    payment_term_days: true,
                },
            });

            if (!customer) throw new Error('Khách hàng không tồn tại');

            // 2. Check credit limit
            if (customer.credit_limit && Number(customer.credit_limit) > 0) {
                const newBalance = Number(customer.balance || 0) + input.amount;
                if (newBalance > Number(customer.credit_limit)) {
                    throw new Error(
                        `Vượt hạn mức tín dụng. Hạn mức: ${roundMoney(Number(customer.credit_limit)).toLocaleString()}đ, ` +
                        `Công nợ hiện tại: ${roundMoney(Number(customer.balance || 0)).toLocaleString()}đ`
                    );
                }
            }

            // 3. Generate code
            const code = await generateARCode(tx, farmId, 'INVOICE');

            // 4. Calculate due date
            const transDate = new Date(input.trans_date);
            let dueDate = input.due_date ? new Date(input.due_date) : null;

            if (!dueDate && customer.payment_term_days) {
                dueDate = new Date(transDate);
                dueDate.setDate(dueDate.getDate() + customer.payment_term_days);
            }

            // 5. Create AR Transaction
            const arTrans = await tx.aRTransaction.create({
                data: {
                    farm_id: farmId,
                    customer_id: input.customer_id,
                    type: 'INVOICE',
                    code,
                    trans_date: transDate,
                    amount: input.amount,
                    paid_amount: 0,
                    balance: input.amount,
                    due_date: dueDate,
                    status: 'UNPAID',
                    transaction_id: input.transaction_id || null,
                    description: input.description || null,
                },
                include: {
                    customer: { select: { id: true, code: true, name: true } },
                },
            });

            // 6. Update customer balance
            await tx.partner.update({
                where: { id: input.customer_id },
                data: {
                    balance: { increment: input.amount }, // KH nợ ta
                },
            });

            return formatARTransaction(arTrans);
        },
        { timeout: 10000 }
    );
}

// ==========================================
// COLLECT PAYMENT
// ==========================================

export async function collectPayment(
    farmId: string,
    input: CollectPaymentInput,
    userId?: string
): Promise<CollectPaymentResponse> {
    return prisma.$transaction(
        async (tx) => {
            // 1. Validate customer
            const customer = await tx.partner.findFirst({
                where: { id: input.customer_id, farm_id: farmId, partner_type: 'CUSTOMER' },
            });

            if (!customer) throw new Error('Khách hàng không tồn tại');

            // 2. Get invoices to allocate
            let invoices: any[];

            if (input.invoice_ids && input.invoice_ids.length > 0) {
                // Specific invoices
                invoices = await tx.aRTransaction.findMany({
                    where: {
                        id: { in: input.invoice_ids },
                        farm_id: farmId,
                        customer_id: input.customer_id,
                        type: 'INVOICE',
                        balance: { gt: 0 },
                        deleted_at: null,
                    },
                    orderBy: { trans_date: 'asc' },
                });
            } else if (input.auto_allocate !== false) {
                // FIFO - oldest first
                invoices = await tx.aRTransaction.findMany({
                    where: {
                        farm_id: farmId,
                        customer_id: input.customer_id,
                        type: 'INVOICE',
                        balance: { gt: 0 },
                        deleted_at: null,
                    },
                    orderBy: { trans_date: 'asc' },
                });
            } else {
                invoices = [];
            }

            // 3. Generate payment code
            const paymentCode = await generateARCode(tx, farmId, 'PAYMENT');

            // 4. Create AR Payment record
            const arPayment = await tx.aRTransaction.create({
                data: {
                    farm_id: farmId,
                    customer_id: input.customer_id,
                    type: 'PAYMENT',
                    code: paymentCode,
                    trans_date: new Date(input.payment_date),
                    amount: input.amount,
                    paid_amount: 0,
                    balance: 0,
                    status: 'PAID',
                    description: `Thu tiền - ${input.payment_method}`,
                    notes: input.notes || null,
                },
            });

            // 5. Allocate payment to invoices
            let remaining = input.amount;
            const allocations: CollectPaymentResponse['allocations'] = [];

            for (const invoice of invoices) {
                if (remaining <= 0) break;

                const invoiceBalance = Number(invoice.balance);
                const allocateAmount = Math.min(remaining, invoiceBalance);

                // Update invoice
                const newBalance = invoiceBalance - allocateAmount;
                const newPaidAmount = Number(invoice.paid_amount) + allocateAmount;
                const newStatus: ARAPStatus = newBalance === 0 ? 'PAID' : 'PARTIAL';

                await tx.aRTransaction.update({
                    where: { id: invoice.id },
                    data: {
                        paid_amount: newPaidAmount,
                        balance: newBalance,
                        status: newStatus,
                    },
                });

                // Create allocation record
                await tx.aRPaymentAllocation.create({
                    data: {
                        farm_id: farmId,
                        ar_transaction_id: invoice.id,
                        payment_id: arPayment.id,
                        amount: allocateAmount,
                    },
                });

                allocations.push({
                    invoice_id: invoice.id,
                    invoice_code: invoice.code,
                    amount_allocated: roundMoney(allocateAmount),
                    remaining_balance: roundMoney(newBalance),
                    status: newStatus,
                });

                remaining -= allocateAmount;
            }

            // 6. Update customer balance
            await tx.partner.update({
                where: { id: input.customer_id },
                data: {
                    balance: { decrement: input.amount },
                },
            });

            // Get new customer balance
            const updatedCustomer = await tx.partner.findUnique({
                where: { id: input.customer_id },
                select: { id: true, name: true, balance: true },
            });

            return {
                payment_id: arPayment.id,
                payment_code: paymentCode,
                amount: roundMoney(input.amount),
                allocations,
                customer: {
                    id: input.customer_id,
                    name: customer.name,
                    new_balance: roundMoney(Number(updatedCustomer?.balance || 0)),
                },
            };
        },
        { timeout: 15000 }
    );
}

// ==========================================
// AR AGING REPORT
// ==========================================

export async function getARAgingReport(farmId: string): Promise<ARAgingReport> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // FIX: Use Transaction table instead of legacy ar_transactions
    // Query INCOME transactions with outstanding balance, grouped by customer
    const items = await prisma.$queryRaw<
        Array<{
            customer_id: string;
            customer_code: string;
            customer_name: string;
            total_balance: number;
            current_amount: number;
            days_1_30: number;
            days_31_60: number;
            days_61_90: number;
            over_90: number;
        }>
    >`
    SELECT 
      p.id as customer_id,
      p.code as customer_code,
      p.name as customer_name,
      COALESCE(SUM(t.total_amount - t.paid_amount), 0)::numeric as total_balance,
      COALESCE(SUM(
        CASE WHEN (t.trans_date + COALESCE(p.payment_term_days, 30) * INTERVAL '1 day') >= ${now} 
        THEN t.total_amount - t.paid_amount ELSE 0 END
      ), 0)::numeric as current_amount,
      COALESCE(SUM(
        CASE WHEN (t.trans_date + COALESCE(p.payment_term_days, 30) * INTERVAL '1 day') < ${now} 
             AND (t.trans_date + COALESCE(p.payment_term_days, 30) * INTERVAL '1 day') >= ${now}::date - 30 
        THEN t.total_amount - t.paid_amount ELSE 0 END
      ), 0)::numeric as days_1_30,
      COALESCE(SUM(
        CASE WHEN (t.trans_date + COALESCE(p.payment_term_days, 30) * INTERVAL '1 day') < ${now}::date - 30 
             AND (t.trans_date + COALESCE(p.payment_term_days, 30) * INTERVAL '1 day') >= ${now}::date - 60 
        THEN t.total_amount - t.paid_amount ELSE 0 END
      ), 0)::numeric as days_31_60,
      COALESCE(SUM(
        CASE WHEN (t.trans_date + COALESCE(p.payment_term_days, 30) * INTERVAL '1 day') < ${now}::date - 60 
             AND (t.trans_date + COALESCE(p.payment_term_days, 30) * INTERVAL '1 day') >= ${now}::date - 90 
        THEN t.total_amount - t.paid_amount ELSE 0 END
      ), 0)::numeric as days_61_90,
      COALESCE(SUM(
        CASE WHEN (t.trans_date + COALESCE(p.payment_term_days, 30) * INTERVAL '1 day') < ${now}::date - 90 
        THEN t.total_amount - t.paid_amount ELSE 0 END
      ), 0)::numeric as over_90
    FROM partners p
    LEFT JOIN transactions t ON p.id = t.partner_id 
      AND t.farm_id = ${farmId}
      AND t.trans_type = 'INCOME'
      AND t.payment_status IN ('PENDING', 'PARTIAL', 'UNPAID')
      AND (t.total_amount - t.paid_amount) > 0
      AND t.deleted_at IS NULL
    WHERE p.farm_id = ${farmId}
      AND p.partner_type IN ('CUSTOMER', 'BOTH')
      AND p.deleted_at IS NULL
    GROUP BY p.id, p.code, p.name
    HAVING COALESCE(SUM(t.total_amount - t.paid_amount), 0) > 0
    ORDER BY total_balance DESC
  `;

    const formattedItems: ARAgingItem[] = items.map((item) => ({
        customer_id: item.customer_id,
        customer_code: item.customer_code,
        customer_name: item.customer_name,
        total_balance: roundMoney(Number(item.total_balance)),
        current: roundMoney(Number(item.current_amount)),
        days_1_30: roundMoney(Number(item.days_1_30)),
        days_31_60: roundMoney(Number(item.days_31_60)),
        days_61_90: roundMoney(Number(item.days_61_90)),
        over_90: roundMoney(Number(item.over_90)),
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
        as_of_date: today,
        items: formattedItems,
        totals,
        generated_at: now.toISOString(),
    };
}

// ==========================================
// CUSTOMER AR SUMMARY
// ==========================================

export async function getCustomerARSummary(
    farmId: string,
    customerId: string
): Promise<CustomerARSummary> {
    const customer = await prisma.partner.findFirst({
        where: { id: customerId, farm_id: farmId, partner_type: 'CUSTOMER' },
    });

    if (!customer) throw new Error('Khách hàng không tồn tại');

    // Invoices summary
    const invoiceSummary = await prisma.aRTransaction.aggregate({
        where: {
            farm_id: farmId,
            customer_id: customerId,
            type: 'INVOICE',
            deleted_at: null,
        },
        _sum: { amount: true, paid_amount: true, balance: true },
        _count: true,
    });

    // Overdue
    const overdueSummary = await prisma.aRTransaction.aggregate({
        where: {
            farm_id: farmId,
            customer_id: customerId,
            type: 'INVOICE',
            status: 'OVERDUE',
            deleted_at: null,
        },
        _sum: { balance: true },
        _count: true,
    });

    // Oldest overdue
    const oldestOverdue = await prisma.aRTransaction.findFirst({
        where: {
            farm_id: farmId,
            customer_id: customerId,
            status: 'OVERDUE',
            deleted_at: null,
        },
        orderBy: { due_date: 'asc' },
        select: { due_date: true },
    });

    // Recent invoices & payments
    const [recentInvoices, recentPayments] = await Promise.all([
        prisma.aRTransaction.findMany({
            where: { farm_id: farmId, customer_id: customerId, type: 'INVOICE', deleted_at: null },
            orderBy: { trans_date: 'desc' },
            take: 5,
            include: { customer: { select: { id: true, code: true, name: true } } },
        }),
        prisma.aRTransaction.findMany({
            where: { farm_id: farmId, customer_id: customerId, type: 'PAYMENT', deleted_at: null },
            orderBy: { trans_date: 'desc' },
            take: 5,
            include: { customer: { select: { id: true, code: true, name: true } } },
        }),
    ]);

    const creditLimit = roundMoney(Number(customer.credit_limit || 0));
    const creditUsed = roundMoney(Number(customer.balance || 0));

    return {
        customer_id: customerId,
        customer_name: customer.name,

        credit_limit: creditLimit,
        credit_used: creditUsed,
        credit_available: creditLimit - creditUsed,
        credit_utilization_percent: creditLimit > 0 ? (creditUsed / creditLimit) * 100 : 0,

        total_invoices: invoiceSummary._count,
        total_amount: roundMoney(Number(invoiceSummary._sum.amount || 0)),
        total_paid: roundMoney(Number(invoiceSummary._sum.paid_amount || 0)),
        total_balance: roundMoney(Number(invoiceSummary._sum.balance || 0)),

        overdue_amount: roundMoney(Number(overdueSummary._sum.balance || 0)),
        overdue_count: overdueSummary._count,
        oldest_overdue_days: oldestOverdue?.due_date
            ? Math.floor((Date.now() - oldestOverdue.due_date.getTime()) / (1000 * 60 * 60 * 24))
            : 0,

        last_invoice_date: recentInvoices[0]?.trans_date.toISOString().split('T')[0],
        last_payment_date: recentPayments[0]?.trans_date.toISOString().split('T')[0],
        avg_days_to_pay: 0, // TODO: Calculate from paid invoices

        recent_invoices: recentInvoices.map(formatARTransaction),
        recent_payments: recentPayments.map(formatARTransaction),
    };
}

// ==========================================
// AR SUMMARY (FOR DASHBOARD)
// ==========================================

export async function getARSummary(farmId: string): Promise<ARSummary> {
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const today = new Date();

    // Use Transaction table instead of legacy ARTransaction
    const unpaidIncomeTransactions = await prisma.transaction.findMany({
        where: {
            farm_id: farmId,
            deleted_at: null,
            trans_type: 'INCOME',
            payment_status: { in: ['PENDING', 'PARTIAL', 'UNPAID'] },
        },
        select: {
            id: true,
            partner_id: true,
            total_amount: true,
            paid_amount: true,
            trans_date: true,
            partner: { select: { payment_term_days: true } },
        },
    });

    let totalReceivable = 0;
    let totalOverdue = 0;
    let overdueCount = 0;
    const customerIds = new Set<string>();

    for (const t of unpaidIncomeTransactions) {
        const remaining = Number(t.total_amount) - Number(t.paid_amount);
        if (remaining <= 0) continue;

        totalReceivable += remaining;

        if (t.partner_id) {
            customerIds.add(t.partner_id);
        }

        // Check if overdue based on trans_date + payment_term_days
        const paymentTermDays = t.partner?.payment_term_days || 30;
        const dueDate = new Date(t.trans_date);
        dueDate.setDate(dueDate.getDate() + paymentTermDays);

        if (dueDate < today) {
            totalOverdue += remaining;
            overdueCount++;
        }
    }

    // Collected this month - INCOME transactions that were paid this month
    const paidThisMonth = await prisma.transaction.aggregate({
        where: {
            farm_id: farmId,
            deleted_at: null,
            trans_type: 'INCOME',
            payment_status: 'PAID',
            updated_at: { gte: thisMonthStart },
        },
        _sum: { paid_amount: true },
    });

    return {
        total_receivable: roundMoney(totalReceivable),
        total_overdue: roundMoney(totalOverdue),
        overdue_count: overdueCount,
        total_customers_with_debt: customerIds.size,
        collected_this_month: roundMoney(Number(paidThisMonth._sum.paid_amount || 0)),
    };
}

// ==========================================
// HELPERS
// ==========================================

async function generateARCode(
    tx: any,
    farmId: string,
    type: 'INVOICE' | 'PAYMENT' = 'INVOICE'
): Promise<string> {
    const prefix = type === 'INVOICE' ? 'AR' : 'RC'; // AR = Accounts Receivable, RC = Receipt
    const today = new Date();
    const dateCode = today.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD

    const count = await tx.aRTransaction.count({
        where: {
            farm_id: farmId,
            code: { startsWith: `${prefix}${dateCode}` },
        },
    });

    return `${prefix}${dateCode}-${String(count + 1).padStart(3, '0')}`;
}

function formatARTransaction(ar: any): ARTransaction {
    const now = new Date();
    const dueDate = ar.due_date ? new Date(ar.due_date) : null;
    const daysOverdue =
        dueDate && dueDate < now && Number(ar.balance) > 0
            ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0;

    return {
        id: ar.id,
        farm_id: ar.farm_id,
        customer_id: ar.customer_id,
        customer: ar.customer,
        type: ar.type,
        code: ar.code,
        trans_date: ar.trans_date.toISOString().split('T')[0],
        amount: roundMoney(Number(ar.amount)),
        paid_amount: roundMoney(Number(ar.paid_amount)),
        balance: roundMoney(Number(ar.balance)),
        due_date: ar.due_date?.toISOString().split('T')[0] || null,
        days_overdue: daysOverdue,
        status: ar.status,
        transaction_id: ar.transaction_id,
        description: ar.description,
        notes: ar.notes,
        created_at: ar.created_at.toISOString(),
        updated_at: ar.updated_at.toISOString(),
        payments: ar.payments,
    };
}
