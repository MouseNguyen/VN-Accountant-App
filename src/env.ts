// src/env.ts
// Environment variables validation
// Validate tất cả biến môi trường khi app khởi động

import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
    /*
     * Server-side environment variables
     * Chỉ có thể truy cập ở server (API routes, Server Components)
     */
    server: {
        // Database - PostgreSQL connection string
        DATABASE_URL: z
            .string()
            .url()
            .refine(
                (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
                'DATABASE_URL phải là PostgreSQL connection string'
            ),

        // Authentication - JWT
        JWT_SECRET: z
            .string()
            .min(32, 'JWT_SECRET phải có ít nhất 32 ký tự để bảo mật'),

        // Access Token (short-lived)
        ACCESS_TOKEN_EXPIRES_IN: z
            .string()
            .default('15m')
            .refine(
                (val) => /^\d+[smhd]$/.test(val),
                'ACCESS_TOKEN_EXPIRES_IN phải có format: 15m, 1h, 1d...'
            ),

        // Refresh Token (long-lived)
        REFRESH_TOKEN_EXPIRES_IN: z
            .string()
            .default('7d')
            .refine(
                (val) => /^\d+[smhd]$/.test(val),
                'REFRESH_TOKEN_EXPIRES_IN phải có format: 7d, 30d...'
            ),

        // Node environment
        NODE_ENV: z
            .enum(['development', 'production', 'test'])
            .default('development'),

        // Email - Resend
        RESEND_API_KEY: z.string().optional(),
        EMAIL_FROM: z.string().default('LABA ERP <noreply@resend.dev>'),

        // Rate Limiting - Upstash Redis
        UPSTASH_REDIS_REST_URL: z.string().url().optional(),
        UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

        // Optional: Cloud Storage (cho upload ảnh - Phase 2+)
        STORAGE_ACCESS_KEY: z.string().optional(),
        STORAGE_SECRET_KEY: z.string().optional(),
        STORAGE_BUCKET: z.string().optional(),
        STORAGE_ENDPOINT: z.string().url().optional(),

        // Optional: Google Cloud Vision (OCR - Task 9)
        GOOGLE_CLOUD_PROJECT_ID: z.string().optional(),
        GOOGLE_CLOUD_CREDENTIALS: z.string().optional(),
    },

    /*
     * Client-side environment variables
     * Có thể truy cập ở cả client và server
     * PHẢI bắt đầu bằng NEXT_PUBLIC_
     */
    client: {
        NEXT_PUBLIC_APP_NAME: z.string().default('LABA ERP'),
        NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
    },

    /*
     * Runtime environment variables
     * Mapping từ process.env sang env object
     */
    runtimeEnv: {
        // Server - Auth
        DATABASE_URL: process.env.DATABASE_URL,
        JWT_SECRET: process.env.JWT_SECRET,
        ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN,
        REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN,
        NODE_ENV: process.env.NODE_ENV,

        // Server - Email
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        EMAIL_FROM: process.env.EMAIL_FROM,

        // Server - Rate Limiting
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,

        // Server - Storage
        STORAGE_ACCESS_KEY: process.env.STORAGE_ACCESS_KEY,
        STORAGE_SECRET_KEY: process.env.STORAGE_SECRET_KEY,
        STORAGE_BUCKET: process.env.STORAGE_BUCKET,
        STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT,

        // Server - OCR
        GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID,
        GOOGLE_CLOUD_CREDENTIALS: process.env.GOOGLE_CLOUD_CREDENTIALS,

        // Client
        NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    },

    /*
     * Skip validation trong một số trường hợp
     * VD: khi build static pages
     */
    skipValidation: !!process.env.SKIP_ENV_VALIDATION,

    /*
     * Cho phép empty string được coi là undefined
     */
    emptyStringAsUndefined: true,
});

// Type helper
export type Env = typeof env;

// Helper to check if rate limiting is enabled
export const isRateLimitEnabled = (): boolean => {
    return !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
};

// Helper to check if email is enabled
export const isEmailEnabled = (): boolean => {
    return !!env.RESEND_API_KEY;
};
