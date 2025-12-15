// src/services/stock-alerts.service.ts
// Stock Alerts Service - Cảnh báo Kho

import prisma from '@/lib/prisma';
import { roundQuantity } from '@/lib/decimal';
import type {
    StockAlert,
    StockAlertType,
    AlertSeverity,
    StockAlertListParams,
    StockAlertListResponse,
} from '@/types/stock-reports';

// ==========================================
// GET STOCK ALERTS
// ==========================================

export async function getStockAlerts(
    farmId: string,
    params: StockAlertListParams = {}
): Promise<StockAlertListResponse> {
    const alerts: StockAlert[] = [];
    const now = new Date();

    // 1. LOW STOCK Alerts (tồn thấp < min_quantity nhưng > 0)
    const lowStockProducts = await prisma.$queryRaw<Array<{
        id: string;
        code: string;
        name: string;
        quantity: string | number;
        min_quantity: string | number;
    }>>`
    SELECT 
      p.id,
      p.code,
      p.name,
      COALESCE(s.quantity, 0) as quantity,
      COALESCE(s.min_quantity, p.min_stock) as min_quantity
    FROM products p
    LEFT JOIN stocks s ON p.id = s.product_id AND s.farm_id = ${farmId}
    WHERE p.farm_id = ${farmId}
      AND p.deleted_at IS NULL
      AND COALESCE(s.min_quantity, p.min_stock) IS NOT NULL
      AND COALESCE(s.min_quantity, p.min_stock) > 0
      AND COALESCE(s.quantity, 0) <= COALESCE(s.min_quantity, p.min_stock)
      AND COALESCE(s.quantity, 0) > 0
  `;

    for (const product of lowStockProducts) {
        const qty = roundQuantity(Number(product.quantity));
        const minQty = roundQuantity(Number(product.min_quantity));

        alerts.push({
            id: `low-${product.id}`,
            type: 'LOW_STOCK',
            severity: 'warning',
            product_id: product.id,
            product_code: product.code,
            product_name: product.name,
            current_qty: qty,
            threshold_qty: minQty,
            title: 'Tồn kho thấp',
            message: `${product.name}: còn ${qty} (tối thiểu ${minQty})`,
            created_at: now.toISOString(),
        });
    }

    // 2. OUT OF STOCK Alerts (hết hàng)
    const outOfStockProducts = await prisma.$queryRaw<Array<{
        id: string;
        code: string;
        name: string;
    }>>`
    SELECT 
      p.id,
      p.code,
      p.name
    FROM products p
    LEFT JOIN stocks s ON p.id = s.product_id AND s.farm_id = ${farmId}
    WHERE p.farm_id = ${farmId}
      AND p.deleted_at IS NULL
      AND p.is_active = true
      AND COALESCE(s.min_quantity, p.min_stock) IS NOT NULL
      AND COALESCE(s.min_quantity, p.min_stock) > 0
      AND COALESCE(s.quantity, 0) <= 0
  `;

    for (const product of outOfStockProducts) {
        alerts.push({
            id: `out-${product.id}`,
            type: 'OUT_OF_STOCK',
            severity: 'error',
            product_id: product.id,
            product_code: product.code,
            product_name: product.name,
            current_qty: 0,
            threshold_qty: 0,
            title: 'Hết hàng',
            message: `${product.name}: đã hết hàng`,
            created_at: now.toISOString(),
        });
    }

    // 3. OVER STOCK Alerts (tồn quá mức)
    const overStockProducts = await prisma.$queryRaw<Array<{
        id: string;
        code: string;
        name: string;
        quantity: string | number;
        max_quantity: string | number;
    }>>`
    SELECT 
      p.id,
      p.code,
      p.name,
      s.quantity,
      s.max_quantity
    FROM stocks s
    JOIN products p ON s.product_id = p.id
    WHERE s.farm_id = ${farmId}
      AND p.deleted_at IS NULL
      AND s.max_quantity IS NOT NULL
      AND s.max_quantity > 0
      AND s.quantity > s.max_quantity
  `;

    for (const product of overStockProducts) {
        const qty = roundQuantity(Number(product.quantity));
        const maxQty = roundQuantity(Number(product.max_quantity));

        alerts.push({
            id: `over-${product.id}`,
            type: 'OVER_STOCK',
            severity: 'info',
            product_id: product.id,
            product_code: product.code,
            product_name: product.name,
            current_qty: qty,
            threshold_qty: maxQty,
            title: 'Tồn quá mức',
            message: `${product.name}: ${qty} (tối đa ${maxQty})`,
            created_at: now.toISOString(),
        });
    }

    // 4. SLOW MOVING Alerts (>60 ngày không có movement)
    const slowMovingProducts = await prisma.$queryRaw<Array<{
        id: string;
        code: string;
        name: string;
        quantity: string | number;
        days_inactive: number;
    }>>`
    SELECT 
      p.id,
      p.code,
      p.name,
      s.quantity,
      EXTRACT(DAY FROM NOW() - s.last_movement_at)::int as days_inactive
    FROM stocks s
    JOIN products p ON s.product_id = p.id
    WHERE s.farm_id = ${farmId}
      AND p.deleted_at IS NULL
      AND s.quantity > 0
      AND s.last_movement_at IS NOT NULL
      AND s.last_movement_at < NOW() - INTERVAL '60 days'
  `;

    for (const product of slowMovingProducts) {
        const qty = roundQuantity(Number(product.quantity));
        const isDeadStock = product.days_inactive > 90;

        alerts.push({
            id: `slow-${product.id}`,
            type: 'SLOW_MOVING',
            severity: isDeadStock ? 'warning' : 'info',
            product_id: product.id,
            product_code: product.code,
            product_name: product.name,
            current_qty: qty,
            threshold_qty: 60,
            title: isDeadStock ? 'Hàng chết' : 'Hàng chậm luân chuyển',
            message: `${product.name}: ${product.days_inactive} ngày không giao dịch`,
            created_at: now.toISOString(),
        });
    }

    // Filter by type if specified
    let filteredAlerts = alerts;
    if (params.type) {
        filteredAlerts = filteredAlerts.filter((a) => a.type === params.type);
    }
    if (params.severity) {
        filteredAlerts = filteredAlerts.filter((a) => a.severity === params.severity);
    }

    // Sort by severity (error first, then warning, then info)
    const severityOrder: Record<AlertSeverity, number> = { error: 0, warning: 1, info: 2 };
    filteredAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return {
        items: filteredAlerts,
        counts: {
            total: alerts.length,
            low_stock: alerts.filter((a) => a.type === 'LOW_STOCK').length,
            out_of_stock: alerts.filter((a) => a.type === 'OUT_OF_STOCK').length,
            over_stock: alerts.filter((a) => a.type === 'OVER_STOCK').length,
            slow_moving: alerts.filter((a) => a.type === 'SLOW_MOVING').length,
        },
    };
}

// ==========================================
// GET ALERT COUNTS (for dashboard badge)
// ==========================================

export async function getStockAlertCounts(farmId: string): Promise<{
    total: number;
    critical: number;
}> {
    const result = await getStockAlerts(farmId);
    return {
        total: result.counts.total,
        critical: result.counts.out_of_stock + result.items.filter(a => a.severity === 'error').length,
    };
}
