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
