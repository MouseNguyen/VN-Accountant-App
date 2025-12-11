/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        // Môi trường test
        environment: 'jsdom',

        // Enable globals (describe, it, expect)
        globals: true,

        // Setup file
        setupFiles: ['./src/tests/setup.ts'],

        // Test file patterns
        include: ['src/**/*.{test,spec}.{ts,tsx}'],

        // Exclude patterns
        exclude: ['node_modules', '.next', 'dist'],

        // Coverage config
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            reportsDirectory: './coverage',
            exclude: [
                'node_modules',
                'src/tests',
                '**/*.d.ts',
                '**/*.config.*',
                '**/types/**',
            ],
        },

        // Timeout
        testTimeout: 10000,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
