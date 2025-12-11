// src/lib/errors.ts
// Centralized Error Handling - Custom Error Classes

// ==========================================
// BASE APP ERROR
// ==========================================

/**
 * Base Error class cho tất cả lỗi trong app
 * Kế thừa từ class này để tạo các loại lỗi cụ thể
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly isOperational: boolean;
    public readonly details?: Record<string, unknown>;

    constructor(
        message: string,
        statusCode: number = 500,
        code: string = 'INTERNAL_ERROR',
        details?: Record<string, unknown>
    ) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true; // Lỗi có thể xử lý được (không phải bug)
        this.details = details;

        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);

        // Set prototype explicitly (for instanceof to work correctly)
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

// ==========================================
// VALIDATION ERROR (400)
// ==========================================

/**
 * Lỗi validation - dữ liệu không hợp lệ
 * StatusCode: 400
 */
export class ValidationError extends AppError {
    constructor(message: string = 'Dữ liệu không hợp lệ', details?: Record<string, unknown>) {
        super(message, 400, 'VALIDATION_ERROR', details);
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

// ==========================================
// UNAUTHORIZED ERROR (401)
// ==========================================

/**
 * Lỗi chưa đăng nhập
 * StatusCode: 401
 */
export class UnauthorizedError extends AppError {
    constructor(message: string = 'Vui lòng đăng nhập để tiếp tục') {
        super(message, 401, 'UNAUTHORIZED');
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
}

// ==========================================
// FORBIDDEN ERROR (403)
// ==========================================

/**
 * Lỗi không có quyền truy cập
 * StatusCode: 403
 */
export class ForbiddenError extends AppError {
    constructor(message: string = 'Bạn không có quyền thực hiện thao tác này') {
        super(message, 403, 'FORBIDDEN');
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }
}

// ==========================================
// NOT FOUND ERROR (404)
// ==========================================

/**
 * Lỗi không tìm thấy resource
 * StatusCode: 404
 */
export class NotFoundError extends AppError {
    constructor(resource: string = 'Dữ liệu') {
        super(`${resource} không tồn tại`, 404, 'NOT_FOUND');
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

// ==========================================
// CONFLICT ERROR (409)
// ==========================================

/**
 * Lỗi xung đột dữ liệu (VD: duplicate unique key)
 * StatusCode: 409
 */
export class ConflictError extends AppError {
    constructor(message: string = 'Dữ liệu đã tồn tại') {
        super(message, 409, 'CONFLICT');
        Object.setPrototypeOf(this, ConflictError.prototype);
    }
}

// ==========================================
// OPTIMISTIC LOCK ERROR (409)
// ==========================================

/**
 * Lỗi concurrent update - dữ liệu đã bị thay đổi bởi người khác
 * StatusCode: 409
 */
export class OptimisticLockError extends AppError {
    constructor() {
        super(
            'Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang và thử lại.',
            409,
            'OPTIMISTIC_LOCK_ERROR'
        );
        Object.setPrototypeOf(this, OptimisticLockError.prototype);
    }
}

// ==========================================
// RATE LIMIT ERROR (429)
// ==========================================

/**
 * Lỗi quá nhiều request
 * StatusCode: 429
 */
export class RateLimitError extends AppError {
    constructor(message: string = 'Quá nhiều yêu cầu. Vui lòng thử lại sau.') {
        super(message, 429, 'RATE_LIMIT_EXCEEDED');
        Object.setPrototypeOf(this, RateLimitError.prototype);
    }
}

// ==========================================
// EXTERNAL SERVICE ERROR (502)
// ==========================================

/**
 * Lỗi từ service bên ngoài (VD: OCR, Storage)
 * StatusCode: 502
 */
export class ExternalServiceError extends AppError {
    constructor(service: string, originalError?: Error) {
        super(
            `Không thể kết nối đến ${service}. Vui lòng thử lại sau.`,
            502,
            'EXTERNAL_SERVICE_ERROR',
            originalError ? { originalMessage: originalError.message } : undefined
        );
        Object.setPrototypeOf(this, ExternalServiceError.prototype);
    }
}

// ==========================================
// ERROR RESPONSE BUILDER
// ==========================================

/**
 * Cấu trúc response khi có lỗi
 */
export interface ErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
}

/**
 * Build error response object từ Error
 */
export function buildErrorResponse(error: AppError | Error): ErrorResponse {
    if (error instanceof AppError) {
        return {
            success: false,
            error: {
                code: error.code,
                message: error.message,
                details: error.details,
            },
        };
    }

    // Unknown error - không expose chi tiết ra client
    console.error('Unexpected error:', error);
    return {
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: 'Có lỗi xảy ra, vui lòng thử lại sau',
        },
    };
}

/**
 * Lấy status code từ Error
 */
export function getStatusCode(error: AppError | Error): number {
    if (error instanceof AppError) {
        return error.statusCode;
    }
    return 500;
}

// ==========================================
// TYPE GUARDS
// ==========================================

/**
 * Kiểm tra có phải AppError không
 */
export function isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
}

/**
 * Kiểm tra có phải operational error không (có thể xử lý được)
 */
export function isOperationalError(error: unknown): boolean {
    if (error instanceof AppError) {
        return error.isOperational;
    }
    return false;
}
