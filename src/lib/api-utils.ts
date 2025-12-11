// src/lib/api-utils.ts
// API Response utilities - Helpers cho việc tạo response chuẩn

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
    AppError,
    ValidationError,
    NotFoundError,
    ConflictError,
    buildErrorResponse,
} from './errors';

// ==========================================
// SUCCESS RESPONSE TYPES
// ==========================================

/**
 * Cấu trúc response thành công
 */
export interface SuccessResponse<T = unknown> {
    success: true;
    data: T;
    message?: string;
    pagination?: PaginationMeta;
}

/**
 * Metadata cho pagination
 */
export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

// ==========================================
// SUCCESS RESPONSE BUILDER
// ==========================================

/**
 * Tạo success response
 * 
 * @example
 * // Response đơn giản
 * return successResponse(product);
 * 
 * // Response với message
 * return successResponse(product, { message: 'Tạo sản phẩm thành công!' });
 * 
 * // Response với status 201
 * return successResponse(product, { status: 201 });
 * 
 * // Response với pagination
 * return successResponse(products, {
 *   pagination: { page: 1, limit: 20, total: 100, totalPages: 5 }
 * });
 */
export function successResponse<T>(
    data: T,
    options?: {
        message?: string;
        status?: number;
        pagination?: PaginationMeta;
    }
): NextResponse<SuccessResponse<T>> {
    const response: SuccessResponse<T> = {
        success: true,
        data,
    };

    if (options?.message) response.message = options.message;
    if (options?.pagination) response.pagination = options.pagination;

    return NextResponse.json(response, { status: options?.status || 200 });
}

// ==========================================
// ERROR RESPONSE BUILDER
// ==========================================

/**
 * Tạo error response từ Error object
 * Tự động xử lý:
 * - ZodError → ValidationError (400)
 * - Prisma errors → Các error phù hợp
 * - AppError → Giữ nguyên status code
 * - Unknown error → 500
 * 
 * @example
 * try {
 *   // ... some code
 * } catch (error) {
 *   return errorResponse(error);
 * }
 */
export function errorResponse(error: Error | AppError | ZodError | unknown): NextResponse {
    // ==========================================
    // XỬ LÝ ZOD VALIDATION ERROR
    // ==========================================
    if (error instanceof ZodError) {
        const fieldErrors = error.flatten().fieldErrors as Record<string, string[] | undefined>;
        const formattedDetails: Record<string, string> = {};

        // Flatten field errors thành readable messages
        for (const [field, messages] of Object.entries(fieldErrors)) {
            if (messages && messages.length > 0) {
                formattedDetails[field] = messages[0];
            }
        }

        const validationError = new ValidationError('Dữ liệu không hợp lệ', formattedDetails);
        return NextResponse.json(buildErrorResponse(validationError), { status: 400 });
    }

    // ==========================================
    // XỬ LÝ PRISMA ERRORS
    // ==========================================
    if (error && typeof error === 'object' && 'code' in error) {
        const prismaError = error as { code: string; meta?: { target?: string[] } };

        // Unique constraint violation (duplicate)
        if (prismaError.code === 'P2002') {
            const field = prismaError.meta?.target?.[0] || 'Dữ liệu';
            const conflictError = new ConflictError(`${field} đã tồn tại`);
            return NextResponse.json(buildErrorResponse(conflictError), { status: 409 });
        }

        // Record not found
        if (prismaError.code === 'P2025') {
            const notFoundError = new NotFoundError('Dữ liệu');
            return NextResponse.json(buildErrorResponse(notFoundError), { status: 404 });
        }

        // Foreign key constraint failed
        if (prismaError.code === 'P2003') {
            const validationError = new ValidationError('Dữ liệu liên kết không hợp lệ');
            return NextResponse.json(buildErrorResponse(validationError), { status: 400 });
        }
    }

    // ==========================================
    // XỬ LÝ APP ERROR
    // ==========================================
    if (error instanceof AppError) {
        return NextResponse.json(buildErrorResponse(error), { status: error.statusCode });
    }

    // ==========================================
    // UNKNOWN ERROR - LOG VÀ TRẢ VỀ 500
    // ==========================================
    console.error('Unhandled error:', error);
    return NextResponse.json(
        {
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Có lỗi xảy ra, vui lòng thử lại sau',
            },
        },
        { status: 500 }
    );
}

// ==========================================
// API HANDLER WRAPPER
// ==========================================

type ApiHandler = (request: Request, context?: unknown) => Promise<NextResponse>;

/**
 * Wrapper tự động bắt lỗi cho API routes
 * Không cần try-catch trong handler nữa
 * 
 * @example
 * export const GET = apiHandler(async (request) => {
 *   const data = await someAsyncOperation();
 *   return successResponse(data);
 *   // Nếu throw error, sẽ tự động được catch và trả về error response
 * });
 */
export function apiHandler(handler: ApiHandler): ApiHandler {
    return async (request: Request, context?: unknown) => {
        try {
            return await handler(request, context);
        } catch (error) {
            return errorResponse(error);
        }
    };
}

// ==========================================
// PAGINATION HELPERS
// ==========================================

/**
 * Parse pagination params từ URL
 */
export function parsePaginationParams(
    searchParams: URLSearchParams,
    defaults?: { page?: number; limit?: number }
): { page: number; limit: number; skip: number } {
    const page = Math.max(1, parseInt(searchParams.get('page') || '') || defaults?.page || 1);
    const limit = Math.min(
        100,
        Math.max(1, parseInt(searchParams.get('limit') || '') || defaults?.limit || 20)
    );
    const skip = (page - 1) * limit;

    return { page, limit, skip };
}

/**
 * Tạo pagination meta từ total count
 */
export function createPaginationMeta(
    page: number,
    limit: number,
    total: number
): PaginationMeta {
    return {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    };
}

// ==========================================
// VALIDATION HELPERS
// ==========================================

/**
 * Parse và validate request body với Zod schema
 * Throw ValidationError nếu không hợp lệ
 * 
 * @example
 * const data = await parseBody(request, createProductSchema);
 * // data đã được validate và có đúng type
 */
export async function parseBody<T>(
    request: Request,
    schema: { parse: (data: unknown) => T }
): Promise<T> {
    try {
        const body = await request.json();
        return schema.parse(body);
    } catch (error) {
        if (error instanceof ZodError) {
            throw error; // Sẽ được xử lý bởi errorResponse
        }
        throw new ValidationError('Không thể đọc dữ liệu request');
    }
}

/**
 * Parse và validate query params với Zod schema
 */
export function parseQuery<T>(
    searchParams: URLSearchParams,
    schema: { parse: (data: unknown) => T }
): T {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
        params[key] = value;
    });
    return schema.parse(params);
}
