// src/services/ap-invoice.service.ts
// AP Invoice Service - Phase 4 Task 6

import prisma from '@/lib/prisma';
import { roundMoney } from '@/lib/decimal';
import { addDays } from 'date-fns';
import type {
    APInvoice,
    APInvoiceListParams,
    APInvoiceListResponse,
    CreateAPInvoiceInput,
    UpdateAPInvoiceInput,
} from '@/types/ap-invoice';

// ==========================================
// GET AP INVOICES (LIST)
// ==========================================

export async function getAPInvoices(
    farmId: string,
    params: APInvoiceListParams
): Promise<APInvoiceListResponse> {
    const { page = 1, limit = 20, status, vendor_id, from_date, to_date, search } = params;
    const skip = (page - 1) * limit;

    const where: any = { farm_id: farmId };

    if (status) where.status = status;
    if (vendor_id) where.vendor_id = vendor_id;
    if (from_date) where.invoice_date = { ...where.invoice_date, gte: new Date(from_date) };
    if (to_date) where.invoice_date = { ...where.invoice_date, lte: new Date(to_date) };
    if (search) {
        where.OR = [
            { invoice_number: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [items, total] = await Promise.all([
        prisma.aPInvoice.findMany({
            where,
            orderBy: { invoice_date: 'desc' },
            skip,
            take: limit,
            include: {
                vendor: { select: { id: true, name: true, code: true } },
                lines: true,
            },
        }),
        prisma.aPInvoice.count({ where }),
    ]);

    const summary = await prisma.aPInvoice.aggregate({
        where: { farm_id: farmId },
        _count: true,
        _sum: { total_amount: true, paid_amount: true },
    });

    const totalAmount = Number(summary._sum.total_amount || 0);
    const totalPaid = Number(summary._sum.paid_amount || 0);

    return {
        items: items.map(formatAPInvoice),
        total,
        page,
        limit,
        summary: {
            total_invoices: summary._count,
            total_amount: roundMoney(totalAmount),
            total_paid: roundMoney(totalPaid),
            total_outstanding: roundMoney(totalAmount - totalPaid),
        },
    };
}

// ==========================================
// GET AP INVOICE BY ID
// ==========================================

export async function getAPInvoiceById(
    farmId: string,
    id: string
): Promise<APInvoice | null> {
    const invoice = await prisma.aPInvoice.findFirst({
        where: { id, farm_id: farmId },
        include: {
            vendor: { select: { id: true, name: true, code: true } },
            lines: { orderBy: { line_number: 'asc' } },
        },
    });

    return invoice ? formatAPInvoice(invoice) : null;
}

// ==========================================
// CREATE AP INVOICE
// ==========================================

export async function createAPInvoice(
    input: CreateAPInvoiceInput
): Promise<APInvoice> {
    const invoiceNumber = await generateInvoiceNumber(input.farm_id, 'PIN');

    return prisma.$transaction(async (tx) => {
        const invoiceDate = new Date(input.invoice_date);
        const paymentTermDays = input.payment_term_days || 30;
        const dueDate = addDays(invoiceDate, paymentTermDays);

        const invoice = await tx.aPInvoice.create({
            data: {
                farm_id: input.farm_id,
                invoice_number: invoiceNumber,
                invoice_date: invoiceDate,
                vendor_id: input.vendor_id,
                due_date: dueDate,
                payment_term_days: paymentTermDays,
                description: input.description,
                notes: input.notes,
                sub_total: 0,
                discount_amount: 0,
                tax_amount: 0,
                total_amount: 0,
                paid_amount: 0,
                status: 'DRAFT',
                created_by: input.created_by,
            },
        });

        let subTotal = 0;
        let totalDiscount = 0;
        let totalTax = 0;

        for (let i = 0; i < input.lines.length; i++) {
            const line = input.lines[i];
            const lineSubTotal = Number(line.quantity) * Number(line.unit_price);
            const lineDiscount = Number(line.discount || 0);
            const lineTaxable = lineSubTotal - lineDiscount;
            const lineTax = lineTaxable * (Number(line.tax_rate) / 100);
            const lineTotal = lineTaxable + lineTax;

            await tx.aPInvoiceLine.create({
                data: {
                    farm_id: input.farm_id,
                    invoice_id: invoice.id,
                    line_number: i + 1,
                    product_id: line.product_id,
                    product_name: line.product_name,
                    unit: line.unit,
                    quantity: line.quantity,
                    unit_price: line.unit_price,
                    discount: lineDiscount,
                    tax_rate: line.tax_rate,
                    sub_total: lineSubTotal,
                    tax_amount: lineTax,
                    total_amount: lineTotal,
                },
            });

            subTotal += lineSubTotal;
            totalDiscount += lineDiscount;
            totalTax += lineTax;
        }

        const totalAmount = subTotal - totalDiscount + totalTax;

        const updated = await tx.aPInvoice.update({
            where: { id: invoice.id },
            data: {
                sub_total: subTotal,
                discount_amount: totalDiscount,
                tax_amount: totalTax,
                total_amount: totalAmount,
            },
            include: {
                vendor: { select: { id: true, name: true, code: true } },
                lines: { orderBy: { line_number: 'asc' } },
            },
        });

        return formatAPInvoice(updated);
    });
}

// ==========================================
// UPDATE AP INVOICE (DRAFT ONLY)
// ==========================================

export async function updateAPInvoice(
    farmId: string,
    id: string,
    input: UpdateAPInvoiceInput
): Promise<APInvoice> {
    const invoice = await prisma.aPInvoice.findFirst({
        where: { id, farm_id: farmId },
    });

    if (!invoice) throw new Error('Hóa đơn không tồn tại');
    if (invoice.status !== 'DRAFT') throw new Error('Chỉ có thể sửa hóa đơn nháp');

    return prisma.$transaction(async (tx) => {
        const updateData: any = {};

        if (input.invoice_date) {
            updateData.invoice_date = new Date(input.invoice_date);
            updateData.due_date = addDays(
                new Date(input.invoice_date),
                input.payment_term_days || invoice.payment_term_days
            );
        }
        if (input.vendor_id) updateData.vendor_id = input.vendor_id;
        if (input.payment_term_days !== undefined) updateData.payment_term_days = input.payment_term_days;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.notes !== undefined) updateData.notes = input.notes;

        if (input.lines && input.lines.length > 0) {
            await tx.aPInvoiceLine.deleteMany({ where: { invoice_id: id } });

            let subTotal = 0;
            let totalDiscount = 0;
            let totalTax = 0;

            for (let i = 0; i < input.lines.length; i++) {
                const line = input.lines[i];
                const lineSubTotal = Number(line.quantity) * Number(line.unit_price);
                const lineDiscount = Number(line.discount || 0);
                const lineTaxable = lineSubTotal - lineDiscount;
                const lineTax = lineTaxable * (Number(line.tax_rate) / 100);
                const lineTotal = lineTaxable + lineTax;

                await tx.aPInvoiceLine.create({
                    data: {
                        farm_id: farmId,
                        invoice_id: id,
                        line_number: i + 1,
                        product_id: line.product_id,
                        product_name: line.product_name,
                        unit: line.unit,
                        quantity: line.quantity,
                        unit_price: line.unit_price,
                        discount: lineDiscount,
                        tax_rate: line.tax_rate,
                        sub_total: lineSubTotal,
                        tax_amount: lineTax,
                        total_amount: lineTotal,
                    },
                });

                subTotal += lineSubTotal;
                totalDiscount += lineDiscount;
                totalTax += lineTax;
            }

            updateData.sub_total = subTotal;
            updateData.discount_amount = totalDiscount;
            updateData.tax_amount = totalTax;
            updateData.total_amount = subTotal - totalDiscount + totalTax;
        }

        const updated = await tx.aPInvoice.update({
            where: { id },
            data: updateData,
            include: {
                vendor: { select: { id: true, name: true, code: true } },
                lines: { orderBy: { line_number: 'asc' } },
            },
        });

        return formatAPInvoice(updated);
    });
}

// ==========================================
// DELETE AP INVOICE (DRAFT ONLY)
// ==========================================

export async function deleteAPInvoice(
    farmId: string,
    id: string
): Promise<void> {
    const invoice = await prisma.aPInvoice.findFirst({
        where: { id, farm_id: farmId },
    });

    if (!invoice) throw new Error('Hóa đơn không tồn tại');
    if (invoice.status !== 'DRAFT') throw new Error('Chỉ có thể xóa hóa đơn nháp');

    await prisma.$transaction([
        prisma.aPInvoiceLine.deleteMany({ where: { invoice_id: id } }),
        prisma.aPInvoice.delete({ where: { id } }),
    ]);
}

// ==========================================
// POST AP INVOICE (DRAFT → POSTED)
// ==========================================

export interface PostAPInvoiceResult {
    invoice: APInvoice;
    stockMovements: { product_id: string; quantity: number }[];
}

export async function postAPInvoice(
    farmId: string,
    invoiceId: string,
    userId: string
): Promise<PostAPInvoiceResult> {
    const invoice = await prisma.aPInvoice.findFirst({
        where: { id: invoiceId, farm_id: farmId },
        include: { lines: true, vendor: true },
    });

    if (!invoice) throw new Error('Hóa đơn không tồn tại');
    if (invoice.status !== 'DRAFT') throw new Error('Chỉ có thể ghi sổ hóa đơn nháp');
    if (!invoice.lines || invoice.lines.length === 0) throw new Error('Hóa đơn phải có ít nhất 1 dòng');

    const stockMovements: { product_id: string; quantity: number }[] = [];

    const updated = await prisma.$transaction(async (tx) => {
        // 1. Create stock movements (nhập kho)
        for (const line of invoice.lines) {
            if (line.product_id) {
                const quantity = Number(line.quantity);

                const movementCode = await generateMovementCode(tx, farmId, invoice.invoice_date);
                await tx.stockMovement.create({
                    data: {
                        farm_id: farmId,
                        code: movementCode,
                        date: invoice.invoice_date,
                        type: 'IN',
                        product_id: line.product_id,
                        quantity: quantity,
                        unit: line.unit || 'kg',
                        unit_price: line.unit_price,
                        partner_id: invoice.vendor_id,
                        notes: `Nhập kho theo HĐ ${invoice.invoice_number}`,
                    },
                });

                // Update stock quantity
                const existingStock = await tx.stock.findFirst({
                    where: { farm_id: farmId, product_id: line.product_id },
                });

                if (existingStock) {
                    await tx.stock.update({
                        where: { id: existingStock.id },
                        data: { quantity: { increment: quantity } },
                    });
                } else {
                    await tx.stock.create({
                        data: {
                            farm_id: farmId,
                            product_id: line.product_id,
                            quantity: quantity,
                            unit: line.unit || 'kg',
                            avg_cost: line.unit_price,
                        },
                    });
                }

                stockMovements.push({ product_id: line.product_id, quantity });
            }
        }

        // 2. Create journal entry (Debit 156/133, Credit 331)
        const journalNumber = await generateJournalNumber(tx, farmId, invoice.invoice_date);
        const journalEntry = await tx.transaction.create({
            data: {
                farm_id: farmId,
                trans_number: journalNumber,
                code: journalNumber,
                trans_date: invoice.invoice_date,
                trans_type: 'EXPENSE',
                partner_id: invoice.vendor_id,
                partner_name: invoice.vendor?.name,
                amount: invoice.sub_total,
                subtotal: invoice.sub_total,
                vat_amount: invoice.tax_amount,
                tax_amount: invoice.tax_amount,
                discount_amount: invoice.discount_amount,
                total_amount: invoice.total_amount,
                payment_status: 'PENDING',
                paid_amount: 0,
                debit_account: '156', // Hàng tồn kho (or 133 for VAT)
                credit_account: '331', // Công nợ phải trả
                description: `Mua hàng - ${invoice.invoice_number}`,
                notes: invoice.description,
                created_by: userId,
            },
        });

        // 3. Update vendor balance (tăng công nợ)
        await tx.partner.update({
            where: { id: invoice.vendor_id },
            data: { balance: { increment: invoice.total_amount } },
        });

        // 4. Update invoice status
        return tx.aPInvoice.update({
            where: { id: invoiceId },
            data: {
                status: 'POSTED',
                posted_at: new Date(),
                posted_by: userId,
                journal_entry_id: journalEntry.id,
            },
            include: {
                vendor: { select: { id: true, name: true, code: true } },
                lines: { orderBy: { line_number: 'asc' } },
            },
        });
    });

    return {
        invoice: formatAPInvoice(updated),
        stockMovements,
    };
}

// ==========================================
// VOID AP INVOICE
// ==========================================

export async function voidAPInvoice(
    farmId: string,
    invoiceId: string,
    userId: string,
    reason?: string
): Promise<APInvoice> {
    const invoice = await prisma.aPInvoice.findFirst({
        where: { id: invoiceId, farm_id: farmId },
        include: { lines: true },
    });

    if (!invoice) throw new Error('Hóa đơn không tồn tại');
    if (invoice.status === 'VOID') throw new Error('Hóa đơn đã bị hủy');
    if (invoice.status === 'PAID') throw new Error('Không thể hủy hóa đơn đã thanh toán đủ');
    if (Number(invoice.paid_amount) > 0) throw new Error('Không thể hủy hóa đơn đã có thanh toán');

    const updated = await prisma.$transaction(async (tx) => {
        // Reverse if was posted
        if (invoice.status === 'POSTED' || invoice.status === 'PARTIALLY_PAID' || invoice.status === 'OVERDUE') {
            for (const line of invoice.lines) {
                if (line.product_id) {
                    const quantity = Number(line.quantity);

                    // Create reverse stock movement
                    const movementCode = await generateMovementCode(tx, farmId, new Date());
                    await tx.stockMovement.create({
                        data: {
                            farm_id: farmId,
                            code: movementCode,
                            date: new Date(),
                            type: 'OUT',
                            product_id: line.product_id,
                            quantity: quantity,
                            unit: line.unit || 'kg',
                            unit_price: line.unit_price,
                            partner_id: invoice.vendor_id,
                            notes: `Xuất kho do hủy HĐ ${invoice.invoice_number}`,
                        },
                    });

                    // Update stock quantity
                    const existingStock = await tx.stock.findFirst({
                        where: { farm_id: farmId, product_id: line.product_id },
                    });

                    if (existingStock) {
                        await tx.stock.update({
                            where: { id: existingStock.id },
                            data: { quantity: { decrement: quantity } },
                        });
                    }
                }
            }

            // Reverse vendor balance
            await tx.partner.update({
                where: { id: invoice.vendor_id },
                data: { balance: { decrement: invoice.total_amount } },
            });
        }

        // Update invoice status
        return tx.aPInvoice.update({
            where: { id: invoiceId },
            data: {
                status: 'VOID',
                notes: reason
                    ? `${invoice.notes || ''}\n[HỦY] ${reason}`.trim()
                    : invoice.notes,
            },
            include: {
                vendor: { select: { id: true, name: true, code: true } },
                lines: { orderBy: { line_number: 'asc' } },
            },
        });
    });

    return formatAPInvoice(updated);
}

// ==========================================
// HELPERS
// ==========================================

async function generateInvoiceNumber(farmId: string, prefix: string): Promise<string> {
    const year = new Date().getFullYear();

    const lastInvoice = await prisma.aPInvoice.findFirst({
        where: {
            farm_id: farmId,
            invoice_number: { startsWith: `${prefix}-${year}-` },
        },
        orderBy: { invoice_number: 'desc' },
    });

    let sequence = 1;
    if (lastInvoice) {
        const parts = lastInvoice.invoice_number.split('-');
        const lastSeq = parseInt(parts[parts.length - 1] || '0');
        sequence = lastSeq + 1;
    }

    return `${prefix}-${year}-${sequence.toString().padStart(5, '0')}`;
}

async function generateMovementCode(tx: any, farmId: string, date: Date): Promise<string> {
    const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
    const prefix = `NK${dateStr}`; // NK = Nhập kho

    const lastMovement = await tx.stockMovement.findFirst({
        where: {
            farm_id: farmId,
            code: { startsWith: prefix },
        },
        orderBy: { code: 'desc' },
    });

    let seq = 1;
    if (lastMovement) {
        const lastSeq = parseInt(lastMovement.code.slice(-3) || '0');
        seq = lastSeq + 1;
    }

    return `${prefix}${seq.toString().padStart(3, '0')}`;
}

async function generateJournalNumber(tx: any, farmId: string, date: Date): Promise<string> {
    const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
    const prefix = `MH${dateStr}`; // MH = Mua hàng

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

function formatAPInvoice(inv: any): APInvoice {
    return {
        id: inv.id,
        farm_id: inv.farm_id,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date.toISOString().split('T')[0],
        vendor_id: inv.vendor_id,
        vendor_name: inv.vendor?.name,
        sub_total: roundMoney(Number(inv.sub_total)),
        discount_amount: roundMoney(Number(inv.discount_amount)),
        tax_amount: roundMoney(Number(inv.tax_amount)),
        total_amount: roundMoney(Number(inv.total_amount)),
        paid_amount: roundMoney(Number(inv.paid_amount)),
        balance: roundMoney(Number(inv.total_amount) - Number(inv.paid_amount)),
        due_date: inv.due_date.toISOString().split('T')[0],
        payment_term_days: inv.payment_term_days,
        status: inv.status,
        posted_at: inv.posted_at?.toISOString(),
        posted_by: inv.posted_by,
        description: inv.description,
        notes: inv.notes,
        journal_entry_id: inv.journal_entry_id,
        created_at: inv.created_at.toISOString(),
        updated_at: inv.updated_at.toISOString(),
        created_by: inv.created_by,
        lines: inv.lines?.map((line: any) => ({
            id: line.id,
            farm_id: line.farm_id,
            invoice_id: line.invoice_id,
            line_number: line.line_number,
            product_id: line.product_id,
            product_name: line.product_name,
            unit: line.unit,
            quantity: Number(line.quantity),
            unit_price: roundMoney(Number(line.unit_price)),
            discount: roundMoney(Number(line.discount)),
            tax_rate: Number(line.tax_rate),
            sub_total: roundMoney(Number(line.sub_total)),
            tax_amount: roundMoney(Number(line.tax_amount)),
            total_amount: roundMoney(Number(line.total_amount)),
        })),
    };
}
