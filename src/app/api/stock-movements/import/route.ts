// src/app/api/stock-movements/import/route.ts
// API: POST /api/stock-movements/import - Nhập kho hàng loạt từ Excel

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth';
import { stockImportSchema } from '@/lib/validations/inventory';
import { prisma } from '@/lib/prisma';
import { serializeDecimals } from '@/lib/api-utils';
import {
    roundMoney,
    roundQuantity,
    calculateMovingAverageCost
} from '@/lib/decimal';

interface ImportResult {
    success: boolean;
    product_code: string;
    product_name?: string;
    quantity: number;
    unit_price?: number;
    message?: string;
}

export const POST = withAuth(async (req: NextRequest, context: { params: Promise<Record<string, string>> }, user: AuthUser) => {
    try {
        const body = await req.json();

        // Validate input
        const input = stockImportSchema.parse(body);

        const results: ImportResult[] = [];
        const movements: string[] = [];

        await prisma.$transaction(async (tx) => {
            // Process each item
            for (const item of input.items) {
                try {
                    // Find product by code
                    const product = await tx.product.findFirst({
                        where: {
                            farm_id: user.farm_id,
                            code: item.product_code,
                            deleted_at: null
                        },
                    });

                    if (!product) {
                        results.push({
                            success: false,
                            product_code: item.product_code,
                            quantity: item.quantity,
                            message: 'Không tìm thấy sản phẩm',
                        });
                        continue;
                    }

                    // Get current stock
                    const stock = await tx.stock.findFirst({
                        where: { farm_id: user.farm_id, product_id: product.id },
                    });

                    const oldQty = stock ? Number(stock.quantity) : 0;
                    const oldAvgCost = stock ? Number(stock.avg_cost) : 0;
                    const unitPrice = item.unit_price || oldAvgCost;

                    let newQty: number;
                    let newAvgCost: number;
                    let cogsAmount = 0;
                    const movementType = input.type === 'IN' ? 'IN' : 'OUT';

                    if (input.type === 'IN') {
                        // Stock In
                        newAvgCost = calculateMovingAverageCost(oldQty, oldAvgCost, item.quantity, unitPrice);
                        newQty = roundQuantity(oldQty + item.quantity);
                    } else {
                        // Stock Out
                        if (item.quantity > oldQty) {
                            results.push({
                                success: false,
                                product_code: item.product_code,
                                product_name: product.name,
                                quantity: item.quantity,
                                message: `Không đủ tồn kho (có ${oldQty})`,
                            });
                            continue;
                        }
                        newAvgCost = oldAvgCost;
                        newQty = roundQuantity(oldQty - item.quantity);
                        cogsAmount = roundMoney(item.quantity * oldAvgCost);
                    }

                    const newTotalValue = roundMoney(newQty * newAvgCost);

                    // Generate code
                    const prefix = input.type === 'IN' ? 'PNK' : 'PXK';
                    const dateCode = input.date.replace(/-/g, '').substring(2);
                    const count = await tx.stockMovement.count({
                        where: {
                            farm_id: user.farm_id,
                            type: movementType as any,
                            date: new Date(input.date),
                        },
                    });
                    const code = `${prefix}${dateCode}${String(count + 1 + results.length).padStart(3, '0')}`;

                    // Upsert stock
                    if (stock) {
                        await tx.stock.update({
                            where: { id: stock.id },
                            data: {
                                quantity: newQty,
                                avg_cost: newAvgCost,
                                total_value: newTotalValue,
                                last_movement_at: new Date(),
                            },
                        });
                    } else if (input.type === 'IN') {
                        await tx.stock.create({
                            data: {
                                farm_id: user.farm_id,
                                product_id: product.id,
                                location_code: 'DEFAULT',
                                quantity: newQty,
                                avg_cost: newAvgCost,
                                total_value: newTotalValue,
                                last_movement_at: new Date(),
                            },
                        });
                    }

                    // Create movement
                    const movement = await tx.stockMovement.create({
                        data: {
                            farm_id: user.farm_id,
                            type: movementType as any,
                            code,
                            date: new Date(input.date),
                            product_id: product.id,
                            quantity: item.quantity,
                            unit: product.unit,
                            unit_price: unitPrice,
                            avg_cost_before: oldAvgCost,
                            avg_cost_after: newAvgCost,
                            cogs_amount: cogsAmount,
                            qty_before: oldQty,
                            qty_after: newQty,
                            from_location: input.type === 'OUT' ? 'DEFAULT' : null,
                            to_location: input.type === 'IN' ? 'DEFAULT' : null,
                            partner_id: input.partner_id,
                            reason: `Import Excel - ${input.type === 'IN' ? 'Nhập kho' : 'Xuất kho'}`,
                            notes: input.notes,
                            created_by: user.id,
                        },
                    });

                    // Update product stock_qty (for legacy compatibility)
                    await tx.product.update({
                        where: { id: product.id },
                        data: {
                            stock_qty: newQty,
                        },
                    });

                    movements.push(movement.id);

                    results.push({
                        success: true,
                        product_code: item.product_code,
                        product_name: product.name,
                        quantity: item.quantity,
                        unit_price: unitPrice,
                    });

                } catch (itemError) {
                    results.push({
                        success: false,
                        product_code: item.product_code,
                        quantity: item.quantity,
                        message: (itemError as Error).message,
                    });
                }
            }
        }, { timeout: 60000 });

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        return NextResponse.json({
            success: true,
            data: {
                results,
                summary: {
                    total: input.items.length,
                    success: successCount,
                    failed: failCount,
                    movement_ids: movements,
                },
            },
            message: `Đã xử lý ${successCount}/${input.items.length} sản phẩm`,
        });
    } catch (error) {
        console.error('POST /api/stock-movements/import error:', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message } },
            { status: 400 }
        );
    }
});
