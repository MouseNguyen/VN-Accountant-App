// src/lib/stock-movement.ts
// Shared stock movement logic - single source of truth for delta calculations
// This module should be used by all services, pages, and scripts that work with stock movements

import type { StockMovementType } from '@prisma/client';

/**
 * Stock movement labels (Vietnamese)
 * Using `satisfies` ensures TypeScript catches missing enum members
 */
export const MOVEMENT_LABEL = {
    IN: 'Nhập kho',
    OUT: 'Xuất kho',
    ADJUST_IN: 'Điều chỉnh tăng',
    ADJUST_OUT: 'Điều chỉnh giảm',
    TRANSFER: 'Chuyển kho',
    RETURN: 'Trả hàng',
} satisfies Record<StockMovementType, string>;

/**
 * Assert exhaustive switch - TypeScript will error if a case is missing
 */
export function assertNever(x: never): never {
    throw new Error(`Unhandled stock movement type: ${x}`);
}

/**
 * Check if movement type increases stock
 */
export function isInboundMovement(type: StockMovementType): boolean {
    switch (type) {
        case 'IN':
        case 'ADJUST_IN':
        case 'RETURN':
            return true;
        case 'OUT':
        case 'ADJUST_OUT':
        case 'TRANSFER':
            return false;
        default:
            return assertNever(type);
    }
}

/**
 * Check if movement type decreases stock
 */
export function isOutboundMovement(type: StockMovementType): boolean {
    switch (type) {
        case 'OUT':
        case 'ADJUST_OUT':
            return true;
        case 'IN':
        case 'ADJUST_IN':
        case 'RETURN':
        case 'TRANSFER':
            return false;
        default:
            return assertNever(type);
    }
}

/**
 * Movement data structure for delta calculation
 */
export interface MovementForDelta {
    type: StockMovementType | string;
    quantity: number | string | { toNumber?: () => number };
    from_location?: string | null;
    to_location?: string | null;
}

/**
 * Calculate stock delta for a movement at a specific location
 * This is the SINGLE SOURCE OF TRUTH for stock calculations
 * 
 * @param movement - The stock movement record
 * @param location - The stock location code (optional, for location-aware calculation)
 * @returns The quantity change (+ve for increase, -ve for decrease)
 */
export function getMovementDelta(movement: MovementForDelta, location?: string): number {
    const qty = typeof movement.quantity === 'object' && movement.quantity?.toNumber
        ? movement.quantity.toNumber()
        : Number(movement.quantity);

    const type = movement.type as StockMovementType;

    switch (type) {
        case 'IN':
        case 'ADJUST_IN':
            // Inbound: positive delta
            // If location specified, only count if movement is TO this location
            if (location && movement.to_location && movement.to_location !== location) {
                return 0;
            }
            return +qty;

        case 'OUT':
        case 'ADJUST_OUT':
            // Outbound: negative delta
            // If location specified, only count if movement is FROM this location
            if (location && movement.from_location && movement.from_location !== location) {
                return 0;
            }
            return -qty;

        case 'TRANSFER':
            // Transfer: affects both source and destination locations
            if (!location) {
                // Without location context, transfers net to zero
                return 0;
            }
            let delta = 0;
            if (movement.from_location === location) delta -= qty;
            if (movement.to_location === location) delta += qty;
            return delta;

        case 'RETURN':
            // Return: treat as inbound (customer returns goods)
            // Adjust this based on business logic if needed
            if (location && movement.to_location && movement.to_location !== location) {
                return 0;
            }
            return +qty;

        default:
            // Unknown type - log warning and return 0
            console.warn(`Unknown stock movement type: ${type}`);
            return 0;
    }
}

/**
 * Get CSS color class for movement badge
 */
export function getMovementColor(type: StockMovementType): string {
    switch (type) {
        case 'IN':
        case 'ADJUST_IN':
        case 'RETURN':
            return 'bg-green-500/10 text-green-600 border-green-500/20';
        case 'OUT':
        case 'ADJUST_OUT':
            return 'bg-red-500/10 text-red-600 border-red-500/20';
        case 'TRANSFER':
            return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
        default:
            return 'bg-muted text-muted-foreground';
    }
}

/**
 * Get icon name for movement type
 */
export function getMovementIcon(type: StockMovementType): 'plus' | 'minus' | 'arrow-right-left' {
    switch (type) {
        case 'IN':
        case 'ADJUST_IN':
        case 'RETURN':
            return 'plus';
        case 'OUT':
        case 'ADJUST_OUT':
            return 'minus';
        case 'TRANSFER':
            return 'arrow-right-left';
        default:
            return 'minus';
    }
}

/**
 * Valid stock movement types (for validation)
 */
export const VALID_MOVEMENT_TYPES: StockMovementType[] = [
    'IN',
    'OUT',
    'ADJUST_IN',
    'ADJUST_OUT',
    'TRANSFER',
    'RETURN',
];

/**
 * Check if a string is a valid movement type
 */
export function isValidMovementType(type: string): type is StockMovementType {
    return VALID_MOVEMENT_TYPES.includes(type as StockMovementType);
}
