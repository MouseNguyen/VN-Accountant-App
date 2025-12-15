// src/services/inventory.service.ts
// Inventory Management Service - Quản lý Kho

import { prisma } from '@/lib/prisma';
import {
    toDecimal, multiply, divide, sum, subtract,
    roundMoney, roundQuantity, calculateMovingAverageCost,
    isGreaterThan
} from '@/lib/decimal';
import {
    Stock,
    StockMovement,
    StockListParams,
    StockListResponse,
    StockMovementListParams,
    StockMovementListResponse,
    StockInInput,
    StockOutInput,
    StockAdjustInput,
    StockImportInput,
    StockCount,
    StockCountItem,
    CreateStockCountInput,
    UpdateStockCountItemInput,
    CompleteStockCountInput,
} from '@/types/inventory';
import { StockMovementType } from '@prisma/client';

// ==========================================
// CONSTANTS
// ==========================================

const MOVEMENT_CODE_PREFIX: Record<string, string> = {
    IN: 'PNK',        // Phiếu nhập kho
    OUT: 'PXK',       // Phiếu xuất kho
    ADJUST_IN: 'DCT', // Điều chỉnh tăng
    ADJUST_OUT: 'DCG', // Điều chỉnh giảm
    TRANSFER: 'CK',    // Chuyển kho
    RETURN: 'TH',      // Trả hàng
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Generate movement code: PNK241212001
 */
async function generateMovementCode(
    tx: any,
    farmId: string,
    type: StockMovementType,
    date?: string
): Promise<string> {
    const prefix = MOVEMENT_CODE_PREFIX[type] || 'MOV';
    const dateStr = date || new Date().toISOString().split('T')[0];
    const dateCode = dateStr.replace(/-/g, '').substring(2); // 241212

    // Count movements of this type today
    const startOfDay = new Date(dateStr);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateStr);
    endOfDay.setHours(23, 59, 59, 999);

    const count = await tx.stockMovement.count({
        where: {
            farm_id: farmId,
            type,
            date: {
                gte: startOfDay,
                lte: endOfDay,
            },
        },
    });

    const sequence = String(count + 1).padStart(3, '0');
    return `${prefix}${dateCode}${sequence}`;
}

/**
 * Format stock for API response
 */
function formatStock(stock: any): Stock {
    return {
        id: stock.id,
        product_id: stock.product_id,
        product: stock.product,
        quantity: Number(stock.quantity),
        avg_cost: Number(stock.avg_cost),
        total_value: Number(stock.total_value),
        min_quantity: stock.min_quantity ? Number(stock.min_quantity) : null,
        max_quantity: stock.max_quantity ? Number(stock.max_quantity) : null,
        reorder_point: stock.reorder_point ? Number(stock.reorder_point) : null,
        location_code: stock.location_code || 'DEFAULT',
        last_movement_at: stock.last_movement_at?.toISOString() || null,
        updated_at: stock.updated_at.toISOString(),
    };
}

/**
 * Format movement for API response
 */
function formatMovement(movement: any): StockMovement {
    return {
        id: movement.id,
        type: movement.type,
        code: movement.code,
        date: movement.date.toISOString().split('T')[0],
        product_id: movement.product_id,
        product: movement.product,
        quantity: Number(movement.quantity),
        unit: movement.unit,
        unit_price: Number(movement.unit_price),
        avg_cost_before: Number(movement.avg_cost_before),
        avg_cost_after: Number(movement.avg_cost_after),
        cogs_amount: Number(movement.cogs_amount),
        qty_before: Number(movement.qty_before),
        qty_after: Number(movement.qty_after),
        from_location: movement.from_location,
        to_location: movement.to_location,
        transaction_id: movement.transaction_id,
        partner_id: movement.partner_id,
        partner: movement.partner,
        reason: movement.reason,
        notes: movement.notes,
        created_at: movement.created_at.toISOString(),
        created_by: movement.created_by,
    };
}

// ==========================================
// GET STOCK LIST
// ==========================================

export async function getStocks(
    farmId: string,
    params: StockListParams
): Promise<StockListResponse> {
    const { page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
        farm_id: farmId,
        product: { deleted_at: null },
    };

    if (params.search) {
        where.product = {
            ...where.product,
            OR: [
                { code: { contains: params.search, mode: 'insensitive' } },
                { name: { contains: params.search, mode: 'insensitive' } },
            ],
        };
    }

    if (params.category) {
        where.product = { ...where.product, category: params.category };
    }

    if (params.location_code) {
        where.location_code = params.location_code;
    }

    if (params.out_of_stock) {
        where.quantity = { lte: 0 };
    }

    // Query
    const [items, total, summaryData] = await Promise.all([
        prisma.stock.findMany({
            where,
            include: {
                product: {
                    select: { id: true, code: true, name: true, unit: true, category: true },
                },
            },
            orderBy: params.sort_by === 'name'
                ? { product: { name: params.sort_order } }
                : { [params.sort_by || 'updated_at']: params.sort_order || 'desc' },
            skip,
            take: limit,
        }),
        prisma.stock.count({ where }),
        // Summary aggregate
        prisma.stock.aggregate({
            where: { farm_id: farmId, product: { deleted_at: null } },
            _sum: { total_value: true },
            _count: true,
        }),
    ]);

    // Count low stock and out of stock
    const [outOfStockCount] = await Promise.all([
        prisma.stock.count({
            where: { farm_id: farmId, quantity: { lte: 0 }, product: { deleted_at: null } },
        }),
    ]);

    // Low stock count (where quantity <= min_quantity)
    const lowStockResult = await prisma.$queryRaw<[{ count: string }]>`
    SELECT COUNT(*)::text as count FROM stocks s
    JOIN products p ON s.product_id = p.id
    WHERE s.farm_id = ${farmId}
      AND p.deleted_at IS NULL
      AND s.min_quantity IS NOT NULL
      AND s.quantity <= s.min_quantity
      AND s.quantity > 0
  `;
    const lowStockCount = parseInt(lowStockResult[0]?.count || '0', 10);

    return {
        items: items.map(formatStock),
        total,
        page,
        limit,
        hasMore: page * limit < total,
        summary: {
            total_products: summaryData._count,
            total_value: Number(summaryData._sum.total_value || 0),
            low_stock_count: lowStockCount,
            out_of_stock_count: outOfStockCount,
        },
    };
}

// ==========================================
// GET STOCK MOVEMENTS LIST
// ==========================================

export async function getStockMovements(
    farmId: string,
    params: StockMovementListParams
): Promise<StockMovementListResponse> {
    const { page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { farm_id: farmId };

    if (params.product_id) {
        where.product_id = params.product_id;
    }

    if (params.type) {
        where.type = params.type;
    }

    if (params.partner_id) {
        where.partner_id = params.partner_id;
    }

    if (params.date_from || params.date_to) {
        where.date = {};
        if (params.date_from) where.date.gte = new Date(params.date_from);
        if (params.date_to) where.date.lte = new Date(params.date_to);
    }

    // Query
    const [items, total] = await Promise.all([
        prisma.stockMovement.findMany({
            where,
            include: {
                product: { select: { id: true, code: true, name: true, unit: true } },
                partner: { select: { id: true, code: true, name: true } },
            },
            orderBy: params.sort_by === 'date'
                ? { date: params.sort_order || 'desc' }
                : { [params.sort_by || 'date']: params.sort_order || 'desc' },
            skip,
            take: limit,
        }),
        prisma.stockMovement.count({ where }),
    ]);

    // Calculate summary
    const inMovements = items.filter(m => m.type === 'IN' || m.type === 'ADJUST_IN' || m.type === 'RETURN');
    const outMovements = items.filter(m => m.type === 'OUT' || m.type === 'ADJUST_OUT');

    const totalIn = inMovements.reduce((acc, m) => acc + Number(m.quantity), 0);
    const totalOut = outMovements.reduce((acc, m) => acc + Number(m.quantity), 0);
    const totalValueIn = inMovements.reduce((acc, m) => acc + Number(m.quantity) * Number(m.unit_price), 0);
    const totalValueOut = outMovements.reduce((acc, m) => acc + Number(m.cogs_amount), 0);

    return {
        items: items.map(formatMovement),
        total,
        page,
        limit,
        hasMore: page * limit < total,
        summary: {
            total_in: roundQuantity(totalIn),
            total_out: roundQuantity(totalOut),
            total_value_in: roundMoney(totalValueIn),
            total_value_out: roundMoney(totalValueOut),
        },
    };
}

// ==========================================
// STOCK IN (NHẬP KHO)
// ==========================================

export async function stockIn(
    farmId: string,
    userId: string,
    input: StockInInput
): Promise<StockMovement> {
    return prisma.$transaction(async (tx) => {
        // 1. Lấy thông tin sản phẩm
        const product = await tx.product.findFirst({
            where: { id: input.product_id, farm_id: farmId, deleted_at: null },
        });

        if (!product) {
            throw new Error('Sản phẩm không tồn tại');
        }

        // 2. Lấy tồn kho hiện tại
        const locationCode = input.location_code || 'DEFAULT';
        let stock = await tx.stock.findUnique({
            where: {
                farm_id_product_id_location_code: {
                    farm_id: farmId,
                    product_id: input.product_id,
                    location_code: locationCode,
                },
            },
        });

        const oldQty = stock ? Number(stock.quantity) : 0;
        const oldAvgCost = stock ? Number(stock.avg_cost) : 0;

        // 3. Tính giá vốn bình quân mới (Moving Average)
        const qtyIn = input.quantity;
        const priceIn = input.unit_price;

        const newAvgCost = calculateMovingAverageCost(oldQty, oldAvgCost, qtyIn, priceIn);
        const newQty = roundQuantity(sum(oldQty, qtyIn).toNumber());
        const newTotalValue = roundMoney(multiply(newQty, newAvgCost));

        // 4. Generate code
        const dateStr = input.date || new Date().toISOString().split('T')[0];
        const code = await generateMovementCode(tx, farmId, 'IN', dateStr);

        // 5. Upsert stock
        stock = await tx.stock.upsert({
            where: {
                farm_id_product_id_location_code: {
                    farm_id: farmId,
                    product_id: input.product_id,
                    location_code: locationCode,
                },
            },
            update: {
                quantity: newQty,
                avg_cost: newAvgCost,
                total_value: newTotalValue,
                last_movement_at: new Date(),
            },
            create: {
                farm_id: farmId,
                product_id: input.product_id,
                location_code: locationCode,
                quantity: newQty,
                avg_cost: newAvgCost,
                total_value: newTotalValue,
                last_movement_at: new Date(),
            },
        });

        // 6. Create movement record
        const movement = await tx.stockMovement.create({
            data: {
                farm_id: farmId,
                type: 'IN',
                code,
                date: new Date(dateStr),
                product_id: input.product_id,
                quantity: qtyIn,
                unit: product.unit,
                unit_price: priceIn,
                avg_cost_before: oldAvgCost,
                avg_cost_after: newAvgCost,
                cogs_amount: 0,  // Không có COGS cho nhập kho
                qty_before: oldQty,
                qty_after: newQty,
                to_location: locationCode,
                partner_id: input.partner_id,
                transaction_id: input.transaction_id,
                reason: input.reason || 'Nhập kho',
                notes: input.notes,
                created_by: userId,
            },
            include: {
                product: { select: { id: true, code: true, name: true, unit: true } },
                partner: { select: { id: true, code: true, name: true } },
            },
        });

        // 7. Update product stock_qty (avg_cost is in Stock model, not Product)
        await tx.product.update({
            where: { id: input.product_id },
            data: {
                stock_qty: newQty,
            },
        });

        return formatMovement(movement);
    }, { timeout: 10000 });
}

// ==========================================
// STOCK OUT (XUẤT KHO)
// ==========================================

export async function stockOut(
    farmId: string,
    userId: string,
    input: StockOutInput
): Promise<StockMovement> {
    return prisma.$transaction(async (tx) => {
        // 1. Kiểm tra cài đặt farm
        const farm = await tx.farm.findUnique({
            where: { id: farmId },
            select: { allow_negative_stock: true },
        });

        // 2. Lấy tồn kho hiện tại
        const locationCode = input.location_code || 'DEFAULT';
        const stock = await tx.stock.findUnique({
            where: {
                farm_id_product_id_location_code: {
                    farm_id: farmId,
                    product_id: input.product_id,
                    location_code: locationCode,
                },
            },
            include: { product: true },
        });

        if (!stock) {
            throw new Error('Sản phẩm chưa có trong kho');
        }

        const oldQty = Number(stock.quantity);
        const avgCost = Number(stock.avg_cost);

        // 3. Kiểm tra tồn kho
        if (!farm?.allow_negative_stock && input.quantity > oldQty) {
            throw new Error(`Không đủ tồn kho. Hiện có: ${oldQty} ${stock.product.unit}`);
        }

        // 4. Tính toán
        const qtyOut = input.quantity;
        const newQty = roundQuantity(subtract(oldQty, qtyOut).toNumber());
        const cogsAmount = roundMoney(multiply(qtyOut, avgCost));
        const newTotalValue = roundMoney(multiply(newQty, avgCost));

        // 5. Generate code
        const dateStr = input.date || new Date().toISOString().split('T')[0];
        const code = await generateMovementCode(tx, farmId, 'OUT', dateStr);

        // 6. Update stock
        await tx.stock.update({
            where: { id: stock.id },
            data: {
                quantity: newQty,
                total_value: newTotalValue,
                last_movement_at: new Date(),
            },
        });

        // 7. Create movement
        const movement = await tx.stockMovement.create({
            data: {
                farm_id: farmId,
                type: 'OUT',
                code,
                date: new Date(dateStr),
                product_id: input.product_id,
                quantity: qtyOut,
                unit: stock.product.unit,
                unit_price: avgCost,  // Xuất theo giá vốn bình quân
                avg_cost_before: avgCost,
                avg_cost_after: avgCost,  // Giá vốn không đổi khi xuất
                cogs_amount: cogsAmount,
                qty_before: oldQty,
                qty_after: newQty,
                from_location: locationCode,
                partner_id: input.partner_id,
                transaction_id: input.transaction_id,
                reason: input.reason || 'Xuất kho',
                notes: input.notes,
                created_by: userId,
            },
            include: {
                product: { select: { id: true, code: true, name: true, unit: true } },
                partner: { select: { id: true, code: true, name: true } },
            },
        });

        // 8. Update product stock_qty
        await tx.product.update({
            where: { id: input.product_id },
            data: { stock_qty: newQty },
        });

        return formatMovement(movement);
    }, { timeout: 10000 });
}

// ==========================================
// STOCK ADJUST (ĐIỀU CHỈNH)
// ==========================================

export async function stockAdjust(
    farmId: string,
    userId: string,
    input: StockAdjustInput
): Promise<StockMovement> {
    return prisma.$transaction(async (tx) => {
        // 1. Lấy tồn kho hiện tại
        const stock = await tx.stock.findFirst({
            where: { farm_id: farmId, product_id: input.product_id },
            include: { product: true },
        });

        if (!stock) {
            throw new Error('Sản phẩm chưa có trong kho. Vui lòng nhập kho trước.');
        }

        const oldQty = Number(stock.quantity);
        const avgCost = Number(stock.avg_cost);
        const newQty = input.new_quantity;
        const variance = roundQuantity(subtract(newQty, oldQty).toNumber());

        if (variance === 0) {
            throw new Error('Số lượng điều chỉnh giống số lượng hiện tại');
        }

        // 2. Xác định loại điều chỉnh
        const isIncrease = variance > 0;
        const type: StockMovementType = isIncrease ? 'ADJUST_IN' : 'ADJUST_OUT';
        const absVariance = Math.abs(variance);

        // 3. Tính giá trị
        const newTotalValue = roundMoney(multiply(newQty, avgCost));

        // 4. Generate code
        const dateStr = new Date().toISOString().split('T')[0];
        const code = await generateMovementCode(tx, farmId, type, dateStr);

        // 5. Update stock
        await tx.stock.update({
            where: { id: stock.id },
            data: {
                quantity: newQty,
                total_value: newTotalValue,
                last_movement_at: new Date(),
            },
        });

        // 6. Create movement
        const movement = await tx.stockMovement.create({
            data: {
                farm_id: farmId,
                type,
                code,
                date: new Date(dateStr),
                product_id: input.product_id,
                quantity: absVariance,
                unit: stock.product.unit,
                unit_price: avgCost,
                avg_cost_before: avgCost,
                avg_cost_after: avgCost,
                cogs_amount: isIncrease ? 0 : roundMoney(multiply(absVariance, avgCost)),
                qty_before: oldQty,
                qty_after: newQty,
                from_location: isIncrease ? null : stock.location_code,
                to_location: isIncrease ? stock.location_code : null,
                reason: input.reason,
                notes: input.notes,
                created_by: userId,
            },
            include: {
                product: { select: { id: true, code: true, name: true, unit: true } },
                partner: { select: { id: true, code: true, name: true } },
            },
        });

        // 7. Update product stock_qty
        await tx.product.update({
            where: { id: input.product_id },
            data: { stock_qty: newQty },
        });

        return formatMovement(movement);
    }, { timeout: 10000 });
}

// ==========================================
// GET SINGLE STOCK BY PRODUCT ID
// ==========================================

export async function getStockByProductId(
    farmId: string,
    productId: string
): Promise<Stock | null> {
    const stock = await prisma.stock.findFirst({
        where: {
            farm_id: farmId,
            product_id: productId,
        },
        include: {
            product: {
                select: { id: true, code: true, name: true, unit: true, category: true },
            },
        },
    });

    if (!stock) return null;
    return formatStock(stock);
}

// ==========================================
// STOCK COUNT (KIỂM KÊ)
// ==========================================

/**
 * Generate stock count code: KK241212001
 */
async function generateStockCountCode(
    tx: any,
    farmId: string,
    date: string
): Promise<string> {
    const dateCode = date.replace(/-/g, '').substring(2);

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const count = await tx.stockCount.count({
        where: {
            farm_id: farmId,
            count_date: {
                gte: startOfDay,
                lte: endOfDay,
            },
        },
    });

    return `KK${dateCode}${String(count + 1).padStart(3, '0')}`;
}

/**
 * Format stock count for API response
 */
function formatStockCount(count: any): StockCount {
    return {
        id: count.id,
        code: count.code,
        count_date: count.count_date.toISOString().split('T')[0],
        status: count.status,
        total_products: count.total_products,
        total_variance: Number(count.total_variance),
        notes: count.notes,
        completed_at: count.completed_at?.toISOString() || null,
        completed_by: count.completed_by,
        created_at: count.created_at.toISOString(),
        items: count.items?.map(formatStockCountItem),
    };
}

/**
 * Format stock count item
 */
function formatStockCountItem(item: any): StockCountItem {
    return {
        id: item.id,
        product_id: item.product_id,
        product: item.product,
        system_qty: Number(item.system_qty),
        counted_qty: Number(item.counted_qty),
        variance_qty: Number(item.variance_qty),
        variance_value: Number(item.variance_value),
        variance_reason: item.variance_reason,
    };
}

/**
 * Get list of stock counts
 */
export async function getStockCounts(
    farmId: string,
    params: { page?: number; limit?: number; status?: string }
): Promise<{ items: StockCount[]; total: number; page: number; limit: number; hasMore: boolean }> {
    const { page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = { farm_id: farmId };
    if (params.status) where.status = params.status;

    const [items, total] = await Promise.all([
        prisma.stockCount.findMany({
            where,
            include: {
                items: {
                    include: {
                        product: { select: { id: true, code: true, name: true, unit: true } },
                    },
                },
            },
            orderBy: { created_at: 'desc' },
            skip,
            take: limit,
        }),
        prisma.stockCount.count({ where }),
    ]);

    return {
        items: items.map(formatStockCount),
        total,
        page,
        limit,
        hasMore: page * limit < total,
    };
}

/**
 * Get single stock count by ID
 */
export async function getStockCountById(
    farmId: string,
    countId: string
): Promise<StockCount | null> {
    const count = await prisma.stockCount.findFirst({
        where: { id: countId, farm_id: farmId },
        include: {
            items: {
                include: {
                    product: { select: { id: true, code: true, name: true, unit: true } },
                },
            },
        },
    });

    if (!count) return null;
    return formatStockCount(count);
}

/**
 * Create new stock count
 */
export async function createStockCount(
    farmId: string,
    userId: string,
    input: CreateStockCountInput
): Promise<StockCount> {
    return prisma.$transaction(async (tx) => {
        // 1. Generate code
        const code = await generateStockCountCode(tx, farmId, input.count_date);

        // 2. Get products to count
        const productWhere: any = { farm_id: farmId, deleted_at: null };
        if (input.product_ids && input.product_ids.length > 0) {
            productWhere.id = { in: input.product_ids };
        }

        const stocks = await tx.stock.findMany({
            where: { farm_id: farmId, product: productWhere },
            include: {
                product: { select: { id: true, code: true, name: true, unit: true } },
            },
        });

        if (stocks.length === 0) {
            throw new Error('Không có sản phẩm nào trong kho để kiểm kê');
        }

        // 3. Create stock count
        const count = await tx.stockCount.create({
            data: {
                farm_id: farmId,
                code,
                count_date: new Date(input.count_date),
                status: 'DRAFT',
                total_products: stocks.length,
                total_variance: 0,
                notes: input.notes,
                created_by: userId,
                items: {
                    create: stocks.map((stock) => ({
                        product_id: stock.product_id,
                        system_qty: stock.quantity,
                        counted_qty: stock.quantity, // Default to system qty
                        variance_qty: 0,
                        variance_value: 0,
                    })),
                },
            },
            include: {
                items: {
                    include: {
                        product: { select: { id: true, code: true, name: true, unit: true } },
                    },
                },
            },
        });

        return formatStockCount(count);
    }, { timeout: 15000 });
}

/**
 * Update stock count item (ghi nhận số lượng thực tế)
 */
export async function updateStockCountItem(
    farmId: string,
    input: UpdateStockCountItemInput
): Promise<StockCountItem> {
    // Get item and verify ownership
    const item = await prisma.stockCountItem.findUnique({
        where: { id: input.item_id },
        include: {
            stock_count: true,
            product: { select: { id: true, code: true, name: true, unit: true } },
        },
    });

    if (!item || item.stock_count.farm_id !== farmId) {
        throw new Error('Không tìm thấy mục kiểm kê');
    }

    if (item.stock_count.status !== 'DRAFT' && item.stock_count.status !== 'IN_PROGRESS') {
        throw new Error('Không thể cập nhật phiếu kiểm kê đã hoàn thành');
    }

    // Get avg cost
    const stock = await prisma.stock.findFirst({
        where: { farm_id: farmId, product_id: item.product_id },
    });
    const avgCost = stock ? Number(stock.avg_cost) : 0;

    // Calculate variance
    const systemQty = Number(item.system_qty);
    const countedQty = input.counted_qty;
    const varianceQty = roundQuantity(countedQty - systemQty);
    const varianceValue = roundMoney(varianceQty * avgCost);

    // Update item
    const updated = await prisma.stockCountItem.update({
        where: { id: input.item_id },
        data: {
            counted_qty: countedQty,
            variance_qty: varianceQty,
            variance_value: varianceValue,
            variance_reason: input.variance_reason,
        },
        include: {
            product: { select: { id: true, code: true, name: true, unit: true } },
        },
    });

    // Update stock count status to IN_PROGRESS if DRAFT
    if (item.stock_count.status === 'DRAFT') {
        await prisma.stockCount.update({
            where: { id: item.stock_count.id },
            data: { status: 'IN_PROGRESS' },
        });
    }

    // Recalculate total variance
    const allItems = await prisma.stockCountItem.findMany({
        where: { stock_count_id: item.stock_count.id },
    });
    const totalVariance = allItems.reduce((sum, i) => sum + Number(i.variance_value), 0);

    await prisma.stockCount.update({
        where: { id: item.stock_count.id },
        data: { total_variance: roundMoney(totalVariance) },
    });

    return formatStockCountItem(updated);
}

/**
 * Complete stock count (hoàn thành kiểm kê)
 */
export async function completeStockCount(
    farmId: string,
    userId: string,
    input: CompleteStockCountInput
): Promise<StockCount> {
    return prisma.$transaction(async (tx) => {
        // 1. Get stock count
        const count = await tx.stockCount.findFirst({
            where: { id: input.stock_count_id, farm_id: farmId },
            include: { items: true },
        });

        if (!count) {
            throw new Error('Không tìm thấy phiếu kiểm kê');
        }

        if (count.status === 'COMPLETED' || count.status === 'CANCELLED') {
            throw new Error('Phiếu kiểm kê đã hoàn thành hoặc đã hủy');
        }

        // 2. Auto adjust stock if requested
        if (input.auto_adjust) {
            for (const item of count.items) {
                const varianceQty = Number(item.variance_qty);
                if (varianceQty !== 0) {
                    // Create adjustment
                    const isIncrease = varianceQty > 0;
                    const type: StockMovementType = isIncrease ? 'ADJUST_IN' : 'ADJUST_OUT';
                    const absVariance = Math.abs(varianceQty);

                    const stock = await tx.stock.findFirst({
                        where: { farm_id: farmId, product_id: item.product_id },
                        include: { product: true },
                    });

                    if (stock) {
                        const avgCost = Number(stock.avg_cost);
                        const newQty = roundQuantity(Number(stock.quantity) + varianceQty);
                        const newTotalValue = roundMoney(newQty * avgCost);

                        // Update stock
                        await tx.stock.update({
                            where: { id: stock.id },
                            data: {
                                quantity: newQty,
                                total_value: newTotalValue,
                                last_movement_at: new Date(),
                            },
                        });

                        // Create movement
                        const code = await generateMovementCode(tx, farmId, type, count.count_date.toISOString().split('T')[0]);

                        await tx.stockMovement.create({
                            data: {
                                farm_id: farmId,
                                type,
                                code,
                                date: count.count_date,
                                product_id: item.product_id,
                                quantity: absVariance,
                                unit: stock.product.unit,
                                unit_price: avgCost,
                                avg_cost_before: avgCost,
                                avg_cost_after: avgCost,
                                cogs_amount: isIncrease ? 0 : roundMoney(absVariance * avgCost),
                                qty_before: Number(stock.quantity),
                                qty_after: newQty,
                                from_location: isIncrease ? null : stock.location_code,
                                to_location: isIncrease ? stock.location_code : null,
                                reason: `Kiểm kê: ${count.code}`,
                                notes: item.variance_reason || 'Điều chỉnh từ kiểm kê',
                                created_by: userId,
                            },
                        });

                        // Update product stock_qty
                        await tx.product.update({
                            where: { id: item.product_id },
                            data: { stock_qty: newQty },
                        });
                    }
                }
            }
        }

        // 3. Mark as completed
        const completed = await tx.stockCount.update({
            where: { id: count.id },
            data: {
                status: 'COMPLETED',
                completed_at: new Date(),
                completed_by: userId,
            },
            include: {
                items: {
                    include: {
                        product: { select: { id: true, code: true, name: true, unit: true } },
                    },
                },
            },
        });

        return formatStockCount(completed);
    }, { timeout: 30000 });
}

/**
 * Cancel stock count
 */
export async function cancelStockCount(
    farmId: string,
    countId: string
): Promise<void> {
    const count = await prisma.stockCount.findFirst({
        where: { id: countId, farm_id: farmId },
    });

    if (!count) {
        throw new Error('Không tìm thấy phiếu kiểm kê');
    }

    if (count.status === 'COMPLETED') {
        throw new Error('Không thể hủy phiếu kiểm kê đã hoàn thành');
    }

    await prisma.stockCount.update({
        where: { id: countId },
        data: { status: 'CANCELLED' },
    });
}

