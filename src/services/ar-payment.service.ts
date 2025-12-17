// src/services/ar-payment.service.ts
// AR Payment Service - Phase 4 Task 4

import prisma from '@/lib/prisma';
import { roundMoney } from '@/lib/decimal';
import type {
    ARPayment,
    ARPaymentListParams,
    ARPaymentListResponse,
    CreateARPaymentInput,
    UpdateARPaymentInput,
    AllocatePaymentInput,
} from '@/types/ar-payment';

// ==========================================
// GET AR PAYMENTS (LIST)
// ==========================================

export async function getARPayments(
    farmId: string,
    params: ARPaymentListParams
): Promise<ARPaymentListResponse> {
    const { page = 1, limit = 20, status, customer_id, from_date, to_date, search } = params;
    const skip = (page - 1) * limit;

    const where: any = { farm_id: farmId };

    if (status) where.status = status;
    if (customer_id) where.customer_id = customer_id;
    if (from_date) where.payment_date = { ...where.payment_date, gte: new Date(from_date) };
    if (to_date) where.payment_date = { ...where.payment_date, lte: new Date(to_date) };
    if (search) {
        where.OR = [
            { payment_number: { contains: search, mode: 'insensitive' } },
            { reference: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [items, total] = await Promise.all([
        prisma.aRPayment.findMany({
            where,
            orderBy: { payment_date: 'desc' },
            skip,
            take: limit,
            include: {
                customer: { select: { id: true, name: true, code: true } },
                allocations: {
                    include: {
                        invoice: { select: { invoice_number: true, total_amount: true } },
                    },
                },
            },
        }),
        prisma.aRPayment.count({ where }),
    ]);

    // Summary
    const summary = await prisma.aRPayment.aggregate({
        where: { farm_id: farmId },
        _count: true,
        _sum: { amount: true, allocated_amount: true },
    });

    const totalAmount = Number(summary._sum.amount || 0);
    const totalAllocated = Number(summary._sum.allocated_amount || 0);

    return {
        items: items.map(formatARPayment),
        total,
        page,
        limit,
        summary: {
            total_payments: summary._count,
            total_amount: roundMoney(totalAmount),
            total_allocated: roundMoney(totalAllocated),
            total_unallocated: roundMoney(totalAmount - totalAllocated),
        },
    };
}

// ==========================================
// GET AR PAYMENT BY ID
// ==========================================

export async function getARPaymentById(
    farmId: string,
    id: string
): Promise<ARPayment | null> {
    const payment = await prisma.aRPayment.findFirst({
        where: { id, farm_id: farmId },
        include: {
            customer: { select: { id: true, name: true, code: true } },
            allocations: {
                include: {
                    invoice: { select: { invoice_number: true, total_amount: true } },
                },
            },
        },
    });

    return payment ? formatARPayment(payment) : null;
}

// ==========================================
// CREATE AR PAYMENT
// ==========================================

export async function createARPayment(
    input: CreateARPaymentInput
): Promise<ARPayment> {
    const paymentNumber = await generatePaymentNumber(input.farm_id, 'PT');

    const payment = await prisma.aRPayment.create({
        data: {
            farm_id: input.farm_id,
            payment_number: paymentNumber,
            payment_date: new Date(input.payment_date),
            customer_id: input.customer_id,
            payment_method: input.payment_method,
            amount: input.amount,
            allocated_amount: 0,
            status: 'DRAFT',
            bank_account_id: input.bank_account_id,
            reference: input.reference,
            notes: input.notes,
            created_by: input.created_by,
        },
        include: {
            customer: { select: { id: true, name: true, code: true } },
        },
    });

    return formatARPayment(payment);
}

// ==========================================
// UPDATE AR PAYMENT (DRAFT ONLY)
// ==========================================

export async function updateARPayment(
    farmId: string,
    id: string,
    input: UpdateARPaymentInput
): Promise<ARPayment> {
    const payment = await prisma.aRPayment.findFirst({
        where: { id, farm_id: farmId },
    });

    if (!payment) throw new Error('Phiếu thu không tồn tại');
    if (payment.status !== 'DRAFT') throw new Error('Chỉ có thể sửa phiếu thu nháp');

    const updated = await prisma.aRPayment.update({
        where: { id },
        data: {
            payment_date: input.payment_date ? new Date(input.payment_date) : undefined,
            payment_method: input.payment_method,
            amount: input.amount,
            bank_account_id: input.bank_account_id,
            reference: input.reference,
            notes: input.notes,
        },
        include: {
            customer: { select: { id: true, name: true, code: true } },
        },
    });

    return formatARPayment(updated);
}

// ==========================================
// DELETE AR PAYMENT (DRAFT ONLY)
// ==========================================

export async function deleteARPayment(
    farmId: string,
    id: string
): Promise<void> {
    const payment = await prisma.aRPayment.findFirst({
        where: { id, farm_id: farmId },
    });

    if (!payment) throw new Error('Phiếu thu không tồn tại');
    if (payment.status !== 'DRAFT') throw new Error('Chỉ có thể xóa phiếu thu nháp');

    await prisma.aRPayment.delete({ where: { id } });
}

// ==========================================
// POST AR PAYMENT
// ==========================================

export interface PostPaymentResult {
    payment: ARPayment;
    journal_entry_id: string;
}

export async function postPayment(
    farmId: string,
    paymentId: string,
    userId: string
): Promise<PostPaymentResult> {
    // 1. Validate payment
    const payment = await prisma.aRPayment.findFirst({
        where: { id: paymentId, farm_id: farmId },
        include: { customer: true },
    });

    if (!payment) throw new Error('Phiếu thu không tồn tại');
    if (payment.status !== 'DRAFT') throw new Error('Chỉ có thể ghi sổ phiếu thu nháp');

    // 2. Execute in transaction
    const result = await prisma.$transaction(async (tx) => {
        // 2a. Create journal entry
        const journalNumber = await generateJournalNumberForPayment(tx, farmId, payment.payment_date);
        const journalEntry = await tx.transaction.create({
            data: {
                farm_id: farmId,
                trans_number: journalNumber,
                code: journalNumber,
                trans_date: payment.payment_date,
                trans_type: 'CASH_IN',
                partner_id: payment.customer_id,
                partner_name: payment.customer?.name,
                amount: payment.amount,
                subtotal: payment.amount,
                total_amount: payment.amount,
                payment_status: 'PAID',
                paid_amount: payment.amount,
                payment_method: payment.payment_method as any,
                debit_account: '112', // Tiền gửi ngân hàng (or 111 for cash)
                credit_account: '131', // Công nợ phải thu
                description: `Thu tiền KH - ${payment.payment_number}`,
                notes: payment.notes,
                cash_in_category: 'RECEIVABLE',
                created_by: userId,
            },
        });

        // 2b. Update customer balance (giảm công nợ)
        await tx.partner.update({
            where: { id: payment.customer_id },
            data: { balance: { decrement: payment.amount } },
        });

        // 2c. Update payment status
        const updated = await tx.aRPayment.update({
            where: { id: paymentId },
            data: {
                status: 'POSTED',
                posted_at: new Date(),
                posted_by: userId,
                journal_entry_id: journalEntry.id,
            },
            include: {
                customer: { select: { id: true, name: true, code: true } },
                allocations: true,
            },
        });

        return { payment: updated, journalEntry };
    });

    return {
        payment: formatARPayment(result.payment),
        journal_entry_id: result.journalEntry.id,
    };
}

// ==========================================
// ALLOCATE PAYMENT (MANUAL)
// ==========================================

export async function allocatePayment(
    farmId: string,
    paymentId: string,
    input: AllocatePaymentInput
): Promise<ARPayment> {
    const payment = await prisma.aRPayment.findFirst({
        where: { id: paymentId, farm_id: farmId },
    });

    if (!payment) throw new Error('Phiếu thu không tồn tại');
    if (payment.status === 'VOID') throw new Error('Không thể phân bổ phiếu thu đã hủy');

    // Validate total allocation
    const totalAllocation = input.allocations.reduce((sum, a) => sum + a.amount, 0);
    const remaining = Number(payment.amount) - Number(payment.allocated_amount);

    if (totalAllocation > remaining + 0.01) {
        throw new Error(`Số tiền phân bổ (${totalAllocation}) vượt quá số dư (${remaining})`);
    }

    return prisma.$transaction(async (tx) => {
        for (const alloc of input.allocations) {
            // Validate invoice
            const invoice = await tx.aRInvoice.findFirst({
                where: { id: alloc.invoice_id, farm_id: farmId },
            });

            if (!invoice) throw new Error(`Hóa đơn ${alloc.invoice_id} không tồn tại`);
            if (invoice.status === 'PAID') throw new Error(`Hóa đơn ${invoice.invoice_number} đã thanh toán đủ`);
            if (invoice.status === 'VOID') throw new Error(`Hóa đơn ${invoice.invoice_number} đã hủy`);

            const invoiceBalance = Number(invoice.total_amount) - Number(invoice.paid_amount);
            if (alloc.amount > invoiceBalance + 0.01) {
                throw new Error(`Số tiền phân bổ vượt quá số dư hóa đơn ${invoice.invoice_number}`);
            }

            // Check if allocation already exists
            const existing = await tx.aRInvoicePaymentAllocation.findUnique({
                where: { payment_id_invoice_id: { payment_id: paymentId, invoice_id: alloc.invoice_id } },
            });

            if (existing) {
                // Update existing allocation
                await tx.aRInvoicePaymentAllocation.update({
                    where: { id: existing.id },
                    data: { amount: { increment: alloc.amount } },
                });
            } else {
                // Create new allocation
                await tx.aRInvoicePaymentAllocation.create({
                    data: {
                        farm_id: farmId,
                        payment_id: paymentId,
                        invoice_id: alloc.invoice_id,
                        amount: alloc.amount,
                    },
                });
            }

            // Update invoice paid_amount and status
            const newPaidAmount = Number(invoice.paid_amount) + alloc.amount;
            const newStatus = newPaidAmount >= Number(invoice.total_amount) ? 'PAID' : 'PARTIALLY_PAID';

            await tx.aRInvoice.update({
                where: { id: alloc.invoice_id },
                data: {
                    paid_amount: newPaidAmount,
                    status: newStatus,
                },
            });
        }

        // Update payment allocated_amount
        const updated = await tx.aRPayment.update({
            where: { id: paymentId },
            data: {
                allocated_amount: { increment: totalAllocation },
            },
            include: {
                customer: { select: { id: true, name: true, code: true } },
                allocations: {
                    include: {
                        invoice: { select: { invoice_number: true, total_amount: true } },
                    },
                },
            },
        });

        return formatARPayment(updated);
    });
}

// ==========================================
// AUTO-ALLOCATE FIFO
// ==========================================

export interface AutoAllocateResult {
    payment: ARPayment;
    allocations: { invoice_id: string; invoice_number: string; amount: number }[];
}

export async function autoAllocateFIFO(
    farmId: string,
    paymentId: string
): Promise<AutoAllocateResult> {
    const payment = await prisma.aRPayment.findFirst({
        where: { id: paymentId, farm_id: farmId },
    });

    if (!payment) throw new Error('Phiếu thu không tồn tại');
    if (payment.status === 'VOID') throw new Error('Không thể phân bổ phiếu thu đã hủy');

    const remaining = Number(payment.amount) - Number(payment.allocated_amount);
    if (remaining <= 0) {
        throw new Error('Phiếu thu đã được phân bổ hết');
    }

    // Get open invoices for this customer, oldest first (FIFO)
    const invoices = await prisma.aRInvoice.findMany({
        where: {
            farm_id: farmId,
            customer_id: payment.customer_id,
            status: { in: ['POSTED', 'PARTIALLY_PAID', 'OVERDUE'] },
        },
        orderBy: { invoice_date: 'asc' },
    });

    if (invoices.length === 0) {
        throw new Error('Không có hóa đơn mở để phân bổ');
    }

    const allocations: { invoice_id: string; invoice_number: string; amount: number }[] = [];

    const result = await prisma.$transaction(async (tx) => {
        let toAllocate = remaining;

        for (const invoice of invoices) {
            if (toAllocate <= 0) break;

            const invoiceBalance = Number(invoice.total_amount) - Number(invoice.paid_amount);
            if (invoiceBalance <= 0) continue;

            const allocAmount = Math.min(toAllocate, invoiceBalance);

            // Check existing allocation
            const existing = await tx.aRInvoicePaymentAllocation.findUnique({
                where: { payment_id_invoice_id: { payment_id: paymentId, invoice_id: invoice.id } },
            });

            if (existing) {
                await tx.aRInvoicePaymentAllocation.update({
                    where: { id: existing.id },
                    data: { amount: { increment: allocAmount } },
                });
            } else {
                await tx.aRInvoicePaymentAllocation.create({
                    data: {
                        farm_id: farmId,
                        payment_id: paymentId,
                        invoice_id: invoice.id,
                        amount: allocAmount,
                    },
                });
            }

            // Update invoice
            const newPaidAmount = Number(invoice.paid_amount) + allocAmount;
            const newStatus = newPaidAmount >= Number(invoice.total_amount) ? 'PAID' : 'PARTIALLY_PAID';

            await tx.aRInvoice.update({
                where: { id: invoice.id },
                data: {
                    paid_amount: newPaidAmount,
                    status: newStatus,
                },
            });

            allocations.push({
                invoice_id: invoice.id,
                invoice_number: invoice.invoice_number,
                amount: roundMoney(allocAmount),
            });

            toAllocate -= allocAmount;
        }

        // Update payment
        const totalAllocated = remaining - toAllocate;
        const updated = await tx.aRPayment.update({
            where: { id: paymentId },
            data: {
                allocated_amount: { increment: totalAllocated },
            },
            include: {
                customer: { select: { id: true, name: true, code: true } },
                allocations: {
                    include: {
                        invoice: { select: { invoice_number: true, total_amount: true } },
                    },
                },
            },
        });

        return updated;
    });

    return {
        payment: formatARPayment(result),
        allocations,
    };
}

// ==========================================
// VOID AR PAYMENT
// ==========================================

export async function voidPayment(
    farmId: string,
    paymentId: string,
    userId: string,
    reason?: string
): Promise<ARPayment> {
    const payment = await prisma.aRPayment.findFirst({
        where: { id: paymentId, farm_id: farmId },
        include: { allocations: true },
    });

    if (!payment) throw new Error('Phiếu thu không tồn tại');
    if (payment.status === 'VOID') throw new Error('Phiếu thu đã bị hủy');

    return prisma.$transaction(async (tx) => {
        // Reverse allocations if any
        if (payment.allocations && payment.allocations.length > 0) {
            for (const alloc of payment.allocations) {
                // Revert invoice paid_amount
                const invoice = await tx.aRInvoice.findUnique({ where: { id: alloc.invoice_id } });
                if (invoice) {
                    const newPaidAmount = Math.max(0, Number(invoice.paid_amount) - Number(alloc.amount));
                    let newStatus = invoice.status;
                    if (newPaidAmount <= 0 && invoice.status !== 'VOID') {
                        newStatus = 'POSTED';
                    } else if (newPaidAmount < Number(invoice.total_amount) && invoice.status === 'PAID') {
                        newStatus = 'PARTIALLY_PAID';
                    }

                    await tx.aRInvoice.update({
                        where: { id: alloc.invoice_id },
                        data: { paid_amount: newPaidAmount, status: newStatus },
                    });
                }

                // Delete allocation
                await tx.aRInvoicePaymentAllocation.delete({ where: { id: alloc.id } });
            }
        }

        // If was posted, reverse customer balance
        if (payment.status === 'POSTED') {
            await tx.partner.update({
                where: { id: payment.customer_id },
                data: { balance: { increment: payment.amount } },
            });
        }

        // Update payment status
        const updated = await tx.aRPayment.update({
            where: { id: paymentId },
            data: {
                status: 'VOID',
                notes: reason ? `${payment.notes || ''}\n[HỦY] ${reason}`.trim() : payment.notes,
            },
            include: {
                customer: { select: { id: true, name: true, code: true } },
            },
        });

        return formatARPayment(updated);
    });
}

// ==========================================
// HELPERS
// ==========================================

async function generatePaymentNumber(farmId: string, prefix: string): Promise<string> {
    const year = new Date().getFullYear();

    const lastPayment = await prisma.aRPayment.findFirst({
        where: {
            farm_id: farmId,
            payment_number: { startsWith: `${prefix}-${year}-` },
        },
        orderBy: { payment_number: 'desc' },
    });

    let sequence = 1;
    if (lastPayment) {
        const parts = lastPayment.payment_number.split('-');
        const lastSeq = parseInt(parts[parts.length - 1] || '0');
        sequence = lastSeq + 1;
    }

    return `${prefix}-${year}-${sequence.toString().padStart(5, '0')}`;
}

async function generateJournalNumberForPayment(tx: any, farmId: string, date: Date): Promise<string> {
    const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
    const prefix = `PT${dateStr}`; // PT = Phiếu thu

    const lastEntry = await tx.transaction.findFirst({
        where: {
            farm_id: farmId,
            trans_number: { startsWith: prefix },
        },
        orderBy: { trans_number: 'desc' },
    });

    let seq = 1;
    if (lastEntry) {
        const lastSeq = parseInt(lastEntry.trans_number.slice(-3) || '0');
        seq = lastSeq + 1;
    }

    return `${prefix}${seq.toString().padStart(3, '0')}`;
}

function formatARPayment(payment: any): ARPayment {
    return {
        id: payment.id,
        farm_id: payment.farm_id,
        payment_number: payment.payment_number,
        payment_date: payment.payment_date.toISOString().split('T')[0],
        customer_id: payment.customer_id,
        customer_name: payment.customer?.name,
        payment_method: payment.payment_method,
        amount: roundMoney(Number(payment.amount)),
        allocated_amount: roundMoney(Number(payment.allocated_amount)),
        unallocated_amount: roundMoney(Number(payment.amount) - Number(payment.allocated_amount)),
        status: payment.status,
        posted_at: payment.posted_at?.toISOString(),
        posted_by: payment.posted_by,
        bank_account_id: payment.bank_account_id,
        reference: payment.reference,
        notes: payment.notes,
        journal_entry_id: payment.journal_entry_id,
        created_at: payment.created_at.toISOString(),
        updated_at: payment.updated_at.toISOString(),
        created_by: payment.created_by,
        allocations: payment.allocations?.map((a: any) => ({
            id: a.id,
            farm_id: a.farm_id,
            payment_id: a.payment_id,
            invoice_id: a.invoice_id,
            amount: roundMoney(Number(a.amount)),
            allocated_at: a.allocated_at.toISOString(),
            invoice_number: a.invoice?.invoice_number,
            invoice_total: a.invoice ? roundMoney(Number(a.invoice.total_amount)) : undefined,
        })),
    };
}
