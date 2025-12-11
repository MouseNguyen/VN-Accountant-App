// src/tests/setup.ts
// Vitest global setup file

import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Next.js router
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        prefetch: vi.fn(),
        back: vi.fn(),
    }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
}));

// Mock environment variables for tests
vi.stubEnv('JWT_SECRET', 'test-secret-key-at-least-32-characters-long');
vi.stubEnv('JWT_EXPIRES_IN', '7d');
vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');
vi.stubEnv('NEXT_PUBLIC_APP_NAME', 'LABA ERP Test');
vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
