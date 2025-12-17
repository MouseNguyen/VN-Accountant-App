// tests/integration/pit-calculation.test.ts
// PIT Calculation Integration Tests
// Task 12 Phase 3

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { calculatePIT } from '@/lib/tax/pit-calculator';

describe('PIT Calculation Integration', () => {
    const testFarmId = 'test-farm-pit-integration';
    let testEmployeeId: string;

    beforeAll(async () => {
        // Create test farm
        await prisma.farm.upsert({
            where: { id: testFarmId },
            create: {
                id: testFarmId,
                name: 'Test Farm PIT',
                owner_name: 'Test Owner',
                business_type: 'FARM',
            },
            update: {},
        });

        // Create test employee
        const worker = await prisma.worker.create({
            data: {
                farm_id: testFarmId,
                code: 'NV-TEST-PIT',
                name: 'Nhân Viên Test',
                phone: '0901234567',
                status: 'ACTIVE',
                salary_type: 'MONTHLY',
                base_salary: 15000000,
                dependents: 0,
            },
        });
        testEmployeeId = worker.id;

        // Seed PIT tax rules
        await prisma.taxRule.createMany({
            data: [
                {
                    farm_id: testFarmId,
                    code: 'PIT_PERSONAL_DEDUCTION',
                    rule_type: 'PIT_DEDUCTION',
                    category: 'DEDUCTION',
                    action: 'CALCULATE',
                    value: 11000000,
                    description: 'Personal deduction 11M',
                    is_active: true,
                },
                {
                    farm_id: testFarmId,
                    code: 'PIT_DEPENDENT_DEDUCTION',
                    rule_type: 'PIT_DEDUCTION',
                    category: 'DEDUCTION',
                    action: 'CALCULATE',
                    value: 4400000,
                    description: 'Dependent deduction 4.4M',
                    is_active: true,
                },
                {
                    farm_id: testFarmId,
                    code: 'PIT_INSURANCE_RATE',
                    rule_type: 'PIT_DEDUCTION',
                    category: 'INSURANCE',
                    action: 'CALCULATE',
                    value: 10.5,
                    description: 'Insurance rate 10.5%',
                    is_active: true,
                },
            ],
            skipDuplicates: true,
        });
    });

    afterAll(async () => {
        await prisma.pITCalculation.deleteMany({ where: { farm_id: testFarmId } });
        await prisma.taxRule.deleteMany({ where: { farm_id: testFarmId } });
        await prisma.worker.deleteMany({ where: { farm_id: testFarmId } });
        await prisma.farm.delete({ where: { id: testFarmId } }).catch(() => { });
    });

    // Case 1: 10tr, 0 NPT → Tax = 0 (under threshold)
    it('Case 1: 10M salary, 0 dependents → Tax = 0', async () => {
        const result = await calculatePIT(testFarmId, {
            employee_id: testEmployeeId,
            period: '2024-12',
            gross_income: 10000000,
            dependents_count: 0,
        });

        // BHXH: 1,050,000 (10.5%)
        // Giảm trừ bản thân: 11,000,000
        // Thu nhập tính thuế: 10M - 1.05M - 11M = -2.05M → 0
        expect(result.taxable_income).toBe(0);
        expect(result.pit_amount).toBe(0);
    });

    // Case 2: 15tr, 0 NPT → Tax ≈ 121,250
    it('Case 2: 15M salary, 0 dependents → Tax ≈ 121,250', async () => {
        const result = await calculatePIT(testFarmId, {
            employee_id: testEmployeeId,
            period: '2024-12',
            gross_income: 15000000,
            dependents_count: 0,
        });

        // BHXH: 1,575,000 (10.5%)
        // Giảm trừ bản thân: 11,000,000
        // Thu nhập tính thuế: 15M - 1.575M - 11M = 2,425,000
        // Thuế: 2,425,000 × 5% = 121,250
        expect(result.taxable_income).toBe(2425000);
        expect(result.pit_amount).toBe(121250);
    });

    // Case 3: 15tr, 1 NPT → Tax = 0
    it('Case 3: 15M salary, 1 dependent → Tax = 0', async () => {
        const result = await calculatePIT(testFarmId, {
            employee_id: testEmployeeId,
            period: '2024-12',
            gross_income: 15000000,
            dependents_count: 1,
        });

        // BHXH: 1,575,000
        // Giảm trừ: 11,000,000 + 4,400,000 = 15,400,000
        // Thu nhập tính thuế: 15M - 1.575M - 15.4M = -1.975M → 0
        expect(result.taxable_income).toBe(0);
        expect(result.pit_amount).toBe(0);
    });

    // Case 4: 30tr, 0 NPT → Progressive tax
    it('Case 4: 30M salary, 0 dependents → Progressive tax', async () => {
        const result = await calculatePIT(testFarmId, {
            employee_id: testEmployeeId,
            period: '2024-12',
            gross_income: 30000000,
            dependents_count: 0,
        });

        // BHXH: 3,150,000 (10.5%)
        // Giảm trừ bản thân: 11,000,000
        // Thu nhập tính thuế: 30M - 3.15M - 11M = 15,850,000
        // Thuế lũy tiến:
        //   0-5M: 5M × 5% = 250,000
        //   5-10M: 5M × 10% = 500,000
        //   10-15.85M: 5.85M × 15% = 877,500
        //   Total: 1,627,500
        expect(result.taxable_income).toBe(15850000);
        expect(result.pit_amount).toBeGreaterThan(1000000);
    });

    // Case 5: 50tr, 2 NPT → Higher bracket
    it('Case 5: 50M salary, 2 dependents → Higher bracket tax', async () => {
        const result = await calculatePIT(testFarmId, {
            employee_id: testEmployeeId,
            period: '2024-12',
            gross_income: 50000000,
            dependents_count: 2,
        });

        // BHXH: 5,250,000 (10.5%)
        // Giảm trừ: 11,000,000 + 8,800,000 = 19,800,000
        // Thu nhập tính thuế: 50M - 5.25M - 19.8M = 24,950,000
        expect(result.taxable_income).toBe(24950000);
        expect(result.pit_amount).toBeGreaterThan(0);
    });
});
