// src/lib/prisma.ts
// Prisma Client với Extension cho Multi-tenancy và Decimal serialization

import { PrismaClient, Prisma } from '@prisma/client';
import { getCurrentFarmIdOrNull } from './context';

// ==========================================
// PRISMA CLIENT SINGLETON
// ==========================================

const globalForPrisma = globalThis as unknown as {
    prismaBase: PrismaClient | undefined;
};

// Base Prisma Client (chưa có extension)
// Export để dùng trong các trường hợp đặc biệt (VD: auth - không cần filter farm_id)
export const prismaBase =
    globalForPrisma.prismaBase ??
    new PrismaClient({
        log:
            process.env.NODE_ENV === 'development'
                ? ['query', 'error', 'warn']
                : ['error'],
    });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prismaBase = prismaBase;
}

// ==========================================
// TENANT MODELS CONFIG
// ==========================================

/**
 * Danh sách các model có trường farm_id (cần filter multi-tenant)
 * Các model này sẽ tự động được filter theo farm_id từ context
 */
const TENANT_MODELS = [
    'partner',
    'product',
    'transaction',
    'transactionItem',
    'worker',
    'workLog',
    'invoice',
    'payable',
    'taxRule',
    'auditLog',
] as const;

type TenantModel = (typeof TENANT_MODELS)[number];

/**
 * Kiểm tra model có phải là tenant model không
 */
function isTenantModel(model: string): model is TenantModel {
    return TENANT_MODELS.includes(model.toLowerCase() as TenantModel);
}

// ==========================================
// DECIMAL CONVERSION
// ==========================================

/**
 * Chuyển đổi Prisma Decimal sang number để serialize JSON
 * Prisma trả về Decimal object, Next.js Server Component không serialize được
 * 
 * @param obj - Object cần convert
 * @returns Object với Decimal đã được convert sang number
 */
function convertDecimalToNumber(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
        return obj;
    }

    // Nếu là Decimal, convert sang number
    if (
        obj instanceof Prisma.Decimal ||
        (typeof obj === 'object' && obj !== null && 'toNumber' in obj && typeof (obj as { toNumber: unknown }).toNumber === 'function')
    ) {
        return (obj as Prisma.Decimal).toNumber();
    }

    // Nếu là Date, giữ nguyên
    if (obj instanceof Date) {
        return obj;
    }

    // Nếu là Array, convert từng phần tử
    if (Array.isArray(obj)) {
        return obj.map(convertDecimalToNumber);
    }

    // Nếu là Object, convert từng property
    if (typeof obj === 'object') {
        const converted: Record<string, unknown> = {};
        for (const key in obj) {
            converted[key] = convertDecimalToNumber((obj as Record<string, unknown>)[key]);
        }
        return converted;
    }

    return obj;
}

// ==========================================
// PRISMA EXTENSION
// ==========================================

/**
 * Prisma Extension với các tính năng:
 * 1. Auto-inject farm_id vào WHERE clause (Multi-tenancy)
 * 2. Auto-convert Decimal sang number cho JSON serialization
 */
const prisma = prismaBase.$extends({
    name: 'laba-extension',

    query: {
        // Áp dụng cho tất cả models
        $allModels: {
            // ==========================================
            // FIND MANY - Tự động filter theo farm_id
            // ==========================================
            async findMany({ model, args, query }) {
                const farmId = getCurrentFarmIdOrNull();

                // Nếu có farm_id và model cần filter
                if (farmId && isTenantModel(model)) {
                    args.where = {
                        ...args.where,
                        farm_id: farmId,
                    };
                }

                const result = await query(args);
                return convertDecimalToNumber(result);
            },

            // ==========================================
            // FIND FIRST - Tự động filter theo farm_id
            // ==========================================
            async findFirst({ model, args, query }) {
                const farmId = getCurrentFarmIdOrNull();

                if (farmId && isTenantModel(model)) {
                    args.where = {
                        ...args.where,
                        farm_id: farmId,
                    };
                }

                const result = await query(args);
                return convertDecimalToNumber(result);
            },

            // ==========================================
            // FIND UNIQUE - Không filter (đã có unique key)
            // Nhưng vẫn convert Decimal
            // ==========================================
            async findUnique({ args, query }) {
                const result = await query(args);
                return convertDecimalToNumber(result);
            },

            // ==========================================
            // CREATE - Tự động thêm farm_id
            // ==========================================
            async create({ model, args, query }) {
                const farmId = getCurrentFarmIdOrNull();

                if (farmId && isTenantModel(model)) {
                    (args.data as Record<string, unknown>).farm_id = farmId;
                }

                const result = await query(args);
                return convertDecimalToNumber(result);
            },

            // ==========================================
            // CREATE MANY - Tự động thêm farm_id cho tất cả records
            // ==========================================
            async createMany({ model, args, query }) {
                const farmId = getCurrentFarmIdOrNull();

                if (farmId && isTenantModel(model) && Array.isArray(args.data)) {
                    args.data = args.data.map((item: Record<string, unknown>) => ({
                        ...item,
                        farm_id: farmId,
                    }));
                }

                return query(args);
            },

            // ==========================================
            // UPDATE - Vẫn convert Decimal
            // Lưu ý: update() dùng unique key nên không thêm farm_id vào where
            // ==========================================
            async update({ args, query }) {
                const result = await query(args);
                return convertDecimalToNumber(result);
            },

            // ==========================================
            // UPDATE MANY - Filter theo farm_id
            // ==========================================
            async updateMany({ model, args, query }) {
                const farmId = getCurrentFarmIdOrNull();

                if (farmId && isTenantModel(model)) {
                    args.where = {
                        ...args.where,
                        farm_id: farmId,
                    };
                }

                return query(args);
            },

            // ==========================================
            // DELETE - Vẫn cho phép, nhưng cần verify farm_id trước
            // ==========================================
            async delete({ args, query }) {
                const result = await query(args);
                return convertDecimalToNumber(result);
            },

            // ==========================================
            // DELETE MANY - Filter theo farm_id
            // ==========================================
            async deleteMany({ model, args, query }) {
                const farmId = getCurrentFarmIdOrNull();

                if (farmId && isTenantModel(model)) {
                    args.where = {
                        ...args.where,
                        farm_id: farmId,
                    };
                }

                return query(args);
            },

            // ==========================================
            // COUNT - Filter theo farm_id
            // ==========================================
            async count({ model, args, query }) {
                const farmId = getCurrentFarmIdOrNull();

                if (farmId && isTenantModel(model)) {
                    args.where = {
                        ...args.where,
                        farm_id: farmId,
                    };
                }

                return query(args);
            },

            // ==========================================
            // AGGREGATE - Filter theo farm_id + convert Decimal
            // ==========================================
            async aggregate({ model, args, query }) {
                const farmId = getCurrentFarmIdOrNull();

                if (farmId && isTenantModel(model)) {
                    args.where = {
                        ...args.where,
                        farm_id: farmId,
                    };
                }

                const result = await query(args);
                return convertDecimalToNumber(result);
            },

            // ==========================================
            // GROUP BY - Filter theo farm_id + convert Decimal
            // ==========================================
            async groupBy({ model, args, query }) {
                const farmId = getCurrentFarmIdOrNull();

                if (farmId && isTenantModel(model)) {
                    args.where = {
                        ...args.where,
                        farm_id: farmId,
                    };
                }

                const result = await query(args);
                return convertDecimalToNumber(result);
            },
        },
    },
});

// ==========================================
// EXPORTS
// ==========================================

export { prisma };
export default prisma;

// Type cho extended prisma client
export type ExtendedPrismaClient = typeof prisma;
