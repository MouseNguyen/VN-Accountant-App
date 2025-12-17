// tests/integration/vat-validation.test.ts
// VAT Validation Integration Tests
// Task 12 Phase 3

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { validateVATDeduction } from '@/lib/tax/vat-validator';

describe('VAT Validation Integration', () => {
    const testFarmId = 'test-farm-vat-integration';

    beforeAll(async () => {
        // Create test farm
        await prisma.farm.upsert({
            where: { id: testFarmId },
            create: {
                id: testFarmId,
                name: 'Test Farm VAT',
                owner_name: 'Test Owner',
                business_type: 'FARM',
            },
            update: {},
        });

        // Seed tax rules for VAT validation
        await prisma.taxRule.createMany({
            data: [
                {
                    farm_id: testFarmId,
                    code: 'VAT_CASH_LIMIT',
                    rule_type: 'VAT_INPUT',
                    category: 'CASH',
                    action: 'REJECT_DEDUCTION',
                    value: 20000000, // 20M VND limit
                    description: 'Cash payment over 20M',
                    is_active: true,
                },
                {
                    farm_id: testFarmId,
                    code: 'VAT_VEHICLE_UNDER_9',
                    rule_type: 'VAT_INPUT',
                    category: 'VEHICLE',
                    action: 'REJECT_DEDUCTION',
                    value: 0,
                    description: 'Vehicles under 9 seats',
                    is_active: true,
                },
            ],
            skipDuplicates: true,
        });
    });

    afterAll(async () => {
        await prisma.taxRule.deleteMany({ where: { farm_id: testFarmId } });
        await prisma.farm.delete({ where: { id: testFarmId } }).catch(() => { });
    });

    // Test Case 1: HĐ 30tr tiền mặt → Không khấu trừ
    it('TC1: 30tr cash payment should NOT be deductible', async () => {
        const result = await validateVATDeduction(testFarmId, {
            invoice_date: '2024-12-01',
            invoice_number: 'HĐ001',
            supplier_tax_code: '0100123456',
            goods_value: 27272727,
            vat_rate: 10,
            vat_amount: 2727273,
            total_amount: 30000000,
            payment_method: 'CASH',
        });

        expect(result.is_deductible).toBe(false);
        expect(result.errors.some((e) => e.code === 'CASH_PAYMENT_OVER_LIMIT')).toBe(true);
    });

    // Test Case 2: HĐ 30tr chuyển khoản → Được khấu trừ
    it('TC2: 30tr bank transfer should be deductible', async () => {
        const result = await validateVATDeduction(testFarmId, {
            invoice_date: '2024-12-01',
            invoice_number: 'HĐ002',
            supplier_tax_code: '0100123456',
            goods_value: 27272727,
            vat_rate: 10,
            vat_amount: 2727273,
            total_amount: 30000000,
            payment_method: 'BANK_TRANSFER',
        });

        expect(result.is_deductible).toBe(true);
        expect(result.errors.length).toBe(0);
    });

    // Test Case 3: HĐ 19tr tiền mặt → Được khấu trừ (under limit)
    it('TC3: 19tr cash should be deductible (under limit)', async () => {
        const result = await validateVATDeduction(testFarmId, {
            invoice_date: '2024-12-01',
            invoice_number: 'HĐ003',
            supplier_tax_code: '0100123456',
            goods_value: 17272727,
            vat_rate: 10,
            vat_amount: 1727273,
            total_amount: 19000000,
            payment_method: 'CASH',
        });

        expect(result.is_deductible).toBe(true);
    });

    // Test Case 4: Xe < 9 chỗ → Không khấu trừ
    it('TC4: Car under 9 seats should NOT be deductible', async () => {
        const result = await validateVATDeduction(testFarmId, {
            invoice_date: '2024-12-01',
            invoice_number: 'HĐ004',
            supplier_tax_code: '0100123456',
            goods_value: 500000000,
            vat_rate: 10,
            vat_amount: 50000000,
            total_amount: 550000000,
            payment_method: 'BANK_TRANSFER',
            is_vehicle: true,
            vehicle_type: 'CAR',
            vehicle_seats: 5,
        });

        expect(result.is_deductible).toBe(false);
        expect(result.errors.some((e) => e.code === 'VEHICLE_UNDER_9_SEATS')).toBe(true);
    });

    // Test Case 5: Tiếp khách > 500k/người → Warning
    it('TC5: Entertainment over 500k/person should have warning', async () => {
        const result = await validateVATDeduction(testFarmId, {
            invoice_date: '2024-12-01',
            invoice_number: 'HĐ005',
            supplier_tax_code: '0100123456',
            goods_value: 3000000,
            vat_rate: 10,
            vat_amount: 300000,
            total_amount: 3300000,
            payment_method: 'CASH',
            is_entertainment: true,
            number_of_persons: 4, // 825k/person
        });

        expect(result.is_deductible).toBe(true);
        expect(result.warnings.some((w) => w.code === 'ENTERTAINMENT_EXCEEDED')).toBe(true);
    });

    // Test Case 6: Thiếu MST → Không khấu trừ
    it('TC6: Missing supplier tax code should NOT be deductible', async () => {
        const result = await validateVATDeduction(testFarmId, {
            invoice_date: '2024-12-01',
            invoice_number: 'HĐ006',
            // Missing supplier_tax_code
            goods_value: 5000000,
            vat_rate: 10,
            vat_amount: 500000,
            total_amount: 5500000,
            payment_method: 'CASH',
        });

        expect(result.is_deductible).toBe(false);
        expect(result.errors.some((e) => e.code === 'MISSING_SUPPLIER_MST')).toBe(true);
    });

    // Test Case 7: HĐ > 5 năm → Không khấu trừ
    it('TC7: Invoice over 5 years should NOT be deductible', async () => {
        const result = await validateVATDeduction(testFarmId, {
            invoice_date: '2018-01-01', // > 5 years ago
            invoice_number: 'HĐ007',
            supplier_tax_code: '0100123456',
            goods_value: 5000000,
            vat_rate: 10,
            vat_amount: 500000,
            total_amount: 5500000,
            payment_method: 'CASH',
        });

        expect(result.is_deductible).toBe(false);
        expect(result.errors.some((e) => e.code === 'INVOICE_EXPIRED')).toBe(true);
    });
});
