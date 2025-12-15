// src/services/stock-reports.service.ts
// Stock Reports Service - Báo cáo Kho

import prisma from '@/lib/prisma';
import { roundMoney, roundQuantity } from '@/lib/decimal';
import type {
    StockMovementReport,
    StockMovementReportParams,
    StockMovementReportItem,
    StockCard,
    StockCardParams,
    StockCardEntry,
    StockAgingReport,
    StockAgingItem,
    StockValuationReport,
    StockValuationItem,
} from '@/types/stock-reports';

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getMovementDescription(type: string): string {
    switch (type) {
        case 'IN': return 'Nhập kho';
        case 'OUT': return 'Xuất kho';
        case 'ADJUST_IN': return 'Điều chỉnh tăng';
        case 'ADJUST_OUT': return 'Điều chỉnh giảm';
        case 'TRANSFER': return 'Chuyển kho';
        case 'RETURN': return 'Trả hàng';
        default: return type;
    }
}

// ==========================================
// BÁO CÁO NHẬP XUẤT TỒN
// ==========================================

export async function getStockMovementReport(
    farmId: string,
    params: StockMovementReportParams
): Promise<StockMovementReport> {
    const { date_from, date_to, product_id, category } = params;

    const fromDate = new Date(date_from);
    const toDate = new Date(date_to);
    toDate.setHours(23, 59, 59, 999);

    // 1. Lấy danh sách sản phẩm
    const productWhere: Record<string, unknown> = {
        farm_id: farmId,
        deleted_at: null,
    };
    if (product_id) productWhere.id = product_id;
    if (category) productWhere.category = category;

    const products = await prisma.product.findMany({
        where: productWhere,
        select: { id: true, code: true, name: true, unit: true, category: true },
    });

    const items: StockMovementReportItem[] = [];

    for (const product of products) {
        // 2. Tính tồn đầu kỳ (các movement trước from_date)
        const openingMovements = await prisma.stockMovement.findMany({
            where: {
                farm_id: farmId,
                product_id: product.id,
                date: { lt: fromDate },
            },
            select: { type: true, quantity: true, unit_price: true, cogs_amount: true },
        });

        let openingQty = 0;
        let openingValue = 0;
        for (const m of openingMovements) {
            const qty = Number(m.quantity);
            if (['IN', 'ADJUST_IN'].includes(m.type)) {
                openingQty += qty;
                openingValue += qty * Number(m.unit_price);
            } else {
                openingQty -= qty;
                openingValue -= Number(m.cogs_amount);
            }
        }

        // 3. Tính nhập trong kỳ
        const inMovements = await prisma.stockMovement.findMany({
            where: {
                farm_id: farmId,
                product_id: product.id,
                date: { gte: fromDate, lte: toDate },
                type: { in: ['IN', 'ADJUST_IN'] },
            },
            select: { quantity: true, unit_price: true },
        });

        const inQty = inMovements.reduce((sum, m) => sum + Number(m.quantity), 0);
        const inValue = inMovements.reduce((sum, m) => sum + Number(m.quantity) * Number(m.unit_price), 0);

        // 4. Tính xuất trong kỳ
        const outMovements = await prisma.stockMovement.findMany({
            where: {
                farm_id: farmId,
                product_id: product.id,
                date: { gte: fromDate, lte: toDate },
                type: { in: ['OUT', 'ADJUST_OUT'] },
            },
            select: { quantity: true, cogs_amount: true },
        });

        const outQty = outMovements.reduce((sum, m) => sum + Number(m.quantity), 0);
        const outValue = outMovements.reduce((sum, m) => sum + Number(m.cogs_amount), 0);

        // 5. Tính tồn cuối kỳ
        const closingQty = openingQty + inQty - outQty;
        const closingValue = openingValue + inValue - outValue;
        const closingAvgCost = closingQty > 0 ? closingValue / closingQty : 0;

        // Chỉ thêm nếu có movement
        if (openingQty !== 0 || inQty !== 0 || outQty !== 0 || closingQty !== 0) {
            items.push({
                product_id: product.id,
                product_code: product.code,
                product_name: product.name,
                unit: product.unit,
                category: product.category || 'Khác',

                opening_qty: roundQuantity(openingQty),
                opening_value: roundMoney(openingValue),

                in_qty: roundQuantity(inQty),
                in_value: roundMoney(inValue),

                out_qty: roundQuantity(outQty),
                out_value: roundMoney(outValue),

                closing_qty: roundQuantity(closingQty),
                closing_value: roundMoney(closingValue),
                closing_avg_cost: roundMoney(closingAvgCost),
            });
        }
    }

    // 6. Tính summary
    const summary = items.reduce(
        (acc, item) => ({
            total_opening_value: acc.total_opening_value + item.opening_value,
            total_in_value: acc.total_in_value + item.in_value,
            total_out_value: acc.total_out_value + item.out_value,
            total_closing_value: acc.total_closing_value + item.closing_value,
        }),
        { total_opening_value: 0, total_in_value: 0, total_out_value: 0, total_closing_value: 0 }
    );

    return {
        period: { from: date_from, to: date_to },
        items,
        summary: {
            total_opening_value: roundMoney(summary.total_opening_value),
            total_in_value: roundMoney(summary.total_in_value),
            total_out_value: roundMoney(summary.total_out_value),
            total_closing_value: roundMoney(summary.total_closing_value),
        },
        generated_at: new Date().toISOString(),
    };
}

// ==========================================
// THẺ KHO
// ==========================================

export async function getStockCard(farmId: string, params: StockCardParams): Promise<StockCard> {
    const { product_id, date_from, date_to } = params;

    const fromDate = new Date(date_from);
    const toDate = new Date(date_to);
    toDate.setHours(23, 59, 59, 999);

    // 1. Lấy thông tin sản phẩm
    const product = await prisma.product.findFirst({
        where: { id: product_id, farm_id: farmId },
        select: { id: true, code: true, name: true, unit: true },
    });

    if (!product) throw new Error('Sản phẩm không tồn tại');

    // 2. Tính số dư đầu kỳ
    const openingMovements = await prisma.stockMovement.findMany({
        where: {
            farm_id: farmId,
            product_id,
            date: { lt: fromDate },
        },
        select: { type: true, quantity: true, unit_price: true, cogs_amount: true },
        orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
    });

    let openingQty = 0;
    let openingValue = 0;
    for (const m of openingMovements) {
        const qty = Number(m.quantity);
        if (['IN', 'ADJUST_IN'].includes(m.type)) {
            openingQty += qty;
            openingValue += qty * Number(m.unit_price);
        } else {
            openingQty -= qty;
            openingValue -= Number(m.cogs_amount);
        }
    }

    const opening = {
        qty: roundQuantity(openingQty),
        value: roundMoney(openingValue),
        avg_cost: openingQty > 0 ? roundMoney(openingValue / openingQty) : 0,
    };

    // 3. Lấy các movement trong kỳ
    const movements = await prisma.stockMovement.findMany({
        where: {
            farm_id: farmId,
            product_id,
            date: { gte: fromDate, lte: toDate },
        },
        include: {
            partner: { select: { name: true } },
        },
        orderBy: [{ date: 'asc' }, { created_at: 'asc' }],
    });

    // 4. Build entries
    let runningQty = opening.qty;
    let runningValue = opening.value;

    const entries: StockCardEntry[] = movements.map((m) => {
        const isIn = ['IN', 'ADJUST_IN'].includes(m.type);
        const qty = Number(m.quantity);
        const price = Number(m.unit_price);
        const value = isIn ? qty * price : Number(m.cogs_amount);

        if (isIn) {
            runningQty += qty;
            runningValue += value;
        } else {
            runningQty -= qty;
            runningValue -= value;
        }

        return {
            date: m.date.toISOString().split('T')[0],
            code: m.code,
            type: m.type as 'IN' | 'OUT' | 'ADJUST_IN' | 'ADJUST_OUT',
            description: m.reason || getMovementDescription(m.type),
            partner_name: m.partner?.name,

            in_qty: isIn ? roundQuantity(qty) : undefined,
            in_price: isIn ? roundMoney(price) : undefined,
            in_value: isIn ? roundMoney(value) : undefined,

            out_qty: !isIn ? roundQuantity(qty) : undefined,
            out_price: !isIn ? roundMoney(Number(m.avg_cost_before)) : undefined,
            out_value: !isIn ? roundMoney(value) : undefined,

            balance_qty: roundQuantity(runningQty),
            balance_value: roundMoney(runningValue),
            avg_cost: runningQty > 0 ? roundMoney(runningValue / runningQty) : 0,
        };
    });

    // 5. Tính totals
    const totals = entries.reduce(
        (acc, e) => ({
            in_qty: acc.in_qty + (e.in_qty || 0),
            in_value: acc.in_value + (e.in_value || 0),
            out_qty: acc.out_qty + (e.out_qty || 0),
            out_value: acc.out_value + (e.out_value || 0),
        }),
        { in_qty: 0, in_value: 0, out_qty: 0, out_value: 0 }
    );

    return {
        product,
        period: { from: date_from, to: date_to },
        opening,
        entries,
        totals: {
            in_qty: roundQuantity(totals.in_qty),
            in_value: roundMoney(totals.in_value),
            out_qty: roundQuantity(totals.out_qty),
            out_value: roundMoney(totals.out_value),
        },
        closing: {
            qty: roundQuantity(runningQty),
            value: roundMoney(runningValue),
            avg_cost: runningQty > 0 ? roundMoney(runningValue / runningQty) : 0,
        },
        generated_at: new Date().toISOString(),
    };
}

// ==========================================
// BÁO CÁO TUỔI TỒN KHO
// ==========================================

export async function getStockAgingReport(farmId: string): Promise<StockAgingReport> {
    const now = new Date();

    // Lấy danh sách stocks có tồn
    const stocks = await prisma.stock.findMany({
        where: {
            farm_id: farmId,
            quantity: { gt: 0 },
        },
        include: {
            product: { select: { code: true, name: true, unit: true } },
        },
    });

    const items: StockAgingItem[] = [];

    for (const stock of stocks) {
        // Lấy last movement dates
        const lastIn = await prisma.stockMovement.findFirst({
            where: {
                farm_id: farmId,
                product_id: stock.product_id,
                type: { in: ['IN', 'ADJUST_IN'] },
            },
            orderBy: { date: 'desc' },
            select: { date: true },
        });

        const lastOut = await prisma.stockMovement.findFirst({
            where: {
                farm_id: farmId,
                product_id: stock.product_id,
                type: { in: ['OUT', 'ADJUST_OUT'] },
            },
            orderBy: { date: 'desc' },
            select: { date: true },
        });

        const lastMovementDate = stock.last_movement_at || lastIn?.date || lastOut?.date;
        const daysSinceLastMovement = lastMovementDate
            ? Math.floor((now.getTime() - new Date(lastMovementDate).getTime()) / (1000 * 60 * 60 * 24))
            : 999;

        const qty = Number(stock.quantity);
        const value = Number(stock.total_value);

        items.push({
            product_id: stock.product_id,
            product_code: stock.product.code,
            product_name: stock.product.name,
            unit: stock.product.unit,

            total_qty: roundQuantity(qty),
            total_value: roundMoney(value),

            age_0_30: {
                qty: daysSinceLastMovement <= 30 ? roundQuantity(qty) : 0,
                value: daysSinceLastMovement <= 30 ? roundMoney(value) : 0,
            },
            age_31_60: {
                qty: daysSinceLastMovement > 30 && daysSinceLastMovement <= 60 ? roundQuantity(qty) : 0,
                value: daysSinceLastMovement > 30 && daysSinceLastMovement <= 60 ? roundMoney(value) : 0,
            },
            age_61_90: {
                qty: daysSinceLastMovement > 60 && daysSinceLastMovement <= 90 ? roundQuantity(qty) : 0,
                value: daysSinceLastMovement > 60 && daysSinceLastMovement <= 90 ? roundMoney(value) : 0,
            },
            age_over_90: {
                qty: daysSinceLastMovement > 90 ? roundQuantity(qty) : 0,
                value: daysSinceLastMovement > 90 ? roundMoney(value) : 0,
            },

            last_in_date: lastIn?.date?.toISOString().split('T')[0],
            last_out_date: lastOut?.date?.toISOString().split('T')[0],
            days_since_last_movement: daysSinceLastMovement,
        });
    }

    // Sort by days since last movement (oldest first)
    items.sort((a, b) => b.days_since_last_movement - a.days_since_last_movement);

    return {
        as_of_date: now.toISOString().split('T')[0],
        items,
        summary: {
            total_products: items.length,
            total_value: roundMoney(items.reduce((sum, i) => sum + i.total_value, 0)),
            slow_moving_count: items.filter((i) => i.days_since_last_movement > 60).length,
            dead_stock_count: items.filter((i) => i.days_since_last_movement > 90).length,
        },
        generated_at: now.toISOString(),
    };
}

// ==========================================
// BÁO CÁO GIÁ TRỊ TỒN KHO
// ==========================================

export async function getStockValuationReport(farmId: string): Promise<StockValuationReport> {
    const now = new Date();

    const stocks = await prisma.stock.findMany({
        where: { farm_id: farmId, quantity: { gt: 0 } },
        include: {
            product: { select: { id: true, code: true, name: true, category: true, unit: true } },
        },
        orderBy: { total_value: 'desc' },
    });

    const totalValue = stocks.reduce((sum, s) => sum + Number(s.total_value), 0);

    const items: StockValuationItem[] = stocks.map((s) => ({
        product_id: s.product_id,
        product_code: s.product.code,
        product_name: s.product.name,
        category: s.product.category || 'Khác',
        unit: s.product.unit,
        quantity: roundQuantity(Number(s.quantity)),
        avg_cost: roundMoney(Number(s.avg_cost)),
        total_value: roundMoney(Number(s.total_value)),
        value_percentage: totalValue > 0 ? roundMoney((Number(s.total_value) / totalValue) * 100) : 0,
    }));

    // Group by category
    const categoryMap = new Map<string, number>();
    items.forEach((item) => {
        const current = categoryMap.get(item.category) || 0;
        categoryMap.set(item.category, current + item.total_value);
    });

    const by_category = Array.from(categoryMap.entries())
        .map(([category, total]) => ({
            category,
            total_value: roundMoney(total),
            percentage: totalValue > 0 ? roundMoney((total / totalValue) * 100) : 0,
        }))
        .sort((a, b) => b.total_value - a.total_value);

    return {
        as_of_date: now.toISOString().split('T')[0],
        items,
        by_category,
        summary: {
            total_products: items.length,
            total_quantity: roundQuantity(items.reduce((sum, i) => sum + i.quantity, 0)),
            total_value: roundMoney(totalValue),
        },
        generated_at: now.toISOString(),
    };
}
