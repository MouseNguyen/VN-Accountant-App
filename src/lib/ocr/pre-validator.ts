// src/lib/ocr/pre-validator.ts
// Pre-validate images before sending to paid OCR

import crypto from 'crypto';

// Magic bytes for common image formats
const IMAGE_SIGNATURES: Record<string, string[]> = {
    jpeg: ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2', 'ffd8ffe8', 'ffd8ffdb'],
    png: ['89504e47'],
    webp: ['52494646'],
    gif: ['47494638'],
    bmp: ['424d'],
};

export interface ValidationResult {
    valid: boolean;
    reason?: string;
    imageType?: string;
    size?: number;
    hash?: string;
}

/**
 * Pre-validate image before sending to paid OCR
 */
export function preValidateImage(base64Image: string): ValidationResult {
    try {
        // Remove data URL prefix if present
        let base64Content = base64Image;
        if (base64Image.includes(',')) {
            base64Content = base64Image.split(',')[1];
        }

        // Convert to buffer
        const buffer = Buffer.from(base64Content, 'base64');

        // 1. Size check (max 10MB)
        const size = buffer.length;
        if (size > 10 * 1024 * 1024) {
            return {
                valid: false,
                reason: 'File quá lớn (tối đa 10MB)',
                size,
            };
        }

        if (size < 1000) {
            return {
                valid: false,
                reason: 'File quá nhỏ, không phải ảnh hợp lệ',
                size,
            };
        }

        // 2. Check magic bytes
        const signature = buffer.slice(0, 4).toString('hex').toLowerCase();
        let detectedType: string | undefined;

        for (const [type, signatures] of Object.entries(IMAGE_SIGNATURES)) {
            if (signatures.some(sig => signature.startsWith(sig.substring(0, signature.length)))) {
                detectedType = type;
                break;
            }
        }

        if (!detectedType) {
            return {
                valid: false,
                reason: 'File không phải định dạng ảnh hợp lệ (JPEG, PNG, WebP)',
            };
        }

        // 3. Generate hash for deduplication
        const hash = crypto.createHash('md5').update(buffer).digest('hex');

        return {
            valid: true,
            imageType: detectedType,
            size,
            hash,
        };
    } catch (error) {
        return {
            valid: false,
            reason: 'Lỗi xử lý file ảnh',
        };
    }
}

/**
 * Sanitize OCR text to prevent XSS
 */
export function sanitizeOCRText(text: string): string {
    if (!text) return '';

    return text
        // Remove potentially dangerous HTML/script
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        // Remove control characters
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Limit length
        .substring(0, 50000);
}
