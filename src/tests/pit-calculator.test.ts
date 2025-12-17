// src/tests/pit-calculator.test.ts
// Unit tests for PIT (Personal Income Tax) Calculator

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculatePIT } from '@/lib/tax/pit-calculator';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
    prisma: {
        worker: {
            findUnique: vi.fn(),
        },
    },
}));

// Mock context
vi.mock('@/lib/context', () => ({
    getCurrentUserId: vi.fn(),
}));

// Mock engine
vi.mock('@/lib/tax/engine', () => ({
    getRuleValue: vi.fn(),
}));

import { prisma } from '@/lib/prisma';

describe('PIT Calculator', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('calculatePIT', () => {
        it('throws error for non-existent worker', async () => {
            (prisma.worker.findUnique as any).mockResolvedValue(null);

            const input = {
                employee_id: 'invalid-worker',
                period: '2024-12',
                gross_income: 15000000,
            };

            await expect(calculatePIT('farm-1', input)).rejects.toThrow('Nhân viên không tồn tại');
        });

        it('calculates PIT for a flat rate worker', async () => {
            // Mock high earner worker - flat rate tax
            const mockWorker = {
                id: 'worker-2',
                full_name: 'High Earner',
                is_resident: true,
                is_high_earner: true,
                dependents: 0,
            };

            (prisma.worker.findUnique as any).mockResolvedValue(mockWorker);

            const input = {
                employee_id: 'worker-2',
                period: '2024-12',
                gross_income: 10000000, // 10M VND
            };

            const result = await calculatePIT('farm-1', input);

            expect(result).toHaveProperty('pit_amount');
            expect(result.tax_method).toBe('FLAT_10');
            expect(result.pit_amount).toBe(1000000); // 10% of 10M
        });

        it('calculates PIT for non-resident worker', async () => {
            // Mock non-resident worker
            const mockWorker = {
                id: 'worker-3',
                full_name: 'Non Resident',
                is_resident: false,
                is_high_earner: false,
                dependents: 0,
            };

            (prisma.worker.findUnique as any).mockResolvedValue(mockWorker);

            const input = {
                employee_id: 'worker-3',
                period: '2024-12',
                gross_income: 10000000, // 10M VND
            };

            const result = await calculatePIT('farm-1', input);

            expect(result).toHaveProperty('pit_amount');
            expect(result.tax_method).toBe('FLAT_20');
            expect(result.pit_amount).toBe(2000000); // 20% of 10M for non-residents
        });

        it('throws error for non-existent worker', async () => {
            (prisma.worker.findUnique as any).mockResolvedValue(null);

            const input = {
                employee_id: 'invalid-worker',
                period: '2024-12',
                gross_income: 15000000,
            };

            await expect(calculatePIT('farm-1', input)).rejects.toThrow('Nhân viên không tồn tại');
        });

        it('uses provided dependents_count over worker dependents', async () => {
            const mockWorker = {
                id: 'worker-4',
                full_name: 'Test Worker',
                is_resident: true,
                is_high_earner: false,
                dependents: 1, // Worker has 1 dependent
            };

            (prisma.worker.findUnique as any).mockResolvedValue(mockWorker);

            const input = {
                employee_id: 'worker-4',
                period: '2024-12',
                gross_income: 15000000,
                dependents_count: 3, // Override with 3 dependents
            };

            const result = await calculatePIT('farm-1', input);

            // Should use 3 dependents, not 1
            expect(result).toHaveProperty('dependent_deduction');
            expect(result.dependent_deduction).toBe(3 * 4400000); // 4.4M per dependent
        });
    });
});