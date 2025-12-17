// tests/integration/asset-depreciation.test.ts
// Asset Depreciation Integration Tests
// Task 12 Phase 3

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createAsset, calculateMonthlyDepreciation } from '@/services/asset.service';

describe('Asset Depreciation Integration', () => {
    const testFarmId = 'test-farm-asset-integration';

    beforeAll(async () => {
        // Create test farm
        await prisma.farm.upsert({
            where: { id: testFarmId },
            create: {
                id: testFarmId,
                name: 'Test Farm Asset',
                owner_name: 'Test Owner',
                business_type: 'FARM',
            },
            update: {},
        });
    });

    afterAll(async () => {
        await prisma.depreciationSchedule.deleteMany({
            where: { asset: { farm_id: testFarmId } },
        });
        await prisma.asset.deleteMany({ where: { farm_id: testFarmId } });
        await prisma.farm.delete({ where: { id: testFarmId } }).catch(() => { });
    });

    it('Should create asset with correct depreciation values', async () => {
        const asset = await createAsset(testFarmId, {
            code: 'ASSET-TEST-001',
            name: 'Máy cày test',
            category: 'MACHINERY',
            purchase_date: '2024-01-01',
            purchase_price: 60000000,
            useful_life_months: 60, // 5 years
        });

        expect(Number(asset.original_cost)).toBe(60000000);
        expect(Number(asset.monthly_depreciation)).toBe(1000000); // 60M / 60 months
        expect(Number(asset.book_value)).toBe(60000000);
        expect(Number(asset.accumulated_depreciation)).toBe(0);
    });

    it('Should calculate monthly depreciation correctly', async () => {
        const result = await calculateMonthlyDepreciation(testFarmId);

        expect(result.processed).toBeGreaterThanOrEqual(1);

        // Check asset is updated
        const asset = await prisma.asset.findFirst({
            where: { farm_id: testFarmId, code: 'ASSET-TEST-001' },
        });

        expect(Number(asset?.accumulated_depreciation)).toBe(1000000);
        expect(Number(asset?.book_value)).toBe(59000000);
    });

    it('Should create depreciation schedule entry', async () => {
        const period = new Date().toISOString().slice(0, 7); // "2024-12"

        const schedules = await prisma.depreciationSchedule.findMany({
            where: {
                asset: { farm_id: testFarmId, code: 'ASSET-TEST-001' },
                period,
            },
        });

        expect(schedules.length).toBe(1);
        expect(Number(schedules[0].depreciation_amount)).toBe(1000000);
    });

    it('Should NOT depreciate fully depreciated asset', async () => {
        // Create fully depreciated asset
        await prisma.asset.create({
            data: {
                farm_id: testFarmId,
                code: 'ASSET-TEST-OLD',
                name: 'Máy cũ đã hết khấu hao',
                category: 'EQUIPMENT',
                purchase_date: new Date('2020-01-01'),
                purchase_price: 12000000,
                useful_life_months: 36,
                depreciation_method: 'STRAIGHT_LINE',
                monthly_depreciation: 333333,
                original_cost: 12000000,
                accumulated_depreciation: 12000000, // Fully depreciated
                book_value: 0,
                status: 'ACTIVE',
            },
        });

        const result = await calculateMonthlyDepreciation(testFarmId);

        expect(result.skipped).toBeGreaterThan(0);

        // Verify old asset unchanged
        const oldAsset = await prisma.asset.findFirst({
            where: { farm_id: testFarmId, code: 'ASSET-TEST-OLD' },
        });

        expect(Number(oldAsset?.book_value)).toBe(0);
    });

    it('Should handle DISPOSED assets correctly', async () => {
        // Create disposed asset
        await prisma.asset.create({
            data: {
                farm_id: testFarmId,
                code: 'ASSET-TEST-DISPOSED',
                name: 'Máy đã thanh lý',
                category: 'EQUIPMENT',
                purchase_date: new Date('2023-01-01'),
                purchase_price: 20000000,
                useful_life_months: 60,
                depreciation_method: 'STRAIGHT_LINE',
                monthly_depreciation: 333333,
                original_cost: 20000000,
                accumulated_depreciation: 4000000,
                book_value: 16000000,
                status: 'DISPOSED',
                disposed_at: new Date('2024-06-01'),
            },
        });

        const result = await calculateMonthlyDepreciation(testFarmId);

        // Disposed assets should be skipped
        expect(result.skipped).toBeGreaterThan(0);
    });

    it('Should calculate depreciation for multiple assets', async () => {
        // Create another active asset
        await prisma.asset.create({
            data: {
                farm_id: testFarmId,
                code: 'ASSET-TEST-002',
                name: 'Xe tải',
                category: 'VEHICLE',
                purchase_date: new Date('2024-06-01'),
                purchase_price: 300000000,
                useful_life_months: 120, // 10 years
                depreciation_method: 'STRAIGHT_LINE',
                monthly_depreciation: 2500000,
                original_cost: 300000000,
                accumulated_depreciation: 0,
                book_value: 300000000,
                status: 'ACTIVE',
            },
        });

        const result = await calculateMonthlyDepreciation(testFarmId);

        // Should process at least the new asset
        expect(result.processed).toBeGreaterThanOrEqual(1);
    });
});
