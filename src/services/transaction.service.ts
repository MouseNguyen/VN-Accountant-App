// src/services/transaction.service.ts
// Business logic cho Transaction module

import { prismaBase } from '@/lib/prisma';
import { getCurrentFarmId, getContext } from '@/lib/context';
import { createAuditLog } from './audit-log.service';
import { PaymentStatus, Prisma } from '@prisma/client';
import type {
    CreateTransactionInput,
    UpdateTransactionInput,
    AddPaymentInput,
} from '@/lib/validations/transaction';
import {
    toDecimal,
    sum,
    multiply,
    percent,
    roundMoney,
    calculateMovingAverageCost,
    isGreaterThan,
} from '@/lib/decimal';
import { TRANSACTION_CONSTANTS } from '@/lib/validations/transaction';

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Tính toán các giá trị cho 1 item sử dụng decimal.js
 */
function calculateItemTotals(item: {
    quantity: number;
    unit_price: number;
    tax_rate?: number;
    discount_percent?: number;
}) {
    const qty = toDecimal(item.quantity);
    const price = toDecimal(item.unit_price);
    const subtotal = multiply(qty, price);

    const discountAmount = percent(subtotal, item.discount_percent || 0);
    const afterDiscount = subtotal.minus(discountAmount);
    const taxAmount = percent(afterDiscount, item.tax_rate || 0);
    const lineTotal = afterDiscount.plus(taxAmount);

    return {
        discount_amount: roundMoney(discountAmount),
        tax_amount: roundMoney(taxAmount),
        line_total: roundMoney(lineTotal),
    };
}

/**
 * Tính payment status dựa trên số tiền đã thanh toán
 */
function calculatePaymentStatus(paidAmount: number, totalAmount: number): PaymentStatus {
    if (paidAmount <= 0) return 'PENDING';
    if (paidAmount >= totalAmount) return 'PAID';
    return 'PARTIAL';
}

/**
 * Kiểm tra tồn kho đủ không (khi bán hàng)
 */
async function checkStockAvailability(
    tx: Prisma.TransactionClient,
    farmId: string,
    items: Array<{ product_id?: string | null; quantity: number }>
): Promise<{ valid: boolean; message?: string }> {
    // Lấy config farm
    const farm = await tx.farm.findUnique({
        where: { id: farmId },
        select: { allow_negative_stock: true },
    });

    // Nếu cho phép âm, không cần check
    if (farm?.allow_negative_stock) {
        return { valid: true };
    }

    // Check từng product
    for (const item of items) {
        if (!item.product_id) continue;

        const product = await tx.product.findUnique({
            where: { id: item.product_id },
            select: { name: true, stock_qty: true },
        });

        if (!product) continue;

        if (isGreaterThan(item.quantity, product.stock_qty)) {
            return {
                valid: false,
                message: `Sản phẩm "${product.name}" không đủ tồn kho (còn ${Number(product.stock_qty)}, cần ${item.quantity})`,
            };
        }
    }

    return { valid: true };
}

/**
 * Kiểm tra hạn mức công nợ khi tạo giao dịch (credit limit check)
 * Chỉ áp dụng khi:
 * - Giao dịch có partner
 * - Partner có credit_limit > 0
 * - Giao dịch chưa thanh toán đủ (payment_status != PAID)
 */
async function checkCreditLimit(
    tx: Prisma.TransactionClient,
    partnerId: string,
    transactionAmount: number,
    paidAmount: number = 0
): Promise<{ valid: boolean; message?: string; current_balance?: number; credit_limit?: number }> {
    const partner = await tx.partner.findUnique({
        where: { id: partnerId },
        select: {
            id: true,
            name: true,
            credit_limit: true,
            balance: true,
            partner_type: true,
        },
    });

    if (!partner) {
        return { valid: true }; // Partner không tồn tại, bỏ qua check
    }

    const creditLimit = Number(partner.credit_limit);

    // Nếu không có credit limit (= 0), không giới hạn
    if (creditLimit <= 0) {
        return { valid: true };
    }

    const currentBalance = Math.abs(Number(partner.balance));
    const unpaidAmount = transactionAmount - paidAmount;
    const newBalance = currentBalance + unpaidAmount;

    if (newBalance > creditLimit) {
        return {
            valid: false,
            message: `Vượt hạn mức công nợ! Hạn mức: ${creditLimit.toLocaleString()}đ, ` +
                `Nợ hiện tại: ${currentBalance.toLocaleString()}đ, ` +
                `Giao dịch này: ${unpaidAmount.toLocaleString()}đ, ` +
                `Tổng sau GD: ${newBalance.toLocaleString()}đ`,
            current_balance: currentBalance,
            credit_limit: creditLimit,
        };
    }

    return { valid: true, current_balance: currentBalance, credit_limit: creditLimit };
}

/**
 * Cập nhật giá vốn trung bình khi NHẬP hàng (EXPENSE)
 */
async function updateMovingAverageCost(
    tx: Prisma.TransactionClient,
    productId: string,
    newQty: number,
    newCost: number
) {
    const product = await tx.product.findUnique({
        where: { id: productId },
        select: { stock_qty: true, avg_cost: true },
    });

    if (!product) return;

    const oldQty = Number(product.stock_qty);
    const oldAvgCost = Number(product.avg_cost);

    // Tính giá vốn trung bình mới
    const newAvgCost = calculateMovingAverageCost(oldQty, oldAvgCost, newQty, newCost);

    await tx.product.update({
        where: { id: productId },
        data: { avg_cost: newAvgCost },
    });
}

// ==========================================
// MAIN FUNCTIONS
// ==========================================

/**
 * Tạo giao dịch mới
 */
export async function createTransaction(input: CreateTransactionInput) {
    const farmId = getCurrentFarmId();
    const context = getContext();

    // Sử dụng transaction với timeout
    return prismaBase.$transaction(
        async (tx) => {
            // 1. Kiểm tra tồn kho nếu là phiếu BÁN (INCOME)
            if (input.trans_type === 'INCOME') {
                const stockCheck = await checkStockAvailability(tx, farmId, input.items);
                if (!stockCheck.valid) {
                    throw new Error(stockCheck.message);
                }
            }

            // 2. Parse trans_date
            const transDate = input.trans_date ? new Date(input.trans_date) : new Date();

            // 3. Generate code với trans_date (sử dụng DB function)
            const codeResult = await tx.$queryRaw<[{ code: string }]>`
        SELECT generate_transaction_code(${input.trans_type}, ${transDate}::timestamptz) as code
      `;
            const code = codeResult[0].code;

            // 4. Lấy thông tin sản phẩm (avg_cost, unit)
            const productIds = input.items.filter((i) => i.product_id).map((i) => i.product_id!);
            const products = await tx.product.findMany({
                where: { id: { in: productIds } },
                select: { id: true, avg_cost: true, unit: true },
            });
            const productMap = new Map(products.map((p) => [p.id, p]));

            // 5. Tính toán items với decimal.js
            const itemsWithTotals = input.items.map((item) => {
                const totals = calculateItemTotals(item);
                const product = item.product_id ? productMap.get(item.product_id) : null;

                return {
                    product_id: item.product_id || null,
                    description: item.description || null,
                    quantity: item.quantity,
                    unit: item.unit || product?.unit || 'kg',
                    unit_price: item.unit_price,
                    unit_cost: product ? Number(product.avg_cost) : 0, // Lưu giá vốn tại thời điểm giao dịch
                    tax_rate: item.tax_rate || 0,
                    discount_percent: item.discount_percent || 0,
                    ...totals,
                };
            });

            // 6. Tính tổng với decimal.js
            const subtotal = roundMoney(
                sum(...itemsWithTotals.map((i) => multiply(i.quantity, i.unit_price)))
            );
            const itemTaxTotal = roundMoney(sum(...itemsWithTotals.map((i) => i.tax_amount)));
            const itemDiscountTotal = roundMoney(sum(...itemsWithTotals.map((i) => i.discount_amount)));
            const headerDiscount = input.discount_amount || 0;
            const totalAmount = roundMoney(subtotal - itemDiscountTotal + itemTaxTotal - headerDiscount);

            // 7. Payment status
            const paidAmount = input.paid_amount || 0;
            const paymentStatus = calculatePaymentStatus(paidAmount, totalAmount);

            // 7.1. Kiểm tra hạn mức công nợ (nếu có partner và chưa thanh toán hết)
            if (input.partner_id && paymentStatus !== 'PAID') {
                const creditCheck = await checkCreditLimit(tx, input.partner_id, totalAmount, paidAmount);
                if (!creditCheck.valid) {
                    throw new Error(creditCheck.message);
                }
            }

            // 8. Tạo Transaction
            const transaction = await tx.transaction.create({
                data: {
                    farm_id: farmId,
                    trans_number: code,
                    code,
                    trans_type: input.trans_type,
                    trans_date: transDate,
                    partner_id: input.partner_id || null,
                    description: input.description || null,
                    amount: subtotal,
                    subtotal,
                    tax_amount: itemTaxTotal,
                    discount_amount: headerDiscount + itemDiscountTotal,
                    total_amount: totalAmount,
                    paid_amount: paidAmount,
                    payment_method: input.payment_method || 'CASH',
                    payment_status: paymentStatus,
                    payment_note: input.payment_note || null,
                    created_by: context?.userId || null,
                    items: {
                        create: itemsWithTotals,
                    },
                },
                include: {
                    items: {
                        include: { product: { select: { id: true, code: true, name: true, unit: true } } },
                    },
                    partner: { select: { id: true, code: true, name: true, partner_type: true } },
                },
            });

            // 9. Cập nhật tồn kho & giá vốn
            for (const item of itemsWithTotals) {
                if (!item.product_id) continue;

                if (input.trans_type === 'INCOME') {
                    // BÁN -> Giảm tồn kho
                    await tx.product.update({
                        where: { id: item.product_id },
                        data: { stock_qty: { decrement: item.quantity } },
                    });
                } else {
                    // MUA -> Tăng tồn kho + Cập nhật giá vốn trung bình
                    await tx.product.update({
                        where: { id: item.product_id },
                        data: { stock_qty: { increment: item.quantity } },
                    });

                    // Cập nhật Moving Average Cost
                    await updateMovingAverageCost(tx, item.product_id, item.quantity, item.unit_price);
                }
            }

            // 10. Cập nhật công nợ Partner
            if (input.partner_id) {
                const outstandingAmount = totalAmount - paidAmount;

                if (outstandingAmount > 0) {
                    if (input.trans_type === 'INCOME') {
                        // Khách nợ ta (balance dương)
                        await tx.partner.update({
                            where: { id: input.partner_id },
                            data: { balance: { increment: outstandingAmount } },
                        });
                    } else {
                        // Ta nợ NCC (balance âm)
                        await tx.partner.update({
                            where: { id: input.partner_id },
                            data: { balance: { decrement: outstandingAmount } },
                        });
                    }
                }
            }

            // 11. Audit Log
            await createAuditLog({
                action: 'CREATE',
                entityType: 'Transaction',
                entityId: transaction.id,
                newValues: { code, trans_type: input.trans_type, total_amount: totalAmount },
                description: `Tạo ${input.trans_type === 'INCOME' ? 'phiếu thu' : 'phiếu chi'}: ${code}`,
            });

            return transaction;
        },
        {
            timeout: TRANSACTION_CONSTANTS.TRANSACTION_TIMEOUT,
        }
    );
}

/**
 * Cập nhật giao dịch
 * NOTE: Không cho phép đổi trans_type
 */
export async function updateTransaction(id: string, input: UpdateTransactionInput) {
    const farmId = getCurrentFarmId();

    return prismaBase.$transaction(
        async (tx) => {
            // 1. Lấy transaction hiện tại
            const existing = await tx.transaction.findFirst({
                where: { id, farm_id: farmId, deleted_at: null },
                include: {
                    items: true,
                    partner: true,
                    farm: { select: { allow_negative_stock: true } },
                },
            });

            if (!existing) {
                throw new Error('Không tìm thấy giao dịch');
            }

            // 2. Optimistic Locking
            if (existing.version !== input.version) {
                throw new Error('Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang.');
            }

            // 3. Không cho sửa giao dịch PAID > 7 ngày
            const daysSinceCreated = Math.floor(
                (Date.now() - existing.created_at.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (existing.payment_status === 'PAID' && daysSinceCreated > 7) {
                throw new Error('Không thể sửa giao dịch đã thanh toán quá 7 ngày');
            }

            // 4. Hoàn trả tồn kho cũ (REVERSE)
            for (const oldItem of existing.items) {
                if (!oldItem.product_id) continue;

                if (existing.trans_type === 'INCOME') {
                    // Đã trừ kho khi bán -> Cộng lại
                    await tx.product.update({
                        where: { id: oldItem.product_id },
                        data: { stock_qty: { increment: Number(oldItem.quantity) } },
                    });
                } else {
                    // Đã cộng kho khi mua -> Trừ lại
                    await tx.product.update({
                        where: { id: oldItem.product_id },
                        data: { stock_qty: { decrement: Number(oldItem.quantity) } },
                    });
                }
            }

            // 5. Hoàn trả công nợ cũ
            if (existing.partner_id) {
                const oldOutstanding = Number(existing.total_amount) - Number(existing.paid_amount);

                if (oldOutstanding > 0) {
                    if (existing.trans_type === 'INCOME') {
                        await tx.partner.update({
                            where: { id: existing.partner_id },
                            data: { balance: { decrement: oldOutstanding } },
                        });
                    } else {
                        await tx.partner.update({
                            where: { id: existing.partner_id },
                            data: { balance: { increment: oldOutstanding } },
                        });
                    }
                }
            }

            // 6. Xóa items cũ nếu có items mới
            if (input.items) {
                await tx.transactionItem.deleteMany({ where: { transaction_id: id } });
            }

            // 7. Chuẩn bị update data
            const updateData: Prisma.TransactionUpdateInput = { version: existing.version + 1 };

            if (input.trans_date) updateData.trans_date = new Date(input.trans_date);
            if (input.partner_id !== undefined) {
                updateData.partner = input.partner_id
                    ? { connect: { id: input.partner_id } }
                    : { disconnect: true };
            }
            if (input.description !== undefined) updateData.description = input.description;
            if (input.payment_method) updateData.payment_method = input.payment_method;
            if (input.payment_note !== undefined) updateData.payment_note = input.payment_note;

            let newTotalAmount = Number(existing.total_amount);
            let newPaidAmount = input.paid_amount ?? Number(existing.paid_amount);

            // 8. Tính toán items mới nếu có
            if (input.items) {
                // Kiểm tra tồn kho mới nếu là phiếu bán
                if (existing.trans_type === 'INCOME' && !existing.farm.allow_negative_stock) {
                    const stockCheck = await checkStockAvailability(tx, farmId, input.items);
                    if (!stockCheck.valid) {
                        throw new Error(stockCheck.message);
                    }
                }

                // Lấy products
                const productIds = input.items.filter((i) => i.product_id).map((i) => i.product_id!);
                const products = await tx.product.findMany({
                    where: { id: { in: productIds } },
                    select: { id: true, avg_cost: true, unit: true },
                });
                const productMap = new Map(products.map((p) => [p.id, p]));

                const itemsWithTotals = input.items.map((item) => {
                    const totals = calculateItemTotals(item);
                    const product = item.product_id ? productMap.get(item.product_id) : null;
                    return {
                        product_id: item.product_id || null,
                        description: item.description || null,
                        quantity: item.quantity,
                        unit: item.unit || product?.unit || 'kg',
                        unit_price: item.unit_price,
                        unit_cost: product ? Number(product.avg_cost) : 0,
                        tax_rate: item.tax_rate || 0,
                        discount_percent: item.discount_percent || 0,
                        ...totals,
                    };
                });

                const subtotal = roundMoney(
                    sum(...itemsWithTotals.map((i) => multiply(i.quantity, i.unit_price)))
                );
                const itemTaxTotal = roundMoney(sum(...itemsWithTotals.map((i) => i.tax_amount)));
                const itemDiscountTotal = roundMoney(sum(...itemsWithTotals.map((i) => i.discount_amount)));
                const headerDiscount = input.discount_amount ?? Number(existing.discount_amount);
                newTotalAmount = roundMoney(subtotal - itemDiscountTotal + itemTaxTotal - headerDiscount);

                updateData.subtotal = subtotal;
                updateData.tax_amount = itemTaxTotal;
                updateData.discount_amount = headerDiscount + itemDiscountTotal;
                updateData.total_amount = newTotalAmount;
                updateData.items = { create: itemsWithTotals };

                // Cập nhật tồn kho mới
                for (const item of itemsWithTotals) {
                    if (!item.product_id) continue;

                    if (existing.trans_type === 'INCOME') {
                        await tx.product.update({
                            where: { id: item.product_id },
                            data: { stock_qty: { decrement: item.quantity } },
                        });
                    } else {
                        await tx.product.update({
                            where: { id: item.product_id },
                            data: { stock_qty: { increment: item.quantity } },
                        });
                        await updateMovingAverageCost(tx, item.product_id, item.quantity, item.unit_price);
                    }
                }
            }

            // 9. Payment status
            if (input.paid_amount !== undefined) {
                updateData.paid_amount = input.paid_amount;
                newPaidAmount = input.paid_amount;
            }
            updateData.payment_status = calculatePaymentStatus(newPaidAmount, newTotalAmount);

            // 10. Update transaction
            const updated = await tx.transaction.update({
                where: { id },
                data: updateData,
                include: {
                    items: {
                        include: { product: { select: { id: true, code: true, name: true, unit: true } } },
                    },
                    partner: { select: { id: true, code: true, name: true, partner_type: true } },
                },
            });

            // 11. Cập nhật công nợ mới
            const newPartnerId = input.partner_id ?? existing.partner_id;
            if (newPartnerId) {
                const newOutstanding = newTotalAmount - newPaidAmount;

                if (newOutstanding > 0) {
                    if (existing.trans_type === 'INCOME') {
                        await tx.partner.update({
                            where: { id: newPartnerId },
                            data: { balance: { increment: newOutstanding } },
                        });
                    } else {
                        await tx.partner.update({
                            where: { id: newPartnerId },
                            data: { balance: { decrement: newOutstanding } },
                        });
                    }
                }
            }

            // 12. Audit Log
            await createAuditLog({
                action: 'UPDATE',
                entityType: 'Transaction',
                entityId: id,
                oldValues: {
                    total_amount: Number(existing.total_amount),
                    paid_amount: Number(existing.paid_amount),
                },
                newValues: { total_amount: newTotalAmount, paid_amount: newPaidAmount },
                description: `Cập nhật giao dịch: ${existing.code}`,
            });

            return updated;
        },
        { timeout: TRANSACTION_CONSTANTS.TRANSACTION_TIMEOUT }
    );
}

/**
 * Xóa giao dịch (soft delete)
 */
export async function deleteTransaction(id: string) {
    const farmId = getCurrentFarmId();

    return prismaBase.$transaction(
        async (tx) => {
            const existing = await tx.transaction.findFirst({
                where: { id, farm_id: farmId, deleted_at: null },
                include: { items: true },
            });

            if (!existing) {
                throw new Error('Không tìm thấy giao dịch');
            }

            if (existing.payment_status === 'PAID') {
                throw new Error('Không thể xóa giao dịch đã thanh toán đầy đủ');
            }

            // Hoàn trả tồn kho
            for (const item of existing.items) {
                if (!item.product_id) continue;

                if (existing.trans_type === 'INCOME') {
                    await tx.product.update({
                        where: { id: item.product_id },
                        data: { stock_qty: { increment: Number(item.quantity) } },
                    });
                } else {
                    await tx.product.update({
                        where: { id: item.product_id },
                        data: { stock_qty: { decrement: Number(item.quantity) } },
                    });
                }
            }

            // Hoàn trả công nợ
            if (existing.partner_id) {
                const outstanding = Number(existing.total_amount) - Number(existing.paid_amount);

                if (outstanding > 0) {
                    if (existing.trans_type === 'INCOME') {
                        await tx.partner.update({
                            where: { id: existing.partner_id },
                            data: { balance: { decrement: outstanding } },
                        });
                    } else {
                        await tx.partner.update({
                            where: { id: existing.partner_id },
                            data: { balance: { increment: outstanding } },
                        });
                    }
                }
            }

            // Soft delete
            await tx.transaction.update({
                where: { id },
                data: { deleted_at: new Date(), payment_status: 'CANCELLED' },
            });

            await createAuditLog({
                action: 'DELETE',
                entityType: 'Transaction',
                entityId: id,
                oldValues: { code: existing.code },
                description: `Xóa giao dịch: ${existing.code}`,
            });

            return { success: true };
        },
        { timeout: 10000 }
    );
}

/**
 * Thêm thanh toán cho giao dịch
 */
export async function addPayment(transactionId: string, input: AddPaymentInput) {
    const farmId = getCurrentFarmId();

    return prismaBase.$transaction(
        async (tx) => {
            const transaction = await tx.transaction.findFirst({
                where: { id: transactionId, farm_id: farmId, deleted_at: null },
            });

            if (!transaction) throw new Error('Không tìm thấy giao dịch');
            if (transaction.payment_status === 'PAID')
                throw new Error('Giao dịch đã thanh toán đầy đủ');

            const total = Number(transaction.total_amount);
            const paid = Number(transaction.paid_amount);
            const remaining = total - paid;

            if (input.amount > remaining) {
                throw new Error(
                    `Số tiền thanh toán vượt quá số còn lại (${remaining.toLocaleString()}đ)`
                );
            }

            const newPaidAmount = roundMoney(paid + input.amount);
            const newStatus = calculatePaymentStatus(newPaidAmount, total);

            const updated = await tx.transaction.update({
                where: { id: transactionId },
                data: {
                    paid_amount: newPaidAmount,
                    payment_status: newStatus,
                    payment_method: input.payment_method || transaction.payment_method,
                    payment_note: input.note || transaction.payment_note,
                    version: transaction.version + 1,
                },
            });

            // Giảm công nợ
            if (transaction.partner_id) {
                if (transaction.trans_type === 'INCOME') {
                    await tx.partner.update({
                        where: { id: transaction.partner_id },
                        data: { balance: { decrement: input.amount } },
                    });
                } else {
                    await tx.partner.update({
                        where: { id: transaction.partner_id },
                        data: { balance: { increment: input.amount } },
                    });
                }
            }

            await createAuditLog({
                action: 'UPDATE',
                entityType: 'Transaction',
                entityId: transactionId,
                description: `Thanh toán ${input.amount.toLocaleString()}đ cho ${transaction.code}`,
            });

            return updated;
        },
        { timeout: 10000 }
    );
}

/**
 * Lấy chi tiết giao dịch
 */
export async function getTransactionById(id: string) {
    const farmId = getCurrentFarmId();

    const transaction = await prismaBase.transaction.findFirst({
        where: { id, farm_id: farmId, deleted_at: null },
        include: {
            partner: { select: { id: true, code: true, name: true, partner_type: true, phone: true } },
            items: {
                include: { product: { select: { id: true, code: true, name: true, unit: true } } },
            },
        },
    });

    return transaction;
}
