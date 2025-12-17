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
// Tax Engine 2025: VAT and CIT validation
import { validateAndSaveVAT } from '@/lib/tax/vat-validator';

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

/**
 * Sync Stock table when transaction items change
 * Also creates StockMovement records for audit trail
 */
async function syncStockForItem(
    tx: Prisma.TransactionClient,
    farmId: string,
    productId: string,
    quantity: number,
    unitPrice: number,
    isOutbound: boolean, // true for SALE/INCOME, false for PURCHASE/EXPENSE
    transactionCode: string,
    transactionId: string,
    transDate: Date,
    userId: string | null
) {
    // 1. Get current product and stock data
    const product = await tx.product.findUnique({
        where: { id: productId },
        select: { stock_qty: true, avg_cost: true, unit: true },
    });
    if (!product) return;

    const stock = await tx.stock.findFirst({
        where: { farm_id: farmId, product_id: productId },
    });

    const oldQty = stock ? Number(stock.quantity) : Number(product.stock_qty);
    const oldAvgCost = stock ? Number(stock.avg_cost) : Number(product.avg_cost);

    // 2. Calculate new values
    let newQty: number;
    let newAvgCost: number;
    let cogsAmount = 0;

    if (isOutbound) {
        // SALE: decrease stock, keep avg_cost
        newQty = oldQty - quantity;
        newAvgCost = oldAvgCost;
        cogsAmount = roundMoney(quantity * oldAvgCost);
    } else {
        // PURCHASE: increase stock, recalculate avg_cost
        newQty = oldQty + quantity;
        newAvgCost = calculateMovingAverageCost(oldQty, oldAvgCost, quantity, unitPrice);
    }

    // 3. Upsert Stock record
    await tx.stock.upsert({
        where: {
            farm_id_product_id_location_code: {
                farm_id: farmId,
                product_id: productId,
                location_code: 'DEFAULT',
            },
        },
        update: {
            quantity: newQty,
            avg_cost: newAvgCost,
            total_value: roundMoney(newQty * newAvgCost),
            last_movement_at: new Date(),
        },
        create: {
            farm_id: farmId,
            product_id: productId,
            location_code: 'DEFAULT',
            quantity: newQty,
            avg_cost: newAvgCost,
            total_value: roundMoney(newQty * newAvgCost),
            last_movement_at: new Date(),
        },
    });

    // 4. Create StockMovement record
    const movementType = isOutbound ? 'OUT' : 'IN';
    const movementCode = `${transactionCode}-${productId.slice(-4).toUpperCase()}`;

    await tx.stockMovement.create({
        data: {
            farm_id: farmId,
            type: movementType,
            code: movementCode,
            date: transDate,
            product_id: productId,
            quantity: quantity,
            unit: product.unit,
            unit_price: unitPrice,
            avg_cost_before: oldAvgCost,
            avg_cost_after: newAvgCost,
            cogs_amount: cogsAmount,
            qty_before: oldQty,
            qty_after: newQty,
            from_location: isOutbound ? 'DEFAULT' : null,
            to_location: isOutbound ? null : 'DEFAULT',
            transaction_id: transactionId,
            reason: isOutbound ? 'Bán hàng' : 'Mua hàng',
            created_by: userId,
        },
    });
}

/**
 * Reverse stock changes when deleting/updating transaction
 */
async function reverseStockForItem(
    tx: Prisma.TransactionClient,
    farmId: string,
    productId: string,
    quantity: number,
    isOutbound: boolean,
    transactionCode: string,
    transactionId: string,
    userId: string | null
) {
    // Reverse = opposite of original operation
    const reverseQty = isOutbound ? quantity : -quantity;

    const stock = await tx.stock.findFirst({
        where: { farm_id: farmId, product_id: productId },
    });

    if (stock) {
        const newQty = Number(stock.quantity) + reverseQty;
        await tx.stock.update({
            where: { id: stock.id },
            data: {
                quantity: newQty,
                total_value: roundMoney(newQty * Number(stock.avg_cost)),
                last_movement_at: new Date(),
            },
        });

        // Create adjustment movement
        await tx.stockMovement.create({
            data: {
                farm_id: farmId,
                type: reverseQty > 0 ? 'ADJUST_IN' : 'ADJUST_OUT',
                code: `REV-${transactionCode}-${productId.slice(-4).toUpperCase()}`,
                date: new Date(),
                product_id: productId,
                quantity: Math.abs(reverseQty),
                unit: 'kg',
                unit_price: 0,
                avg_cost_before: Number(stock.avg_cost),
                avg_cost_after: Number(stock.avg_cost),
                cogs_amount: 0,
                qty_before: Number(stock.quantity),
                qty_after: newQty,
                transaction_id: transactionId,
                reason: 'Điều chỉnh do xóa/sửa giao dịch',
                created_by: userId,
            },
        });
    }
}

/**
 * Create AR Transaction for unpaid SALE/INCOME
 */
async function createARForTransaction(
    tx: Prisma.TransactionClient,
    farmId: string,
    transactionId: string,
    transactionCode: string,
    customerId: string,
    transDate: Date,
    totalAmount: number,
    paidAmount: number
) {
    const balance = totalAmount - paidAmount;
    if (balance <= 0) return; // Fully paid, no AR needed

    // Get customer payment terms
    const customer = await tx.partner.findUnique({
        where: { id: customerId },
        select: { payment_term_days: true },
    });

    const dueDate = new Date(transDate);
    dueDate.setDate(dueDate.getDate() + (customer?.payment_term_days || 30));

    // Generate AR code
    const dateStr = transDate.toISOString().split('T')[0].replace(/-/g, '');
    const count = await tx.aRTransaction.count({
        where: { farm_id: farmId, trans_date: transDate },
    });
    const arCode = `AR-${dateStr}-${String(count + 1).padStart(3, '0')}`;

    await tx.aRTransaction.create({
        data: {
            farm_id: farmId,
            customer_id: customerId,
            transaction_id: transactionId,
            type: 'INVOICE',
            code: arCode,
            trans_date: transDate,
            amount: totalAmount,
            paid_amount: paidAmount,
            balance: balance,
            due_date: dueDate,
            status: paidAmount > 0 ? 'PARTIAL' : 'UNPAID',
        },
    });
}

/**
 * Create AP Transaction for unpaid PURCHASE/EXPENSE
 */
async function createAPForTransaction(
    tx: Prisma.TransactionClient,
    farmId: string,
    transactionId: string,
    transactionCode: string,
    vendorId: string,
    transDate: Date,
    totalAmount: number,
    paidAmount: number
) {
    const balance = totalAmount - paidAmount;
    if (balance <= 0) return; // Fully paid, no AP needed

    // Get vendor payment terms
    const vendor = await tx.partner.findUnique({
        where: { id: vendorId },
        select: { payment_term_days: true },
    });

    const dueDate = new Date(transDate);
    dueDate.setDate(dueDate.getDate() + (vendor?.payment_term_days || 30));

    // Generate AP code
    const dateStr = transDate.toISOString().split('T')[0].replace(/-/g, '');
    const count = await tx.aPTransaction.count({
        where: { farm_id: farmId, trans_date: transDate },
    });
    const apCode = `AP-${dateStr}-${String(count + 1).padStart(3, '0')}`;

    await tx.aPTransaction.create({
        data: {
            farm_id: farmId,
            vendor_id: vendorId,
            transaction_id: transactionId,
            type: 'INVOICE',
            code: apCode,
            trans_date: transDate,
            amount: totalAmount,
            paid_amount: paidAmount,
            balance: balance,
            due_date: dueDate,
            status: paidAmount > 0 ? 'PARTIAL' : 'UNPAID',
        },
    });
}

/**
 * Update AR/AP when payment is made
 */
async function updateARAPForPayment(
    tx: Prisma.TransactionClient,
    transactionId: string,
    paymentAmount: number,
    transType: string
) {
    if (['SALE', 'INCOME'].includes(transType)) {
        // Update AR
        const arTrans = await tx.aRTransaction.findFirst({
            where: { transaction_id: transactionId },
        });
        if (arTrans) {
            const newPaidAmount = Number(arTrans.paid_amount) + paymentAmount;
            const newBalance = Number(arTrans.amount) - newPaidAmount;
            await tx.aRTransaction.update({
                where: { id: arTrans.id },
                data: {
                    paid_amount: newPaidAmount,
                    balance: Math.max(0, newBalance),
                    status: newBalance <= 0 ? 'PAID' : 'PARTIAL',
                },
            });
        }
    } else if (['PURCHASE', 'EXPENSE'].includes(transType)) {
        // Update AP
        const apTrans = await tx.aPTransaction.findFirst({
            where: { transaction_id: transactionId },
        });
        if (apTrans) {
            const newPaidAmount = Number(apTrans.paid_amount) + paymentAmount;
            const newBalance = Number(apTrans.amount) - newPaidAmount;
            await tx.aPTransaction.update({
                where: { id: apTrans.id },
                data: {
                    paid_amount: newPaidAmount,
                    balance: Math.max(0, newBalance),
                    status: newBalance <= 0 ? 'PAID' : 'PARTIAL',
                },
            });
        }
    }
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
            // 0. Validate input items
            if (!input.items || input.items.length === 0) {
                throw new Error('Giao dịch phải có ít nhất 1 sản phẩm/dịch vụ');
            }

            // Validate each item
            for (let i = 0; i < input.items.length; i++) {
                const item = input.items[i];
                const itemLabel = item.description || `Dòng ${i + 1}`;

                if (item.quantity <= 0) {
                    throw new Error(`${itemLabel}: Số lượng phải lớn hơn 0`);
                }
                if (item.unit_price < 0) {
                    throw new Error(`${itemLabel}: Đơn giá không được âm`);
                }
                if ((item.tax_rate || 0) < 0 || (item.tax_rate || 0) > 100) {
                    throw new Error(`${itemLabel}: Thuế suất phải từ 0% đến 100%`);
                }
                if ((item.discount_percent || 0) < 0 || (item.discount_percent || 0) > 100) {
                    throw new Error(`${itemLabel}: Chiết khấu phải từ 0% đến 100%`);
                }
            }

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

            // 9. Cập nhật tồn kho, Stock table, và StockMovement
            const isOutbound = ['SALE', 'INCOME'].includes(input.trans_type);
            for (const item of itemsWithTotals) {
                if (!item.product_id) continue;

                // Update Product.stock_qty (legacy)
                if (isOutbound) {
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

                // Sync Stock table and create StockMovement
                await syncStockForItem(
                    tx,
                    farmId,
                    item.product_id,
                    item.quantity,
                    item.unit_price,
                    isOutbound,
                    code,
                    transaction.id,
                    transDate,
                    context?.userId || null
                );
            }

            // 10. Cập nhật công nợ Partner
            if (input.partner_id) {
                const outstandingAmount = totalAmount - paidAmount;

                if (outstandingAmount > 0) {
                    if (isOutbound) {
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

                // 10.1 Auto-create AR/AP for unpaid transactions
                if (isOutbound) {
                    await createARForTransaction(
                        tx,
                        farmId,
                        transaction.id,
                        code,
                        input.partner_id,
                        transDate,
                        totalAmount,
                        paidAmount
                    );
                } else {
                    await createAPForTransaction(
                        tx,
                        farmId,
                        transaction.id,
                        code,
                        input.partner_id,
                        transDate,
                        totalAmount,
                        paidAmount
                    );
                }
            }

            // 11. Audit Log
            await createAuditLog({
                action: 'CREATE',
                entityType: 'Transaction',
                entityId: transaction.id,
                newValues: { code, trans_type: input.trans_type, total_amount: totalAmount },
                description: `Tạo ${isOutbound ? 'phiếu thu' : 'phiếu chi'}: ${code}`,
            });

            // ==========================================
            // 12. TAX ENGINE 2025: Auto VAT/CIT Validation
            // ==========================================
            if (['PURCHASE', 'EXPENSE'].includes(input.trans_type) && itemTaxTotal > 0) {
                try {
                    // Get partner info for supplier status
                    let supplierStatus: 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | 'BANKRUPT' | undefined;
                    let supplierTaxCode: string | undefined;
                    let supplierName: string | undefined;

                    if (input.partner_id) {
                        const partner = await tx.partner.findUnique({
                            where: { id: input.partner_id },
                            select: { supplier_status: true, tax_code: true, name: true },
                        });
                        supplierStatus = partner?.supplier_status as any;
                        supplierTaxCode = partner?.tax_code ?? undefined;
                        supplierName = partner?.name ?? undefined;
                    }

                    // Validate VAT deduction
                    const vatResult = await validateAndSaveVAT(farmId, transaction.id, {
                        invoice_date: transDate,
                        supplier_tax_code: supplierTaxCode,
                        supplier_name: supplierName,
                        supplier_status: supplierStatus,
                        goods_value: Number(subtotal),
                        vat_rate: Number(itemTaxTotal) > 0 ? (Number(itemTaxTotal) / Number(subtotal)) * 100 : 0,
                        vat_amount: Number(itemTaxTotal),
                        total_amount: totalAmount,
                        payment_method: input.payment_method || 'CASH',
                        has_bank_payment: input.payment_method === 'BANK_TRANSFER',
                        skip_mst_lookup: true, // Skip MST lookup on create for speed
                    });

                    // Also check CIT deductibility (same rules as VAT for cash > 20M)
                    const isCashOverLimit = (input.payment_method === 'CASH' && totalAmount >= 20000000);

                    // Update CIT fields based on VAT result
                    await tx.transaction.update({
                        where: { id: transaction.id },
                        data: {
                            // CIT follows similar rules to VAT for cash payments
                            cit_deductible: vatResult.is_deductible && !isCashOverLimit,
                            cit_addback_amount: isCashOverLimit ? totalAmount : 0,
                            cit_addback_reason: isCashOverLimit ? 'CIT_NO_INVOICE' : null,
                        },
                    });
                } catch (taxError) {
                    // Tax Engine validation is non-blocking - log and continue
                    console.warn('Tax Engine validation warning:', taxError);
                }
            }

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

            // 3.1. Validate input items (if updating items)
            if (input.items && input.items.length > 0) {
                for (let i = 0; i < input.items.length; i++) {
                    const item = input.items[i];
                    const itemLabel = item.description || `Dòng ${i + 1}`;

                    if (item.quantity <= 0) {
                        throw new Error(`${itemLabel}: Số lượng phải lớn hơn 0`);
                    }
                    if (item.unit_price < 0) {
                        throw new Error(`${itemLabel}: Đơn giá không được âm`);
                    }
                    if ((item.tax_rate || 0) < 0 || (item.tax_rate || 0) > 100) {
                        throw new Error(`${itemLabel}: Thuế suất phải từ 0% đến 100%`);
                    }
                    if ((item.discount_percent || 0) < 0 || (item.discount_percent || 0) > 100) {
                        throw new Error(`${itemLabel}: Chiết khấu phải từ 0% đến 100%`);
                    }
                }
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

                // Sync AR/AP records
                await updateARAPForPayment(tx, transactionId, input.amount, transaction.trans_type);
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
