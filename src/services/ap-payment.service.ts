// src/services/ap-payment.service.ts
// AP Payment Service - Phase 4 Task 6

import prisma from '@/lib/prisma';
import { roundMoney } from '@/lib/decimal';
import type {
    APPayment,
    APPaymentListParams,
    CreateAPPaymentInput,
    AllocateAPPaymentInput,
} from '@/types/ap-invoice';

// ==========================================
// GET AP PAYMENTS (LIST)
// ==========================================

export async function getAPPayments(
    farmId: string,
    params: APPaymentListParams
): Promise<{ items: APPayment[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, status, vendor_id, from_date, to_date, search } = params;
    const skip = (page - 1) * limit;

    const where: any = { farm_id: farmId };

    if (status) where.status = status;
    if (vendor_id) where.vendor_id = vendor_id;
    if (from_date) where.payment_date = { ...where.payment_date, gte: new Date(from_date) };
    if (to_date) where.payment_date = { ...where.payment_date, lte: new Date(to_date) };
    if (search) {
        where.OR = [
            { payment_number: { contains: search, mode: 'insensitive' } },
            { reference: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [items, total] = await Promise.all([
        prisma.aPPayment.findMany({
            where,
            orderBy: { payment_date: 'desc' },
            skip,
            take: limit,
            include: {
                vendor: { select: { id: true, name: true, code: true } },
                allocations: {
                    include: {
                        invoice: { select: { invoice_number: true, total_amount: true } },
                    },
                },
            },
        }),
        prisma.aPPayment.count({ where }),
    ]);

    return {
        items: items.map(formatAPPayment),
        total,
        page,
        limit,
    };
}

// ==========================================
// CREATE AP PAYMENT
// ==========================================

export async function createAPPayment(
    input: CreateAPPaymentInput
): Promise<APPayment> {
    const paymentNumber = await generatePaymentNumber(input.farm_id, 'PC');

    const payment = await prisma.aPPayment.create({
        data: {
            farm_id: input.farm_id,
            payment_number: paymentNumber,
            payment_date: new Date(input.payment_date),
            vendor_id: input.vendor_id,
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
            vendor: { select: { id: true, name: true, code: true } },
        },
    });

    return formatAPPayment(payment);
}

// ==========================================
// POST AP PAYMENT
// ==========================================

export async function postAPPayment(
    farmId: string,
    paymentId: string,
    userId: string
): Promise<{ payment: APPayment; journal_entry_id: string }> {
    const payment = await prisma.aPPayment.findFirst({
        where: { id: paymentId, farm_id: farmId },
        include: { vendor: true },
    });

    if (!payment) throw new Error('Phiếu chi không tồn tại');
    if (payment.status !== 'DRAFT') throw new Error('Chỉ có thể ghi sổ phiếu chi nháp');

    const result = await prisma.$transaction(async (tx) => {
        // Create journal entry (Debit 331, Credit 112)
        const journalNumber = await generateJournalNumber(tx, farmId, payment.payment_date);
        const journalEntry = await tx.transaction.create({
            data: {
                farm_id: farmId,
                trans_number: journalNumber,
                code: journalNumber,
                trans_date: payment.payment_date,
                trans_type: 'CASH_OUT',
                partner_id: payment.vendor_id,
                partner_name: payment.vendor?.name,
                amount: payment.amount,
                subtotal: payment.amount,
                total_amount: payment.amount,
                payment_status: 'PAID',
                paid_amount: payment.amount,
                payment_method: payment.payment_method as any,
                debit_account: '331', // Công nợ phải trả
                credit_account: '112', // Tiền gửi ngân hàng
                description: `Thanh toán NCC - ${payment.payment_number}`,
                notes: payment.notes,
                created_by: userId,
            },
        });

        // Update vendor balance (giảm công nợ)
        await tx.partner.update({
            where: { id: payment.vendor_id },
            data: { balance: { decrement: payment.amount } },
        });

        // Update payment status
        const updated = await tx.aPPayment.update({
            where: { id: paymentId },
            data: {
                status: 'POSTED',
                posted_at: new Date(),
                posted_by: userId,
                journal_entry_id: journalEntry.id,
            },
            include: {
                vendor: { select: { id: true, name: true, code: true } },
                allocations: true,
            },
        });

        return { payment: updated, journalEntry };
    });

    return {
        payment: formatAPPayment(result.payment),
        journal_entry_id: result.journalEntry.id,
    };
}

// ==========================================
// ALLOCATE AP PAYMENT (MANUAL)
// ==========================================

export async function allocateAPPayment(
    farmId: string,
    paymentId: string,
    input: AllocateAPPaymentInput
): Promise<APPayment> {
    const payment = await prisma.aPPayment.findFirst({
        where: { id: paymentId, farm_id: farmId },
    });

    if (!payment) throw new Error('Phiếu chi không tồn tại');
    if (payment.status === 'VOID') throw new Error('Không thể phân bổ phiếu chi đã hủy');

    const totalAllocation = input.allocations.reduce((sum, a) => sum + a.amount, 0);
    const remaining = Number(payment.amount) - Number(payment.allocated_amount);

    if (totalAllocation > remaining + 0.01) {
        throw new Error(`Số tiền phân bổ (${totalAllocation}) vượt quá số dư (${remaining})`);
    }

    return prisma.$transaction(async (tx) => {
        for (const alloc of input.allocations) {
            const invoice = await tx.aPInvoice.findFirst({
                where: { id: alloc.invoice_id, farm_id: farmId },
            });

            if (!invoice) throw new Error(`Hóa đơn ${alloc.invoice_id} không tồn tại`);
            if (invoice.status === 'PAID') throw new Error(`Hóa đơn ${invoice.invoice_number} đã thanh toán đủ`);

            const invoiceBalance = Number(invoice.total_amount) - Number(invoice.paid_amount);
            if (alloc.amount > invoiceBalance + 0.01) {
                throw new Error(`Số tiền phân bổ vượt quá số dư hóa đơn ${invoice.invoice_number}`);
            }

            // Check existing allocation
            const existing = await tx.aPInvoicePaymentAllocation.findUnique({
                where: { payment_id_invoice_id: { payment_id: paymentId, invoice_id: alloc.invoice_id } },
            });

            if (existing) {
                await tx.aPInvoicePaymentAllocation.update({
                    where: { id: existing.id },
                    data: { amount: { increment: alloc.amount } },
                });
            } else {
                await tx.aPInvoicePaymentAllocation.create({
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

            await tx.aPInvoice.update({
                where: { id: alloc.invoice_id },
                data: { paid_amount: newPaidAmount, status: newStatus },
            });
        }

        // Update payment allocated_amount
        const updated = await tx.aPPayment.update({
            where: { id: paymentId },
            data: { allocated_amount: { increment: totalAllocation } },
            include: {
                vendor: { select: { id: true, name: true, code: true } },
                allocations: {
                    include: {
                        invoice: { select: { invoice_number: true, total_amount: true } },
                    },
                },
            },
        });

        return formatAPPayment(updated);
    });
}

// ==========================================
// AUTO-ALLOCATE FIFO
// ==========================================

export async function autoAllocateAPFIFO(
    farmId: string,
    paymentId: string
): Promise<{ payment: APPayment; allocations: { invoice_id: string; invoice_number: string; amount: number }[] }> {
    const payment = await prisma.aPPayment.findFirst({
        where: { id: paymentId, farm_id: farmId },
    });

    if (!payment) throw new Error('Phiếu chi không tồn tại');
    if (payment.status === 'VOID') throw new Error('Không thể phân bổ phiếu chi đã hủy');

    const remaining = Number(payment.amount) - Number(payment.allocated_amount);
    if (remaining <= 0) {
        throw new Error('Phiếu chi đã được phân bổ hết');
    }

    // Get open invoices for this vendor, oldest first (FIFO)
    const invoices = await prisma.aPInvoice.findMany({
        where: {
            farm_id: farmId,
            vendor_id: payment.vendor_id,
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
            const existing = await tx.aPInvoicePaymentAllocation.findUnique({
                where: { payment_id_invoice_id: { payment_id: paymentId, invoice_id: invoice.id } },
            });

            if (existing) {
                await tx.aPInvoicePaymentAllocation.update({
                    where: { id: existing.id },
                    data: { amount: { increment: allocAmount } },
                });
            } else {
                await tx.aPInvoicePaymentAllocation.create({
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

            await tx.aPInvoice.update({
                where: { id: invoice.id },
                data: { paid_amount: newPaidAmount, status: newStatus },
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
        const updated = await tx.aPPayment.update({
            where: { id: paymentId },
            data: { allocated_amount: { increment: totalAllocated } },
            include: {
                vendor: { select: { id: true, name: true, code: true } },
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
        payment: formatAPPayment(result),
        allocations,
    };
}

// ==========================================
// VOID AP PAYMENT
// ==========================================

export async function voidAPPayment(
    farmId: string,
    paymentId: string,
    userId: string,
    reason?: string
): Promise<APPayment> {
    const payment = await prisma.aPPayment.findFirst({
        where: { id: paymentId, farm_id: farmId },
        include: { allocations: true },
    });

    if (!payment) throw new Error('Phiếu chi không tồn tại');
    if (payment.status === 'VOID') throw new Error('Phiếu chi đã bị hủy');

    return prisma.$transaction(async (tx) => {
        // Reverse allocations
        if (payment.allocations && payment.allocations.length > 0) {
            for (const alloc of payment.allocations) {
                const invoice = await tx.aPInvoice.findUnique({ where: { id: alloc.invoice_id } });
                if (invoice) {
                    const newPaidAmount = Math.max(0, Number(invoice.paid_amount) - Number(alloc.amount));
                    let newStatus = invoice.status;
                    if (newPaidAmount <= 0 && invoice.status !== 'VOID') {
                        newStatus = 'POSTED';
                    } else if (newPaidAmount < Number(invoice.total_amount) && invoice.status === 'PAID') {
                        newStatus = 'PARTIALLY_PAID';
                    }

                    await tx.aPInvoice.update({
                        where: { id: alloc.invoice_id },
                        data: { paid_amount: newPaidAmount, status: newStatus },
                    });
                }

                await tx.aPInvoicePaymentAllocation.delete({ where: { id: alloc.id } });
            }
        }

        // If was posted, reverse vendor balance
        if (payment.status === 'POSTED') {
            await tx.partner.update({
                where: { id: payment.vendor_id },
                data: { balance: { increment: payment.amount } },
            });
        }

        // Update payment status
        const updated = await tx.aPPayment.update({
            where: { id: paymentId },
            data: {
                status: 'VOID',
                notes: reason ? `${payment.notes || ''}\n[HỦY] ${reason}`.trim() : payment.notes,
            },
            include: {
                vendor: { select: { id: true, name: true, code: true } },
            },
        });

        return formatAPPayment(updated);
    });
}

// ==========================================
// HELPERS
// ==========================================

async function generatePaymentNumber(farmId: string, prefix: string): Promise<string> {
    const year = new Date().getFullYear();

    const lastPayment = await prisma.aPPayment.findFirst({
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

async function generateJournalNumber(tx: any, farmId: string, date: Date): Promise<string> {
    const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
    const prefix = `PC${dateStr}`; // PC = Phiếu chi

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

function formatAPPayment(payment: any): APPayment {
    return {
        id: payment.id,
        farm_id: payment.farm_id,
        payment_number: payment.payment_number,
        payment_date: payment.payment_date.toISOString().split('T')[0],
        vendor_id: payment.vendor_id,
        vendor_name: payment.vendor?.name,
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
