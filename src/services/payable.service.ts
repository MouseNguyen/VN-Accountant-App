// src/services/payable.service.ts
// Business logic cho Công nợ module với FIFO Payment Allocation

import { prismaBase } from '@/lib/prisma';
import prisma from '@/lib/prisma';
import { getCurrentFarmId, getContext } from '@/lib/context';
import { createAuditLog } from './audit-log.service';
import { roundMoney, toDecimal } from '@/lib/decimal';
import { Prisma, PartnerType } from '@prisma/client';
import type {
    PayableQueryInput,
    PayDebtInput,
    BulkPayDebtInput,
    PaymentHistoryQueryInput,
} from '@/lib/validations/payable';
import type {
    PartnerPayable,
    PayableListResponse,
    UnpaidInvoice,
    PaymentAllocationItem,
    PayDebtResult,
} from '@/types/payable';

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Tính số ngày quá hạn từ ngày đến hạn
 */
function calculateOverdueDays(dueDate: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
}

/**
 * Tính ngày đến hạn từ ngày giao dịch + payment_term_days
 */
function calculateDueDate(transDate: Date, paymentTermDays: number): Date {
    const dueDate = new Date(transDate);
    dueDate.setDate(dueDate.getDate() + paymentTermDays);
    return dueDate;
}

/**
 * Lấy danh sách hóa đơn chưa thanh toán hết của partner (FIFO order)
 */
async function getUnpaidInvoices(
    tx: Prisma.TransactionClient | typeof prisma,
    farmId: string,
    partnerId: string,
    paymentTermDays: number
): Promise<UnpaidInvoice[]> {
    // Lấy tất cả transactions chưa TT hết, sắp xếp theo ngày cũ nhất (FIFO)
    const transactions = await tx.transaction.findMany({
        where: {
            farm_id: farmId,
            partner_id: partnerId,
            deleted_at: null,
            payment_status: { in: ['PENDING', 'PARTIAL', 'UNPAID'] },
        },
        select: {
            id: true,
            code: true,
            trans_date: true,
            total_amount: true,
            paid_amount: true,
        },
        orderBy: { trans_date: 'asc' }, // FIFO: Cũ nhất trước
    });

    return transactions.map((t) => {
        const total = Number(t.total_amount);
        const paid = Number(t.paid_amount);
        const remaining = roundMoney(total - paid);
        const dueDate = calculateDueDate(t.trans_date, paymentTermDays);
        const overdueDays = calculateOverdueDays(dueDate);

        return {
            transaction_id: t.id,
            code: t.code,
            trans_date: t.trans_date.toISOString(),
            total_amount: total,
            paid_amount: paid,
            remaining,
            due_date: dueDate.toISOString(),
            overdue_days: overdueDays,
        };
    });
}

// ==========================================
// MAIN FUNCTIONS
// ==========================================

/**
 * Lấy danh sách công nợ với summary
 * Optimized: Batch query thay vì N+1
 */
export async function getPayables(params: PayableQueryInput): Promise<PayableListResponse> {
    const farmId = getCurrentFarmId();
    const {
        page,
        limit,
        partner_type,
        search,
        is_overdue,
        min_balance,
        include_invoices,
        sort_by,
        sort_order,
    } = params;
    const skip = (page - 1) * limit;

    // Build where clause
    const whereBase: Prisma.PartnerWhereInput = {
        farm_id: farmId,
        deleted_at: null,
        balance: { not: 0 }, // Chỉ lấy partner có nợ
    };

    if (partner_type) whereBase.partner_type = partner_type as PartnerType;

    if (search) {
        whereBase.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search.toUpperCase(), mode: 'insensitive' } },
            { phone: { contains: search } },
        ];
    }

    // Lấy partners có nợ
    const partners = await prisma.partner.findMany({
        where: whereBase,
        include: {
            _count: {
                select: {
                    transactions: { where: { deleted_at: null } },
                },
            },
        },
    });

    // Batch lấy unpaid invoices cho tất cả partners
    const partnerIds = partners.map((p) => p.id);
    const allUnpaidTransactions = await prisma.transaction.findMany({
        where: {
            farm_id: farmId,
            partner_id: { in: partnerIds },
            deleted_at: null,
            payment_status: { in: ['PENDING', 'PARTIAL', 'UNPAID'] },
        },
        select: {
            id: true,
            code: true,
            trans_date: true,
            total_amount: true,
            paid_amount: true,
            partner_id: true,
        },
        orderBy: { trans_date: 'asc' },
    });

    // Group by partner
    const unpaidByPartner = new Map<string, typeof allUnpaidTransactions>();
    allUnpaidTransactions.forEach((t) => {
        if (!unpaidByPartner.has(t.partner_id!)) {
            unpaidByPartner.set(t.partner_id!, []);
        }
        unpaidByPartner.get(t.partner_id!)!.push(t);
    });

    // Transform partners to payables
    let items: PartnerPayable[] = partners.map((p) => {
        const balance = Number(p.balance);
        const transactions = unpaidByPartner.get(p.id) || [];

        // Tính unpaid invoices
        const unpaidInvoices: UnpaidInvoice[] = transactions.map((t) => {
            const total = Number(t.total_amount);
            const paid = Number(t.paid_amount);
            const dueDate = calculateDueDate(t.trans_date, p.payment_term_days);

            return {
                transaction_id: t.id,
                code: t.code,
                trans_date: t.trans_date.toISOString(),
                total_amount: total,
                paid_amount: paid,
                remaining: roundMoney(total - paid),
                due_date: dueDate.toISOString(),
                overdue_days: calculateOverdueDays(dueDate),
            };
        });

        const oldestUnpaid = unpaidInvoices[0];
        const overdueDays = oldestUnpaid?.overdue_days || 0;

        const item: PartnerPayable = {
            id: p.id,
            partner_id: p.id, // alias
            code: p.code,
            partner_code: p.code, // alias
            name: p.name,
            partner_name: p.name, // alias
            partner_type: p.partner_type,
            phone: p.phone,
            balance: Math.abs(balance),
            credit_limit: Number(p.credit_limit),
            payment_term_days: p.payment_term_days,
            total_transactions: p._count.transactions,
            unpaid_transactions: unpaidInvoices.length,
            unpaid_invoice_count: unpaidInvoices.length, // alias
            oldest_unpaid_date: oldestUnpaid?.trans_date || null,
            overdue_days: overdueDays,
            overdue_balance: unpaidInvoices.filter(i => i.overdue_days > 0).reduce((sum, i) => sum + i.remaining, 0), // Số tiền quá hạn
            is_overdue: overdueDays > 0,
        };

        if (include_invoices) {
            item.unpaid_invoices = unpaidInvoices;
        }

        return item;
    });

    // Apply filters
    if (is_overdue !== undefined) {
        items = items.filter((i) => i.is_overdue === is_overdue);
    }

    if (min_balance !== undefined) {
        items = items.filter((i) => i.balance >= min_balance);
    }

    // Sort
    items.sort((a, b) => {
        let cmp = 0;
        switch (sort_by) {
            case 'balance':
                cmp = a.balance - b.balance;
                break;
            case 'name':
                cmp = a.name.localeCompare(b.name);
                break;
            case 'overdue_days':
                cmp = a.overdue_days - b.overdue_days;
                break;
        }
        return sort_order === 'desc' ? -cmp : cmp;
    });

    // Calculate summary from all data (không phải chỉ filtered)
    let totalReceivable = 0;
    let totalPayable = 0;
    let overdueCount = 0;
    let overdueAmount = 0;

    partners.forEach((p) => {
        const bal = Number(p.balance);
        const transactions = unpaidByPartner.get(p.id) || [];
        const oldestTrans = transactions[0];
        let isOver = false;

        if (oldestTrans) {
            const dueDate = calculateDueDate(oldestTrans.trans_date, p.payment_term_days);
            isOver = calculateOverdueDays(dueDate) > 0;
        }

        if (p.partner_type === 'CUSTOMER' && bal > 0) {
            totalReceivable += bal;
            if (isOver) {
                overdueCount++;
                overdueAmount += bal;
            }
        } else if (p.partner_type === 'VENDOR' && bal < 0) {
            totalPayable += Math.abs(bal);
            if (isOver) {
                overdueCount++;
                overdueAmount += Math.abs(bal);
            }
        }
    });

    // Pagination
    const total = items.length;
    const paginatedItems = items.slice(skip, skip + limit);

    return {
        items: paginatedItems,
        total,
        page,
        limit,
        hasMore: skip + paginatedItems.length < total,
        summary: {
            total_balance: roundMoney(totalReceivable + totalPayable),
            total_overdue: roundMoney(overdueAmount),
            total_current: roundMoney(totalReceivable + totalPayable - overdueAmount),
            partner_count: partners.length,
            total_receivable: roundMoney(totalReceivable),
            total_payable: roundMoney(totalPayable),
            overdue_count: overdueCount,
            overdue_amount: roundMoney(overdueAmount),
        },
    };
}

/**
 * Thanh toán công nợ với FIFO Allocation
 * Sử dụng SELECT FOR UPDATE để tránh race condition
 */
export async function payDebt(input: PayDebtInput): Promise<PayDebtResult> {
    const farmId = getCurrentFarmId();
    const context = getContext();

    return prismaBase.$transaction(
        async (tx) => {
            // 1. SELECT FOR UPDATE - Khóa Partner để tránh race condition
            const [partner] = await tx.$queryRaw<
                Array<{
                    id: string;
                    name: string;
                    partner_type: PartnerType;
                    balance: number;
                    payment_term_days: number;
                    version: number;
                }>
            >`
                SELECT id, name, partner_type, balance::float, payment_term_days, version 
                FROM partners 
                WHERE id = ${input.partner_id} 
                    AND farm_id = ${farmId} 
                    AND deleted_at IS NULL
                FOR UPDATE
            `;

            if (!partner) {
                throw new Error('Không tìm thấy đối tác');
            }

            const currentBalance = Number(partner.balance);
            const maxPayable = Math.abs(currentBalance);

            // 2. Validate số tiền
            if (maxPayable === 0) {
                throw new Error('Đối tác không có công nợ');
            }

            if (input.amount > maxPayable) {
                throw new Error(
                    `Số tiền thanh toán (${input.amount.toLocaleString()}đ) ` +
                    `vượt quá công nợ hiện tại (${maxPayable.toLocaleString()}đ)`
                );
            }

            // 3. Lấy unpaid invoices (FIFO order)
            const unpaidInvoices = await getUnpaidInvoices(
                tx,
                farmId,
                input.partner_id,
                partner.payment_term_days
            );

            // 4. Phân bổ thanh toán theo FIFO
            let remainingPayment = input.amount;
            const allocations: PaymentAllocationItem[] = [];

            for (const invoice of unpaidInvoices) {
                if (remainingPayment <= 0) break;

                const allocateAmount = Math.min(remainingPayment, invoice.remaining);

                // Cập nhật paid_amount của Transaction
                const newPaidAmount = roundMoney(invoice.paid_amount + allocateAmount);
                const newStatus = newPaidAmount >= invoice.total_amount ? 'PAID' : 'PARTIAL';

                await tx.transaction.update({
                    where: { id: invoice.transaction_id },
                    data: {
                        paid_amount: newPaidAmount,
                        payment_status: newStatus,
                    },
                });

                allocations.push({
                    transaction_id: invoice.transaction_id,
                    transaction_code: invoice.code,
                    amount: allocateAmount,
                    transaction_paid_before: invoice.paid_amount,
                    transaction_paid_after: newPaidAmount,
                });

                remainingPayment = roundMoney(remainingPayment - allocateAmount);
            }

            // 5. Tính balance mới
            // CUSTOMER có balance dương (họ nợ ta) → TT thì balance giảm
            // VENDOR có balance âm (ta nợ họ) → TT thì balance tăng (về 0)
            const newBalance =
                partner.partner_type === 'CUSTOMER'
                    ? roundMoney(currentBalance - input.amount)
                    : roundMoney(currentBalance + input.amount);

            // 6. Cập nhật Partner balance + version
            await tx.partner.update({
                where: { id: input.partner_id },
                data: {
                    balance: newBalance,
                    version: partner.version + 1,
                },
            });

            // 7. Tạo PaymentHistory
            const paymentHistory = await tx.paymentHistory.create({
                data: {
                    farm_id: farmId,
                    partner_id: input.partner_id,
                    amount: input.amount,
                    payment_method: input.payment_method || 'CASH',
                    payment_date: input.payment_date ? new Date(input.payment_date) : new Date(),
                    notes: input.note || null,
                    balance_before: currentBalance,
                    balance_after: newBalance,
                    created_by: context?.userId || null,
                },
            });

            // 8. Tạo PaymentAllocations
            for (const alloc of allocations) {
                await tx.paymentAllocation.create({
                    data: {
                        farm_id: farmId,
                        payment_id: paymentHistory.id,
                        transaction_id: alloc.transaction_id,
                        partner_id: input.partner_id,
                        amount: alloc.amount,
                        transaction_paid_before: alloc.transaction_paid_before,
                        transaction_paid_after: alloc.transaction_paid_after,
                    },
                });
            }

            // 9. Audit Log
            await createAuditLog({
                action: 'CREATE',
                entityType: 'PaymentHistory',
                entityId: paymentHistory.id,
                newValues: {
                    partner: partner.name,
                    amount: input.amount,
                    allocations_count: allocations.length,
                },
                description: `Thanh toán ${input.amount.toLocaleString()}đ cho ${partner.name} (${allocations.length} hóa đơn)`,
            });

            return {
                payment_id: paymentHistory.id,
                partner_id: input.partner_id,
                amount: input.amount,
                balance_before: currentBalance,
                balance_after: newBalance,
                allocations,
            };
        },
        { timeout: 15000 }
    );
}

/**
 * Thanh toán hàng loạt với FIFO
 */
export async function bulkPayDebt(input: BulkPayDebtInput) {
    const farmId = getCurrentFarmId();
    const context = getContext();

    return prismaBase.$transaction(
        async (tx) => {
            const results: Array<{
                partner_id: string;
                success: boolean;
                payment_id?: string;
                allocations_count?: number;
                error?: string;
            }> = [];

            for (const payment of input.payments) {
                try {
                    // SELECT FOR UPDATE cho từng partner
                    const [partner] = await tx.$queryRaw<
                        Array<{
                            id: string;
                            name: string;
                            partner_type: PartnerType;
                            balance: number;
                            payment_term_days: number;
                            version: number;
                        }>
                    >`
                        SELECT id, name, partner_type, balance::float, payment_term_days, version 
                        FROM partners 
                        WHERE id = ${payment.partner_id} 
                            AND farm_id = ${farmId} 
                            AND deleted_at IS NULL
                        FOR UPDATE
                    `;

                    if (!partner) {
                        results.push({
                            partner_id: payment.partner_id,
                            success: false,
                            error: 'Không tìm thấy',
                        });
                        continue;
                    }

                    const currentBalance = Number(partner.balance);
                    const maxPayable = Math.abs(currentBalance);

                    if (payment.amount > maxPayable) {
                        results.push({
                            partner_id: payment.partner_id,
                            success: false,
                            error: 'Vượt công nợ',
                        });
                        continue;
                    }

                    // FIFO allocation
                    const unpaidInvoices = await getUnpaidInvoices(
                        tx,
                        farmId,
                        payment.partner_id,
                        partner.payment_term_days
                    );
                    let remainingPayment = payment.amount;
                    const allocations: Array<{
                        transaction_id: string;
                        amount: number;
                        paid_before: number;
                        paid_after: number;
                    }> = [];

                    for (const invoice of unpaidInvoices) {
                        if (remainingPayment <= 0) break;

                        const allocateAmount = Math.min(remainingPayment, invoice.remaining);
                        const newPaidAmount = roundMoney(invoice.paid_amount + allocateAmount);
                        const newStatus =
                            newPaidAmount >= invoice.total_amount ? 'PAID' : 'PARTIAL';

                        await tx.transaction.update({
                            where: { id: invoice.transaction_id },
                            data: { paid_amount: newPaidAmount, payment_status: newStatus },
                        });

                        allocations.push({
                            transaction_id: invoice.transaction_id,
                            amount: allocateAmount,
                            paid_before: invoice.paid_amount,
                            paid_after: newPaidAmount,
                        });

                        remainingPayment = roundMoney(remainingPayment - allocateAmount);
                    }

                    const newBalance =
                        partner.partner_type === 'CUSTOMER'
                            ? roundMoney(currentBalance - payment.amount)
                            : roundMoney(currentBalance + payment.amount);

                    await tx.partner.update({
                        where: { id: payment.partner_id },
                        data: { balance: newBalance, version: partner.version + 1 },
                    });

                    const history = await tx.paymentHistory.create({
                        data: {
                            farm_id: farmId,
                            partner_id: payment.partner_id,
                            amount: payment.amount,
                            payment_method: input.payment_method || 'CASH',
                            payment_date: input.payment_date
                                ? new Date(input.payment_date)
                                : new Date(),
                            notes: input.note || null,
                            balance_before: currentBalance,
                            balance_after: newBalance,
                            created_by: context?.userId || null,
                        },
                    });

                    for (const alloc of allocations) {
                        await tx.paymentAllocation.create({
                            data: {
                                farm_id: farmId,
                                payment_id: history.id,
                                transaction_id: alloc.transaction_id,
                                partner_id: payment.partner_id,
                                amount: alloc.amount,
                                transaction_paid_before: alloc.paid_before,
                                transaction_paid_after: alloc.paid_after,
                            },
                        });
                    }

                    results.push({
                        partner_id: payment.partner_id,
                        success: true,
                        payment_id: history.id,
                        allocations_count: allocations.length,
                    });
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : 'Unknown error';
                    results.push({ partner_id: payment.partner_id, success: false, error: message });
                }
            }

            const successCount = results.filter((r) => r.success).length;

            await createAuditLog({
                action: 'CREATE',
                entityType: 'PaymentHistory',
                entityId: 'bulk',
                description: `Thanh toán hàng loạt: ${successCount}/${input.payments.length} thành công`,
            });

            return { results, success_count: successCount, total: input.payments.length };
        },
        { timeout: 60000 } // Timeout dài cho bulk
    );
}

/**
 * Lấy lịch sử thanh toán với allocations
 */
export async function getPaymentHistory(params: PaymentHistoryQueryInput) {
    const farmId = getCurrentFarmId();
    const { partner_id, page = 1, limit = 20, date_from, date_to } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentHistoryWhereInput = { farm_id: farmId };
    if (partner_id) where.partner_id = partner_id;

    if (date_from || date_to) {
        where.payment_date = {};
        if (date_from) where.payment_date.gte = new Date(date_from);
        if (date_to) {
            const end = new Date(date_to);
            end.setHours(23, 59, 59, 999);
            where.payment_date.lte = end;
        }
    }

    const [items, total] = await Promise.all([
        prisma.paymentHistory.findMany({
            where,
            orderBy: { payment_date: 'desc' },
            skip,
            take: limit,
            include: {
                partner: { select: { id: true, code: true, name: true, partner_type: true } },
                allocations: {
                    include: {
                        transaction: { select: { id: true, code: true, trans_type: true } },
                    },
                },
            },
        }),
        prisma.paymentHistory.count({ where }),
    ]);

    return {
        items: items.map((i) => ({
            id: i.id,
            partner_id: i.partner_id,
            partner: i.partner,
            amount: Number(i.amount),
            payment_method: i.payment_method,
            payment_date: i.payment_date.toISOString(),
            notes: i.notes,
            balance_before: Number(i.balance_before),
            balance_after: Number(i.balance_after),
            created_at: i.created_at.toISOString(),
            allocations: i.allocations.map((a) => ({
                transaction_id: a.transaction_id,
                transaction_code: a.transaction?.code || '',
                amount: Number(a.amount),
                transaction_paid_before: Number(a.transaction_paid_before),
                transaction_paid_after: Number(a.transaction_paid_after),
            })),
        })),
        total,
        page,
        limit,
        hasMore: skip + items.length < total,
    };
}

/**
 * Cập nhật hạn mức công nợ
 */
export async function updateCreditLimit(
    partnerId: string,
    creditLimit: number,
    paymentTermDays: number
) {
    const farmId = getCurrentFarmId();

    const partner = await prisma.partner.findFirst({
        where: { id: partnerId, farm_id: farmId, deleted_at: null },
    });

    if (!partner) throw new Error('Không tìm thấy đối tác');

    const updated = await prisma.partner.update({
        where: { id: partnerId },
        data: { credit_limit: creditLimit, payment_term_days: paymentTermDays },
    });

    await createAuditLog({
        action: 'UPDATE',
        entityType: 'Partner',
        entityId: partnerId,
        oldValues: {
            credit_limit: Number(partner.credit_limit),
            payment_term_days: partner.payment_term_days,
        },
        newValues: { credit_limit: creditLimit, payment_term_days: paymentTermDays },
        description: `Cập nhật hạn mức cho ${partner.name}`,
    });

    return updated;
}
