// src/lib/context.ts
// Request Context sử dụng AsyncLocalStorage
// Cho phép truyền data (farm_id, user_id) xuyên suốt một request
// Prisma Extension sẽ đọc context này để tự động filter theo farm_id

import { AsyncLocalStorage } from 'async_hooks';

// ==========================================
// TYPES
// ==========================================

/**
 * Context data được lưu trữ cho mỗi request
 */
export interface RequestContext {
    farmId: string | null;    // ID của farm hiện tại
    userId: string | null;    // ID của user đang đăng nhập
    userEmail: string | null; // Email của user
    ipAddress: string | null; // IP address (cho audit log)
    userAgent: string | null; // Browser info (cho audit log)
}

// ==========================================
// ASYNC LOCAL STORAGE INSTANCE
// ==========================================

/**
 * AsyncLocalStorage là một API của Node.js cho phép lưu trữ data theo "context" 
 * của mỗi request. Giống như "thread-local storage" trong Java, nhưng cho async code.
 * 
 * Request 1 (farm_id: "abc")     Request 2 (farm_id: "xyz")
 *         │                              │
 *         ▼                              ▼
 *    ┌─────────┐                    ┌─────────┐
 *    │ Context │                    │ Context │
 *    │ farm_id │                    │ farm_id │
 *    │  "abc"  │                    │  "xyz"  │
 *    └─────────┘                    └─────────┘
 *         │                              │
 *         ▼                              ▼
 *    Prisma Query                   Prisma Query
 *    WHERE farm_id = "abc"          WHERE farm_id = "xyz"
 */
const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

// ==========================================
// MAIN FUNCTIONS
// ==========================================

/**
 * Chạy một function trong context cụ thể
 * Tất cả code chạy trong callback sẽ có access vào context này
 * 
 * @example
 * // Trong API route:
 * return runWithContext(
 *   { farmId: user.farm_id, userId: user.id, ... },
 *   async () => {
 *     // Tất cả Prisma queries trong đây sẽ tự động filter theo farm_id
 *     const products = await prisma.product.findMany();
 *     // Prisma Extension đã thêm: WHERE farm_id = user.farm_id
 *   }
 * );
 */
export function runWithContext<T>(
    context: RequestContext,
    fn: () => T | Promise<T>
): T | Promise<T> {
    return asyncLocalStorage.run(context, fn);
}

/**
 * Lấy context hiện tại
 * Trả về undefined nếu không có context (chưa gọi runWithContext)
 */
export function getContext(): RequestContext | undefined {
    return asyncLocalStorage.getStore();
}

// ==========================================
// GETTER HELPERS
// ==========================================

/**
 * Lấy farm_id từ context hiện tại
 * Throw error nếu không có farm_id (để catch bug sớm)
 * 
 * @throws Error nếu không có farm_id trong context
 */
export function getCurrentFarmId(): string {
    const context = getContext();
    if (!context?.farmId) {
        throw new Error(
            'farm_id không tồn tại trong context. ' +
            'Đảm bảo API route được wrap trong runWithContext hoặc withAuth.'
        );
    }
    return context.farmId;
}

/**
 * Lấy farm_id hoặc null (không throw error)
 * Dùng cho các trường hợp farm_id là optional
 */
export function getCurrentFarmIdOrNull(): string | null {
    return getContext()?.farmId ?? null;
}

/**
 * Lấy user_id từ context hiện tại
 */
export function getCurrentUserId(): string | null {
    return getContext()?.userId ?? null;
}

/**
 * Lấy user email từ context hiện tại
 */
export function getCurrentUserEmail(): string | null {
    return getContext()?.userEmail ?? null;
}

/**
 * Lấy thông tin cho Audit Log
 */
export function getAuditInfo(): {
    userId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
} {
    const context = getContext();
    return {
        userId: context?.userId ?? null,
        ipAddress: context?.ipAddress ?? null,
        userAgent: context?.userAgent ?? null,
    };
}

/**
 * Kiểm tra xem có context hay không
 */
export function hasContext(): boolean {
    return getContext() !== undefined;
}
