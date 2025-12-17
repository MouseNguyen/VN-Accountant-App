// tests/integration/cit-calculation.test.ts
// CIT Calculation Integration Tests
// Task 12 Phase 3

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { calculateCIT } from '@/lib/tax/cit-calculator';

describe('CIT Calculation Integration', () => {
    const testFarmId = 'test-farm-cit-integration';

    beforeAll(async () => {
        // Create test farm
        await prisma.farm.upsert({
            where: { id: testFarmId },
            create: {
                id: testFarmId,
                name: 'Test Farm CIT',
                owner_name: 'Test Owner',
                business_type: 'FARM',
            },
            update: {},
        });

        // Create test transactions
        await prisma.transaction.createMany({
            data: [
                // Sales revenue
                {
                    farm_id: testFarmId,
                    trans_number: 'CIT-S001',
                    code: 'CIT-S001',
                    trans_type: 'SALE',
                    amount: 100000000,
                    total_amount: 100000000,
                    trans_date: new Date('2024-10-15'),
                    payment_status: 'PAID',
                },
                // Purchase expense
                {
                    farm_id: testFarmId,
                    trans_number: 'CIT-P001',
                    code: 'CIT-P001',
                    trans_type: 'PURCHASE',
                    amount: 60000000,
                    total_amount: 60000000,
                    trans_date: new Date('2024-11-01'),
                    payment_status: 'PAID',
                },
            ],
            skipDuplicates: true,
        });
    });

    afterAll(async () => {
        await prisma.cITCalculation.deleteMany({ where: { farm_id: testFarmId } });
        await prisma.transaction.deleteMany({ where: { farm_id: testFarmId } });
        await prisma.farm.delete({ where: { id: testFarmId } }).catch(() => { });
    });

    it('Should calculate CIT correctly for Q4', async () => {
        const result = await calculateCIT(testFarmId, {
            period: '2024-Q4',
            period_type: 'QUARTERLY',
        });

        expect(result.total_revenue).toBe(100000000);
        expect(result.total_expenses).toBe(60000000);
        expect(result.accounting_profit).toBe(40000000);
        expect(result.tax_rate).toBe(20);
        expect(result.cit_amount).toBe(8000000); // 40M × 20%
    });

    it('Should handle negative profit (loss)', async () => {
        // Add more expenses to create a loss
        await prisma.transaction.create({
            data: {
                farm_id: testFarmId,
                trans_number: 'CIT-E001',
                code: 'CIT-E001',
                trans_type: 'EXPENSE',
                amount: 50000000,
                total_amount: 50000000,
                trans_date: new Date('2024-12-01'),
                payment_status: 'PAID',
            },
        });

        const result = await calculateCIT(testFarmId, {
            period: '2024-Q4',
            period_type: 'QUARTERLY',
        });

        // Revenue: 100M, Expenses: 60M + 50M = 110M
        // Profit: -10M
        expect(result.accounting_profit).toBeLessThan(0);
        expect(result.cit_amount).toBe(0);
        expect(result.loss_carried).toBeGreaterThan(0);
    });

    it('Should apply 20% tax rate', async () => {
        // Reset by removing the extra expense
        await prisma.transaction.deleteMany({
            where: { farm_id: testFarmId, code: 'CIT-E001' },
        });

        const result = await calculateCIT(testFarmId, {
            period: '2024-Q4',
            period_type: 'QUARTERLY',
        });

        // Check tax rate is 20%
        expect(Number(result.tax_rate)).toBe(20);
    });

    it('Should correctly sum revenue and expenses', async () => {
        // Add another sale
        await prisma.transaction.create({
            data: {
                farm_id: testFarmId,
                trans_number: 'CIT-S002',
                code: 'CIT-S002',
                trans_type: 'SALE',
                amount: 50000000,
                total_amount: 50000000,
                trans_date: new Date('2024-12-15'),
                payment_status: 'PAID',
            },
        });

        const result = await calculateCIT(testFarmId, {
            period: '2024-Q4',
            period_type: 'QUARTERLY',
        });

        // Revenue: 100M + 50M = 150M
        expect(result.total_revenue).toBe(150000000);
    });
});
