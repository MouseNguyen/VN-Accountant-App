// src/lib/api-utils.ts
// Utilities for API responses

import { Decimal } from '@prisma/client/runtime/library';

/**
 * Recursively convert Prisma Decimal objects to numbers in an object
 * This should be called before returning data from API endpoints
 */
export function serializeDecimals<T>(data: T): T {
    if (data === null || data === undefined) {
        return data;
    }

    // Handle Decimal type
    if (data instanceof Decimal) {
        return data.toNumber() as unknown as T;
    }

    // Handle arrays
    if (Array.isArray(data)) {
        return data.map(item => serializeDecimals(item)) as unknown as T;
    }

    // Handle dates
    if (data instanceof Date) {
        return data as unknown as T;
    }

    // Handle objects
    if (typeof data === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
            result[key] = serializeDecimals(value);
        }
        return result as unknown as T;
    }

    return data;
}

/**
 * Create a JSON response with serialized decimals
 */
export function jsonResponse<T>(data: T, status: number = 200): Response {
    return Response.json(serializeDecimals(data), { status });
}
