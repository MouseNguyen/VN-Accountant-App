// src/services/ar-invoice.service.ts
// AR Invoice Service - Phase 4 Task 2

import prisma from '@/lib/prisma';
import { roundMoney } from '@/lib/decimal';
import { addDays } from 'date-fns';
import type {
    ARInvoice,
    ARInvoiceListParams,
    ARInvoiceListResponse,
    CreateARInvoiceInput,
    UpdateARInvoiceInput,
} from '@/types/ar-invoice';

// ==========================================
// GET AR INVOICES (LIST)
// ==========================================

export async function getARInvoices(
    farmId: string,
    params: ARInvoiceListParams
): Promise<ARInvoiceListResponse> {
    const { page = 1, limit = 20, status, customer_id, from_date, to_date, search } = params;
    const skip = (page - 1) * limit;

    const where: any = { farm_id: farmId };

    if (status) where.status = status;
    if (customer_id) where.customer_id = customer_id;
    if (from_date) where.invoice_date = { ...where.invoice_date, gte: new Date(from_date) };
    if (to_date) where.invoice_date = { ...where.invoice_date, lte: new Date(to_date) };
    if (search) {
        where.OR = [
            { invoice_number: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [items, total] = await Promise.all([
        prisma.aRInvoice.findMany({
            where,
            orderBy: { invoice_date: 'desc' },
            skip,
            take: limit,
            include: {
                customer: { select: { id: true, name: true, code: true } },
                lines: true,
            },
        }),
        prisma.aRInvoice.count({ where }),
    ]);

    // Summary
    const summary = await prisma.aRInvoice.aggregate({
        where: { farm_id: farmId },
        _count: true,
        _sum: { total_amount: true, paid_amount: true },
    });

    const totalAmount = Number(summary._sum.total_amount || 0);
    const totalPaid = Number(summary._sum.paid_amount || 0);

    return {
        items: items.map(formatARInvoice),
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
// GET AR INVOICE BY ID
// ==========================================

export async function getARInvoiceById(
    farmId: string,
    id: string
): Promise<ARInvoice | null> {
    const invoice = await prisma.aRInvoice.findFirst({
        where: { id, farm_id: farmId },
        include: {
            customer: { select: { id: true, name: true, code: true } },
            lines: { orderBy: { line_number: 'asc' } },
        },
    });

    return invoice ? formatARInvoice(invoice) : null;
}

// ==========================================
// CREATE AR INVOICE
// ==========================================

export async function createARInvoice(
    input: CreateARInvoiceInput
): Promise<ARInvoice> {
    const invoiceNumber = await generateInvoiceNumber(input.farm_id, 'INV');

    return prisma.$transaction(async (tx) => {
        const invoiceDate = new Date(input.invoice_date);
        const paymentTermDays = input.payment_term_days || 30;
        const dueDate = addDays(invoiceDate, paymentTermDays);

        // Create invoice
        const invoice = await tx.aRInvoice.create({
            data: {
                farm_id: input.farm_id,
                invoice_number: invoiceNumber,
                invoice_date: invoiceDate,
                customer_id: input.customer_id,
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

        // Create lines & calculate totals
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

            await tx.aRInvoiceLine.create({
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

        // Update invoice totals
        const totalAmount = subTotal - totalDiscount + totalTax;

        const updated = await tx.aRInvoice.update({
            where: { id: invoice.id },
            data: {
                sub_total: subTotal,
                discount_amount: totalDiscount,
                tax_amount: totalTax,
                total_amount: totalAmount,
            },
            include: {
                customer: { select: { id: true, name: true, code: true } },
                lines: { orderBy: { line_number: 'asc' } },
            },
        });

        return formatARInvoice(updated);
    });
}

// ==========================================
// UPDATE AR INVOICE (DRAFT ONLY)
// ==========================================

export async function updateARInvoice(
    farmId: string,
    id: string,
    input: UpdateARInvoiceInput
): Promise<ARInvoice> {
    const invoice = await prisma.aRInvoice.findFirst({
        where: { id, farm_id: farmId },
    });

    if (!invoice) throw new Error('Hóa đơn không tồn tại');
    if (invoice.status !== 'DRAFT') throw new Error('Chỉ có thể sửa hóa đơn nháp');

    return prisma.$transaction(async (tx) => {
        // Update basic fields
        const updateData: any = {};

        if (input.invoice_date) {
            updateData.invoice_date = new Date(input.invoice_date);
            updateData.due_date = addDays(
                new Date(input.invoice_date),
                input.payment_term_days || invoice.payment_term_days
            );
        }
        if (input.customer_id) updateData.customer_id = input.customer_id;
        if (input.payment_term_days !== undefined) updateData.payment_term_days = input.payment_term_days;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.notes !== undefined) updateData.notes = input.notes;

        // If lines provided, delete old and recreate
        if (input.lines && input.lines.length > 0) {
            await tx.aRInvoiceLine.deleteMany({ where: { invoice_id: id } });

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

                await tx.aRInvoiceLine.create({
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

        const updated = await tx.aRInvoice.update({
            where: { id },
            data: updateData,
            include: {
                customer: { select: { id: true, name: true, code: true } },
                lines: { orderBy: { line_number: 'asc' } },
            },
        });

        return formatARInvoice(updated);
    });
}

// ==========================================
// DELETE AR INVOICE (DRAFT ONLY)
// ==========================================

export async function deleteARInvoice(
    farmId: string,
    id: string
): Promise<void> {
    const invoice = await prisma.aRInvoice.findFirst({
        where: { id, farm_id: farmId },
    });

    if (!invoice) throw new Error('Hóa đơn không tồn tại');
    if (invoice.status !== 'DRAFT') throw new Error('Chỉ có thể xóa hóa đơn nháp');

    await prisma.$transaction([
        prisma.aRInvoiceLine.deleteMany({ where: { invoice_id: id } }),
        prisma.aRInvoice.delete({ where: { id } }),
    ]);
}

// ==========================================
// POST AR INVOICE (DRAFT → POSTED)
// ==========================================

export interface PostInvoiceResult {
    invoice: ARInvoice;
    stockMovements: { product_id: string; quantity: number }[];
}

export async function postInvoice(
    farmId: string,
    invoiceId: string,
    userId: string
): Promise<PostInvoiceResult> {
    // 1. Validate invoice
    const invoice = await prisma.aRInvoice.findFirst({
        where: { id: invoiceId, farm_id: farmId },
        include: { lines: true, customer: { select: { name: true } } },
    });

    if (!invoice) throw new Error('Hóa đơn không tồn tại');
    if (invoice.status !== 'DRAFT') throw new Error('Chỉ có thể ghi sổ hóa đơn nháp');
    if (!invoice.lines || invoice.lines.length === 0) throw new Error('Hóa đơn phải có ít nhất 1 dòng');

    const stockMovements: { product_id: string; quantity: number }[] = [];

    // 2. Execute in transaction
    const updated = await prisma.$transaction(async (tx) => {
        // 2a. Create stock movements for products (xuất kho)
        for (const line of invoice.lines) {
            if (line.product_id) {
                const quantity = Number(line.quantity);

                // Create stock movement record
                const movementCode = await generateMovementCodeForPost(tx, farmId, invoice.invoice_date);
                await tx.stockMovement.create({
                    data: {
                        farm_id: farmId,
                        code: movementCode,
                        date: invoice.invoice_date,
                        type: 'OUT',
                        product_id: line.product_id,
                        quantity: quantity,
                        unit: line.unit || 'kg',
                        unit_price: line.unit_price,
                        partner_id: invoice.customer_id,
                        notes: `Xuất hàng theo HĐ ${invoice.invoice_number}`,
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

                stockMovements.push({ product_id: line.product_id, quantity });
            }
        }

        // 2b. Create journal entry (Transaction)
        const journalNumber = await generateJournalNumber(tx, farmId, invoice.invoice_date);
        const journalEntry = await tx.transaction.create({
            data: {
                farm_id: farmId,
                trans_number: journalNumber,
                code: journalNumber,
                trans_date: invoice.invoice_date,
                trans_type: 'INCOME',
                partner_id: invoice.customer_id,
                partner_name: invoice.customer?.name,
                amount: invoice.sub_total,
                subtotal: invoice.sub_total,
                vat_amount: invoice.tax_amount,
                tax_amount: invoice.tax_amount,
                discount_amount: invoice.discount_amount,
                total_amount: invoice.total_amount,
                payment_status: 'PENDING',
                paid_amount: 0,
                debit_account: '131', // Công nợ phải thu
                credit_account: '511', // Doanh thu
                description: `Bán hàng - ${invoice.invoice_number}`,
                notes: invoice.description,
                income_category: 'GENERAL',
                created_by: userId,
            },
        });

        // 2c. Update customer balance (tăng công nợ)
        await tx.partner.update({
            where: { id: invoice.customer_id },
            data: { balance: { increment: invoice.total_amount } },
        });

        // 2d. Update invoice status
        return tx.aRInvoice.update({
            where: { id: invoiceId },
            data: {
                status: 'POSTED',
                posted_at: new Date(),
                posted_by: userId,
                journal_entry_id: journalEntry.id,
            },
            include: {
                customer: { select: { id: true, name: true, code: true } },
                lines: { orderBy: { line_number: 'asc' } },
            },
        });
    });

    return {
        invoice: formatARInvoice(updated),
        stockMovements,
    };
}

// ==========================================
// VOID AR INVOICE (HỦY HÓA ĐƠN)
// ==========================================

export interface VoidInvoiceInput {
    reason?: string;
}

export async function voidInvoice(
    farmId: string,
    invoiceId: string,
    userId: string,
    input?: VoidInvoiceInput
): Promise<ARInvoice> {
    // 1. Validate invoice
    const invoice = await prisma.aRInvoice.findFirst({
        where: { id: invoiceId, farm_id: farmId },
        include: { lines: true },
    });

    if (!invoice) throw new Error('Hóa đơn không tồn tại');
    if (invoice.status === 'VOID') throw new Error('Hóa đơn đã bị hủy');
    if (invoice.status === 'PAID') throw new Error('Không thể hủy hóa đơn đã thanh toán đủ');
    if (Number(invoice.paid_amount) > 0) throw new Error('Không thể hủy hóa đơn đã có thanh toán');

    // 2. Execute in transaction
    const updated = await prisma.$transaction(async (tx) => {
        // 2a. If was POSTED, reverse stock movements
        if (invoice.status === 'POSTED' || invoice.status === 'PARTIALLY_PAID' || invoice.status === 'OVERDUE') {
            for (const line of invoice.lines) {
                if (line.product_id) {
                    const quantity = Number(line.quantity);

                    // Create reverse stock movement (nhập lại kho)
                    const movementCode = await generateMovementCodeForPost(tx, farmId, new Date());
                    await tx.stockMovement.create({
                        data: {
                            farm_id: farmId,
                            code: movementCode,
                            date: new Date(),
                            type: 'IN',
                            product_id: line.product_id,
                            quantity: quantity,
                            unit: line.unit || 'kg',
                            unit_price: line.unit_price,
                            partner_id: invoice.customer_id,
                            notes: `Nhập lại kho do hủy HĐ ${invoice.invoice_number}`,
                        },
                    });

                    // Update stock quantity (increment back)
                    const existingStock = await tx.stock.findFirst({
                        where: { farm_id: farmId, product_id: line.product_id },
                    });

                    if (existingStock) {
                        await tx.stock.update({
                            where: { id: existingStock.id },
                            data: { quantity: { increment: quantity } },
                        });
                    }
                }
            }

            // 2b. Reverse customer balance (giảm công nợ)
            await tx.partner.update({
                where: { id: invoice.customer_id },
                data: { balance: { decrement: invoice.total_amount } },
            });
        }

        // 2c. Update invoice status
        return tx.aRInvoice.update({
            where: { id: invoiceId },
            data: {
                status: 'VOID',
                notes: input?.reason
                    ? `${invoice.notes || ''}\n[HỦY] ${input.reason}`.trim()
                    : invoice.notes,
            },
            include: {
                customer: { select: { id: true, name: true, code: true } },
                lines: { orderBy: { line_number: 'asc' } },
            },
        });
    });

    return formatARInvoice(updated);
}

// Helper: Generate stock movement code for posting
async function generateMovementCodeForPost(tx: any, farmId: string, date: Date): Promise<string> {
    const dateStr = date.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
    const prefix = `XK${dateStr}`; // XK = Xuất kho

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

// Helper: Generate journal entry number
async function generateJournalNumber(tx: any, farmId: string, date: Date): Promise<string> {
    const dateStr = date.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
    const prefix = `JE${dateStr}`; // JE = Journal Entry

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

// ==========================================
// HELPERS
// ==========================================

async function generateInvoiceNumber(farmId: string, prefix: string): Promise<string> {
    const year = new Date().getFullYear();

    const lastInvoice = await prisma.aRInvoice.findFirst({
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

function formatARInvoice(inv: any): ARInvoice {
    return {
        id: inv.id,
        farm_id: inv.farm_id,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date.toISOString().split('T')[0],
        customer_id: inv.customer_id,
        customer_name: inv.customer?.name,
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
