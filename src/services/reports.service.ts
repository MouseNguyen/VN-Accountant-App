// src/services/reports.service.ts
// Accounting Reports Service - Phase 2 Task 6
// FIXED: Uses Transaction table with correct field names

import { prisma } from '@/lib/prisma';
import {
    CashBookReport,
    BankBookReport,
    PurchaseInvoiceReport,
    SalesInvoiceReport,
    AR131Report,
    AP331Report,
    TrialBalanceReport,
    ProfitLossReport,
    StockMovementReport,
    ReportQueryParams,
    ReportMeta,
} from '@/types/reports';

// ==========================================
// HELPER: Build Report Meta
// ==========================================

async function buildReportMeta(
    farmId: string,
    reportName: string,
    params: ReportQueryParams
): Promise<ReportMeta> {
    const farm = await prisma.farm.findUnique({
        where: { id: farmId },
        select: { name: true, tax_code: true },
    });

    return {
        report_name: reportName,
        period: {
            from_date: params.from,
            to_date: params.to,
        },
        generated_at: new Date().toISOString(),
        farm_name: farm?.name || '',
        farm_tax_code: farm?.tax_code || undefined,
    };
}

// Transaction types that count as INCOME (thu tiền)
const INCOME_TYPES = ['INCOME', 'SALE', 'CASH_IN'];
// Transaction types that count as EXPENSE (chi tiền)
const EXPENSE_TYPES = ['EXPENSE', 'PURCHASE', 'CASH_OUT'];

function isIncomeType(type: string): boolean {
    return INCOME_TYPES.includes(type);
}

function isExpenseType(type: string): boolean {
    return EXPENSE_TYPES.includes(type);
}

function getTransTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        INCOME: 'Thu tiền',
        SALE: 'Bán hàng',
        CASH_IN: 'Thu tiền mặt',
        EXPENSE: 'Chi tiền',
        PURCHASE: 'Mua hàng',
        CASH_OUT: 'Chi tiền mặt',
    };
    return labels[type] || type;
}

// ==========================================
// 1. SỔ QUỸ TIỀN MẶT (TK 111)
// ==========================================

export async function getCashBookReport(
    farmId: string,
    params: ReportQueryParams
): Promise<CashBookReport> {
    const fromDate = new Date(params.from);
    const toDate = new Date(params.to);
    toDate.setHours(23, 59, 59, 999);

    // Tính số dư đầu kỳ - Giao dịch CASH trước kỳ
    const openingTransactions = await prisma.transaction.findMany({
        where: {
            farm_id: farmId,
            payment_method: 'CASH',
            trans_date: { lt: fromDate },
            deleted_at: null,
        },
        select: { trans_type: true, total_amount: true },
    });

    let openingBalance = 0;
    for (const t of openingTransactions) {
        if (isIncomeType(t.trans_type)) {
            openingBalance += Number(t.total_amount);
        } else if (isExpenseType(t.trans_type)) {
            openingBalance -= Number(t.total_amount);
        }
    }

    // Lấy giao dịch trong kỳ
    const transactions = await prisma.transaction.findMany({
        where: {
            farm_id: farmId,
            payment_method: 'CASH',
            trans_date: { gte: fromDate, lte: toDate },
            deleted_at: null,
        },
        include: {
            partner: { select: { name: true } },
        },
        orderBy: [{ trans_date: 'asc' }, { created_at: 'asc' }],
    });

    // Build entries
    let runningBalance = openingBalance;
    let totalDebit = 0;
    let totalCredit = 0;

    const entries = transactions.map((t) => {
        const isDebit = isIncomeType(t.trans_type);
        const amount = Number(t.total_amount);

        const debit = isDebit ? amount : 0;
        const credit = !isDebit ? amount : 0;

        runningBalance = runningBalance + debit - credit;
        totalDebit += debit;
        totalCredit += credit;

        return {
            date: t.trans_date.toISOString().split('T')[0],
            code: t.code || t.trans_number,
            description: t.description || getTransTypeLabel(t.trans_type),
            partner_name: t.partner?.name || t.partner_name || undefined,
            debit,
            credit,
            balance: runningBalance,
            transaction_id: t.id,
        };
    });

    return {
        meta: await buildReportMeta(farmId, 'Sổ quỹ tiền mặt', params),
        account: {
            code: '111',
            name: 'Tiền mặt',
        },
        opening_balance: openingBalance,
        entries,
        totals: {
            total_debit: totalDebit,
            total_credit: totalCredit,
        },
        closing_balance: runningBalance,
    };
}

// ==========================================
// 2. SỔ TIỀN GỬI NGÂN HÀNG (TK 112)
// ==========================================

export async function getBankBookReport(
    farmId: string,
    params: ReportQueryParams
): Promise<BankBookReport> {
    const fromDate = new Date(params.from);
    const toDate = new Date(params.to);
    toDate.setHours(23, 59, 59, 999);

    // Số dư đầu kỳ
    const openingTransactions = await prisma.transaction.findMany({
        where: {
            farm_id: farmId,
            payment_method: 'BANK_TRANSFER',
            trans_date: { lt: fromDate },
            deleted_at: null,
        },
        select: { trans_type: true, total_amount: true },
    });

    let openingBalance = 0;
    for (const t of openingTransactions) {
        if (isIncomeType(t.trans_type)) {
            openingBalance += Number(t.total_amount);
        } else if (isExpenseType(t.trans_type)) {
            openingBalance -= Number(t.total_amount);
        }
    }

    const transactions = await prisma.transaction.findMany({
        where: {
            farm_id: farmId,
            payment_method: 'BANK_TRANSFER',
            trans_date: { gte: fromDate, lte: toDate },
            deleted_at: null,
        },
        include: { partner: { select: { name: true } } },
        orderBy: [{ trans_date: 'asc' }, { created_at: 'asc' }],
    });

    let runningBalance = openingBalance;
    let totalDebit = 0;
    let totalCredit = 0;

    const entries = transactions.map((t) => {
        const isDebit = isIncomeType(t.trans_type);
        const amount = Number(t.total_amount);
        const debit = isDebit ? amount : 0;
        const credit = !isDebit ? amount : 0;

        runningBalance = runningBalance + debit - credit;
        totalDebit += debit;
        totalCredit += credit;

        return {
            date: t.trans_date.toISOString().split('T')[0],
            code: t.code || t.trans_number,
            description: t.description || getTransTypeLabel(t.trans_type),
            partner_name: t.partner?.name || t.partner_name || undefined,
            reference: undefined,
            debit,
            credit,
            balance: runningBalance,
            transaction_id: t.id,
        };
    });

    return {
        meta: await buildReportMeta(farmId, 'Sổ tiền gửi ngân hàng', params),
        account: {
            code: '112',
            name: 'Tiền gửi ngân hàng',
        },
        opening_balance: openingBalance,
        entries,
        totals: { total_debit: totalDebit, total_credit: totalCredit },
        closing_balance: runningBalance,
    };
}

// ==========================================
// 3. BẢNG KÊ HÓA ĐƠN MUA VÀO (EXPENSE)
// ==========================================

export async function getPurchaseInvoiceReport(
    farmId: string,
    params: ReportQueryParams
): Promise<PurchaseInvoiceReport> {
    const fromDate = new Date(params.from);
    const toDate = new Date(params.to);
    toDate.setHours(23, 59, 59, 999);

    // Query EXPENSE/PURCHASE transactions (purchases)
    const transactions = await prisma.transaction.findMany({
        where: {
            farm_id: farmId,
            trans_type: { in: ['EXPENSE', 'PURCHASE'] },
            trans_date: { gte: fromDate, lte: toDate },
            deleted_at: null,
        },
        include: {
            partner: {
                select: { name: true, tax_code: true, address: true },
            },
            items: true,
        },
        orderBy: { trans_date: 'asc' },
    });

    const entries = transactions.map((t, idx) => {
        const goodsValue = Number(t.subtotal || t.amount);
        const vatAmount = Number(t.vat_amount || 0);

        // Calculate VAT rate from amounts
        const vatRate = goodsValue > 0 ? Math.round((vatAmount / goodsValue) * 100) : 0;

        return {
            stt: idx + 1,
            invoice_number: t.code || t.trans_number,
            invoice_date: t.trans_date.toISOString().split('T')[0],
            vendor_tax_code: t.partner?.tax_code || '',
            vendor_name: t.partner?.name || t.partner_name || '',
            vendor_address: t.partner?.address || undefined,
            goods_value: goodsValue,
            vat_rate: vatRate,
            vat_amount: vatAmount,
            total_amount: Number(t.total_amount),
            is_deductible: true,
            notes: t.notes || undefined,
            transaction_id: t.id,
        };
    });

    // Summary
    const totalGoodsValue = entries.reduce((sum, e) => sum + e.goods_value, 0);
    const totalVatAmount = entries.reduce((sum, e) => sum + e.vat_amount, 0);
    const totalAmount = entries.reduce((sum, e) => sum + e.total_amount, 0);

    // By VAT rate
    const byVatRate = [0, 5, 8, 10].map((rate) => {
        const rateEntries = entries.filter((e) => e.vat_rate === rate);
        return {
            rate,
            goods_value: rateEntries.reduce((sum, e) => sum + e.goods_value, 0),
            vat_amount: rateEntries.reduce((sum, e) => sum + e.vat_amount, 0),
        };
    }).filter((r) => r.goods_value > 0);

    return {
        meta: await buildReportMeta(farmId, 'Bảng kê hóa đơn mua vào', params),
        entries,
        summary: {
            total_invoices: entries.length,
            total_goods_value: totalGoodsValue,
            total_vat_amount: totalVatAmount,
            total_amount: totalAmount,
            by_vat_rate: byVatRate,
        },
    };
}

// ==========================================
// 4. BẢNG KÊ HÓA ĐƠN BÁN RA (INCOME)
// ==========================================

export async function getSalesInvoiceReport(
    farmId: string,
    params: ReportQueryParams
): Promise<SalesInvoiceReport> {
    const fromDate = new Date(params.from);
    const toDate = new Date(params.to);
    toDate.setHours(23, 59, 59, 999);

    // Query INCOME/SALE transactions (sales)
    const transactions = await prisma.transaction.findMany({
        where: {
            farm_id: farmId,
            trans_type: { in: ['INCOME', 'SALE'] },
            trans_date: { gte: fromDate, lte: toDate },
            deleted_at: null,
        },
        include: {
            partner: { select: { name: true, tax_code: true, address: true } },
            items: true,
        },
        orderBy: { trans_date: 'asc' },
    });

    const entries = transactions.map((t, idx) => {
        const goodsValue = Number(t.subtotal || t.amount);
        const vatAmount = Number(t.vat_amount || 0);
        const vatRate = goodsValue > 0 ? Math.round((vatAmount / goodsValue) * 100) : 0;

        // Map payment_status
        let paymentStatus: 'PAID' | 'PENDING' | 'PARTIAL' = 'PAID';
        if (t.payment_status === 'PENDING' || t.payment_status === 'UNPAID') {
            paymentStatus = 'PENDING';
        } else if (t.payment_status === 'PARTIAL') {
            paymentStatus = 'PARTIAL';
        }

        return {
            stt: idx + 1,
            invoice_number: t.code || t.trans_number,
            invoice_date: t.trans_date.toISOString().split('T')[0],
            customer_tax_code: t.partner?.tax_code || undefined,
            customer_name: t.partner?.name || t.partner_name || '',
            customer_address: t.partner?.address || undefined,
            goods_value: goodsValue,
            vat_rate: vatRate,
            vat_amount: vatAmount,
            total_amount: Number(t.total_amount),
            payment_status: paymentStatus,
            transaction_id: t.id,
        };
    });

    const totalGoodsValue = entries.reduce((sum, e) => sum + e.goods_value, 0);
    const totalVatAmount = entries.reduce((sum, e) => sum + e.vat_amount, 0);
    const totalAmount = entries.reduce((sum, e) => sum + e.total_amount, 0);

    const byVatRate = [0, 5, 8, 10].map((rate) => {
        const rateEntries = entries.filter((e) => e.vat_rate === rate);
        return {
            rate,
            goods_value: rateEntries.reduce((sum, e) => sum + e.goods_value, 0),
            vat_amount: rateEntries.reduce((sum, e) => sum + e.vat_amount, 0),
        };
    }).filter((r) => r.goods_value > 0);

    return {
        meta: await buildReportMeta(farmId, 'Bảng kê hóa đơn bán ra', params),
        entries,
        summary: {
            total_invoices: entries.length,
            total_goods_value: totalGoodsValue,
            total_vat_amount: totalVatAmount,
            total_amount: totalAmount,
            by_vat_rate: byVatRate,
            by_payment_status: {
                paid: entries.filter((e) => e.payment_status === 'PAID').reduce((s, e) => s + e.total_amount, 0),
                pending: entries.filter((e) => e.payment_status === 'PENDING').reduce((s, e) => s + e.total_amount, 0),
                partial: entries.filter((e) => e.payment_status === 'PARTIAL').reduce((s, e) => s + e.total_amount, 0),
            },
        },
    };
}

// ==========================================
// 5. SỔ CHI TIẾT CÔNG NỢ 131 (Phải thu KH)
// FIXED: Uses Transaction table, not ARTransaction
// ==========================================

export async function getAR131Report(
    farmId: string,
    params: ReportQueryParams
): Promise<AR131Report> {
    const fromDate = new Date(params.from);
    const toDate = new Date(params.to);
    toDate.setHours(23, 59, 59, 999);

    // Lấy danh sách khách hàng
    const customers = await prisma.partner.findMany({
        where: {
            farm_id: farmId,
            partner_type: { in: ['CUSTOMER', 'BOTH'] },
            deleted_at: null,
        },
    });

    const customerDetails = [];
    let summaryOpening = 0;
    let summaryDebit = 0;
    let summaryCredit = 0;
    let summaryClosing = 0;

    for (const customer of customers) {
        // Tính số dư đầu kỳ từ Transaction (INCOME/SALE với payment pending)
        const openingTrans = await prisma.transaction.findMany({
            where: {
                farm_id: farmId,
                partner_id: customer.id,
                trans_type: { in: ['INCOME', 'SALE'] },
                trans_date: { lt: fromDate },
                deleted_at: null,
            },
            select: { total_amount: true, paid_amount: true },
        });

        const openingBalance = openingTrans.reduce((sum, t) => {
            return sum + (Number(t.total_amount) - Number(t.paid_amount));
        }, 0);

        // Lấy giao dịch trong kỳ
        const periodTransactions = await prisma.transaction.findMany({
            where: {
                farm_id: farmId,
                partner_id: customer.id,
                trans_type: { in: ['INCOME', 'SALE'] },
                trans_date: { gte: fromDate, lte: toDate },
                deleted_at: null,
            },
            orderBy: { trans_date: 'asc' },
        });

        if (openingBalance === 0 && periodTransactions.length === 0) continue;

        let runningBalance = openingBalance;
        let totalDebit = 0;
        let totalCredit = 0;

        const entries = periodTransactions.map((t) => {
            const debit = Number(t.total_amount); // Phát sinh nợ
            const credit = Number(t.paid_amount); // Thu tiền

            runningBalance = runningBalance + debit - credit;
            totalDebit += debit;
            totalCredit += credit;

            return {
                date: t.trans_date.toISOString().split('T')[0],
                code: t.code || t.trans_number,
                description: t.description || 'Bán hàng',
                debit,
                credit,
                balance: runningBalance,
            };
        });

        customerDetails.push({
            customer_id: customer.id,
            customer_code: customer.code,
            customer_name: customer.name,
            opening_balance: openingBalance,
            entries,
            total_debit: totalDebit,
            total_credit: totalCredit,
            closing_balance: runningBalance,
        });

        summaryOpening += openingBalance;
        summaryDebit += totalDebit;
        summaryCredit += totalCredit;
        summaryClosing += runningBalance;
    }

    return {
        meta: await buildReportMeta(farmId, 'Sổ chi tiết công nợ 131', params),
        summary_opening: summaryOpening,
        summary_debit: summaryDebit,
        summary_credit: summaryCredit,
        summary_closing: summaryClosing,
        customers: customerDetails,
    };
}

// ==========================================
// 6. SỔ CHI TIẾT CÔNG NỢ 331 (Phải trả NCC)
// FIXED: Uses Transaction table, not APTransaction
// ==========================================

export async function getAP331Report(
    farmId: string,
    params: ReportQueryParams
): Promise<AP331Report> {
    const fromDate = new Date(params.from);
    const toDate = new Date(params.to);
    toDate.setHours(23, 59, 59, 999);

    const vendors = await prisma.partner.findMany({
        where: {
            farm_id: farmId,
            partner_type: { in: ['VENDOR', 'BOTH'] },
            deleted_at: null
        },
    });

    const vendorDetails = [];
    let summaryOpening = 0;
    let summaryDebit = 0;
    let summaryCredit = 0;
    let summaryClosing = 0;

    for (const vendor of vendors) {
        // Số dư đầu kỳ từ EXPENSE/PURCHASE transactions
        const openingTrans = await prisma.transaction.findMany({
            where: {
                farm_id: farmId,
                partner_id: vendor.id,
                trans_type: { in: ['EXPENSE', 'PURCHASE'] },
                trans_date: { lt: fromDate },
                deleted_at: null,
            },
            select: { total_amount: true, paid_amount: true },
        });

        const openingBalance = openingTrans.reduce((sum, t) => {
            return sum + (Number(t.total_amount) - Number(t.paid_amount));
        }, 0);

        const periodTransactions = await prisma.transaction.findMany({
            where: {
                farm_id: farmId,
                partner_id: vendor.id,
                trans_type: { in: ['EXPENSE', 'PURCHASE'] },
                trans_date: { gte: fromDate, lte: toDate },
                deleted_at: null,
            },
            orderBy: { trans_date: 'asc' },
        });

        if (openingBalance === 0 && periodTransactions.length === 0) continue;

        let runningBalance = openingBalance;
        let totalDebit = 0;
        let totalCredit = 0;

        const entries = periodTransactions.map((t) => {
            const debit = Number(t.paid_amount);  // Trả tiền
            const credit = Number(t.total_amount); // Phát sinh nợ

            runningBalance = runningBalance + credit - debit;
            totalDebit += debit;
            totalCredit += credit;

            return {
                date: t.trans_date.toISOString().split('T')[0],
                code: t.code || t.trans_number,
                description: t.description || 'Mua hàng',
                debit,
                credit,
                balance: runningBalance,
            };
        });

        vendorDetails.push({
            vendor_id: vendor.id,
            vendor_code: vendor.code,
            vendor_name: vendor.name,
            opening_balance: openingBalance,
            entries,
            total_debit: totalDebit,
            total_credit: totalCredit,
            closing_balance: runningBalance,
        });

        summaryOpening += openingBalance;
        summaryDebit += totalDebit;
        summaryCredit += totalCredit;
        summaryClosing += runningBalance;
    }

    return {
        meta: await buildReportMeta(farmId, 'Sổ chi tiết công nợ 331', params),
        summary_opening: summaryOpening,
        summary_debit: summaryDebit,
        summary_credit: summaryCredit,
        summary_closing: summaryClosing,
        vendors: vendorDetails,
    };
}

// ==========================================
// 7. BÁO CÁO NXT KHO
// ==========================================

export async function getStockMovementReport(
    farmId: string,
    params: ReportQueryParams
): Promise<StockMovementReport> {
    const fromDate = new Date(params.from);
    const toDate = new Date(params.to);
    toDate.setHours(23, 59, 59, 999);

    // Get all products
    const products = await prisma.product.findMany({
        where: { farm_id: farmId, deleted_at: null },
        orderBy: { code: 'asc' },
    });

    const entries = [];
    let totalOpeningValue = 0;
    let totalInValue = 0;
    let totalOutValue = 0;
    let totalClosingValue = 0;

    for (const product of products) {
        // Opening: movements before period
        const openingMovements = await prisma.stockMovement.findMany({
            where: {
                farm_id: farmId,
                product_id: product.id,
                date: { lt: fromDate },
            },
        });

        let openingQty = 0;
        let openingValue = 0;
        openingMovements.forEach(m => {
            if (m.type === 'IN' || m.type === 'ADJUST_IN') {
                openingQty += Number(m.quantity);
                openingValue += Number(m.quantity) * Number(m.unit_price);
            } else {
                openingQty -= Number(m.quantity);
                openingValue -= Number(m.cogs_amount || 0);
            }
        });

        // Period movements
        const periodMovements = await prisma.stockMovement.findMany({
            where: {
                farm_id: farmId,
                product_id: product.id,
                date: { gte: fromDate, lte: toDate },
            },
        });

        let inQty = 0, inValue = 0, outQty = 0, outValue = 0;
        periodMovements.forEach(m => {
            if (m.type === 'IN' || m.type === 'ADJUST_IN') {
                inQty += Number(m.quantity);
                inValue += Number(m.quantity) * Number(m.unit_price);
            } else {
                outQty += Number(m.quantity);
                outValue += Number(m.cogs_amount || 0);
            }
        });

        const closingQty = openingQty + inQty - outQty;
        const closingValue = openingValue + inValue - outValue;

        if (openingQty !== 0 || inQty !== 0 || outQty !== 0) {
            entries.push({
                product_id: product.id,
                product_code: product.code,
                product_name: product.name,
                unit: product.unit,
                opening_qty: openingQty,
                opening_value: openingValue,
                in_qty: inQty,
                in_value: inValue,
                out_qty: outQty,
                out_value: outValue,
                closing_qty: closingQty,
                closing_value: closingValue,
            });

            totalOpeningValue += openingValue;
            totalInValue += inValue;
            totalOutValue += outValue;
            totalClosingValue += closingValue;
        }
    }

    return {
        meta: await buildReportMeta(farmId, 'Báo cáo nhập xuất tồn kho', params),
        entries,
        totals: {
            opening_value: totalOpeningValue,
            in_value: totalInValue,
            out_value: totalOutValue,
            closing_value: totalClosingValue,
        },
    };
}

// ==========================================
// 8. BẢNG CÂN ĐỐI SỐ PHÁT SINH
// ==========================================

export async function getTrialBalanceReport(
    farmId: string,
    params: ReportQueryParams
): Promise<TrialBalanceReport> {
    // Build accounts from actual data
    const accounts = [];

    // TK 111 - Tiền mặt
    const cashReport = await getCashBookReport(farmId, params);
    accounts.push({
        account_code: '111',
        account_name: 'Tiền mặt',
        level: 1,
        opening_debit: Math.max(0, cashReport.opening_balance),
        opening_credit: Math.max(0, -cashReport.opening_balance),
        period_debit: cashReport.totals.total_debit,
        period_credit: cashReport.totals.total_credit,
        closing_debit: Math.max(0, cashReport.closing_balance),
        closing_credit: Math.max(0, -cashReport.closing_balance),
    });

    // TK 112 - Tiền gửi NH
    const bankReport = await getBankBookReport(farmId, params);
    accounts.push({
        account_code: '112',
        account_name: 'Tiền gửi ngân hàng',
        level: 1,
        opening_debit: Math.max(0, bankReport.opening_balance),
        opening_credit: Math.max(0, -bankReport.opening_balance),
        period_debit: bankReport.totals.total_debit,
        period_credit: bankReport.totals.total_credit,
        closing_debit: Math.max(0, bankReport.closing_balance),
        closing_credit: Math.max(0, -bankReport.closing_balance),
    });

    // TK 131 - Phải thu KH
    const ar131 = await getAR131Report(farmId, params);
    accounts.push({
        account_code: '131',
        account_name: 'Phải thu khách hàng',
        level: 1,
        opening_debit: ar131.summary_opening,
        opening_credit: 0,
        period_debit: ar131.summary_debit,
        period_credit: ar131.summary_credit,
        closing_debit: ar131.summary_closing,
        closing_credit: 0,
    });

    // TK 331 - Phải trả NCC
    const ap331 = await getAP331Report(farmId, params);
    accounts.push({
        account_code: '331',
        account_name: 'Phải trả nhà cung cấp',
        level: 1,
        opening_debit: 0,
        opening_credit: ap331.summary_opening,
        period_debit: ap331.summary_debit,
        period_credit: ap331.summary_credit,
        closing_debit: 0,
        closing_credit: ap331.summary_closing,
    });

    // Tính totals
    const totals = accounts.reduce(
        (acc, a) => ({
            opening_debit: acc.opening_debit + a.opening_debit,
            opening_credit: acc.opening_credit + a.opening_credit,
            period_debit: acc.period_debit + a.period_debit,
            period_credit: acc.period_credit + a.period_credit,
            closing_debit: acc.closing_debit + a.closing_debit,
            closing_credit: acc.closing_credit + a.closing_credit,
        }),
        { opening_debit: 0, opening_credit: 0, period_debit: 0, period_credit: 0, closing_debit: 0, closing_credit: 0 }
    );

    return {
        meta: await buildReportMeta(farmId, 'Bảng cân đối số phát sinh', params),
        accounts,
        totals,
        is_balanced: Math.abs(totals.closing_debit - totals.closing_credit) < 1,
    };
}

// ==========================================
// 9. BÁO CÁO LÃI LỖ
// ==========================================

export async function getProfitLossReport(
    farmId: string,
    params: ReportQueryParams
): Promise<ProfitLossReport> {
    const fromDate = new Date(params.from);
    const toDate = new Date(params.to);
    toDate.setHours(23, 59, 59, 999);

    // Doanh thu (INCOME/SALE)
    const incomeData = await prisma.transaction.aggregate({
        where: {
            farm_id: farmId,
            trans_type: { in: ['INCOME', 'SALE'] },
            trans_date: { gte: fromDate, lte: toDate },
            deleted_at: null,
        },
        _sum: { total_amount: true },
    });

    // Chi phí hoạt động (EXPENSE only, not PURCHASE - PURCHASE becomes COGS when sold)
    const expenseData = await prisma.transaction.aggregate({
        where: {
            farm_id: farmId,
            trans_type: 'EXPENSE', // Removed PURCHASE - it's inventory, not operating expense
            trans_date: { gte: fromDate, lte: toDate },
            deleted_at: null,
        },
        _sum: { total_amount: true },
    });

    // Giá vốn (COGS) từ stock movements
    const cogsData = await prisma.stockMovement.aggregate({
        where: {
            farm_id: farmId,
            type: 'OUT',
            date: { gte: fromDate, lte: toDate },
        },
        _sum: { cogs_amount: true },
    });

    const sales = Number(incomeData._sum.total_amount || 0);
    const totalExpense = Number(expenseData._sum.total_amount || 0);
    const cogs = Number(cogsData._sum.cogs_amount || 0);

    const grossProfit = sales - cogs;
    const netProfit = grossProfit - totalExpense;

    return {
        meta: await buildReportMeta(farmId, 'Báo cáo lãi lỗ', params),
        revenue: {
            sales,
            other_income: 0,
            total: sales,
        },
        cost_of_goods_sold: cogs,
        gross_profit: grossProfit,
        expenses: {
            operating: totalExpense,
            payroll: 0,
            other: 0,
            total: totalExpense,
        },
        net_profit: netProfit,
    };
}
