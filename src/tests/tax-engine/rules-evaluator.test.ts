// src/tests/tax-engine/rules-evaluator.test.ts
// Unit tests for Tax Rules Evaluator

import { describe, it, expect } from 'vitest';
import { evaluateCondition, isRuleEffective, parseCondition } from '@/lib/tax/rules-evaluator';
import { EvaluationContext, RuleCondition } from '@/types/tax-engine';

describe('evaluateCondition', () => {
    // ==========================================
    // AMOUNT COMPARISONS
    // ==========================================

    describe('Amount comparisons', () => {
        it('should match amount_gte', () => {
            const condition: RuleCondition = { amount_gte: 20000000 };

            expect(evaluateCondition(condition, { amount: 20000000 })).toBe(true);
            expect(evaluateCondition(condition, { amount: 25000000 })).toBe(true);
            expect(evaluateCondition(condition, { amount: 19000000 })).toBe(false);
        });

        it('should match amount_lte', () => {
            const condition: RuleCondition = { amount_lte: 20000000 };

            expect(evaluateCondition(condition, { amount: 20000000 })).toBe(true);
            expect(evaluateCondition(condition, { amount: 15000000 })).toBe(true);
            expect(evaluateCondition(condition, { amount: 25000000 })).toBe(false);
        });

        it('should match amount_gt', () => {
            const condition: RuleCondition = { amount_gt: 20000000 };

            expect(evaluateCondition(condition, { amount: 20000001 })).toBe(true);
            expect(evaluateCondition(condition, { amount: 20000000 })).toBe(false);
        });

        it('should match amount_lt', () => {
            const condition: RuleCondition = { amount_lt: 20000000 };

            expect(evaluateCondition(condition, { amount: 19000000 })).toBe(true);
            expect(evaluateCondition(condition, { amount: 20000000 })).toBe(false);
        });

        it('should use total_amount as fallback', () => {
            const condition: RuleCondition = { amount_gte: 1000000 };

            expect(evaluateCondition(condition, { total_amount: 2000000 })).toBe(true);
            expect(evaluateCondition(condition, { total_amount: 500000 })).toBe(false);
        });
    });

    // ==========================================
    // PAYMENT METHOD
    // ==========================================

    describe('Payment method', () => {
        it('should check payment_method', () => {
            const condition: RuleCondition = { payment_method: 'BANK_TRANSFER' };

            expect(evaluateCondition(condition, { payment_method: 'BANK_TRANSFER' })).toBe(true);
            expect(evaluateCondition(condition, { payment_method: 'CASH' })).toBe(false);
        });

        it('should check payment_method_not', () => {
            const condition: RuleCondition = { payment_method_not: 'BANK_TRANSFER' };

            expect(evaluateCondition(condition, { payment_method: 'CASH' })).toBe(true);
            expect(evaluateCondition(condition, { payment_method: 'MOMO' })).toBe(true);
            expect(evaluateCondition(condition, { payment_method: 'BANK_TRANSFER' })).toBe(false);
        });
    });

    // ==========================================
    // VEHICLE RULES
    // ==========================================

    describe('Vehicle rules', () => {
        it('should check vehicle_type', () => {
            const condition: RuleCondition = { vehicle_type: 'CAR' };

            expect(evaluateCondition(condition, { vehicle_type: 'CAR' })).toBe(true);
            expect(evaluateCondition(condition, { vehicle_type: 'TRUCK' })).toBe(false);
        });

        it('should check seats_lt for car', () => {
            const condition: RuleCondition = { vehicle_type: 'CAR', seats_lt: 9 };

            expect(evaluateCondition(condition, { vehicle_type: 'CAR', seats: 5 })).toBe(true);
            expect(evaluateCondition(condition, { vehicle_type: 'CAR', seats: 9 })).toBe(false);
            expect(evaluateCondition(condition, { vehicle_type: 'CAR', seats: 16 })).toBe(false);
        });

        it('should check seats_gte', () => {
            const condition: RuleCondition = { seats_gte: 9 };

            expect(evaluateCondition(condition, { seats: 9 })).toBe(true);
            expect(evaluateCondition(condition, { seats: 16 })).toBe(true);
            expect(evaluateCondition(condition, { seats: 5 })).toBe(false);
        });
    });

    // ==========================================
    // SUPPLIER TAX CODE
    // ==========================================

    describe('Supplier tax code', () => {
        it('should check missing tax code (null condition)', () => {
            const condition: RuleCondition = { supplier_tax_code: null };

            expect(evaluateCondition(condition, { supplier_tax_code: undefined })).toBe(true);
            expect(evaluateCondition(condition, { supplier_tax_code: '' })).toBe(true);
            expect(evaluateCondition(condition, {})).toBe(true);
            expect(evaluateCondition(condition, { supplier_tax_code: '0100123456' })).toBe(false);
        });

        it('should check specific tax code', () => {
            const condition: RuleCondition = { supplier_tax_code: '0100123456' };

            expect(evaluateCondition(condition, { supplier_tax_code: '0100123456' })).toBe(true);
            expect(evaluateCondition(condition, { supplier_tax_code: '0109999999' })).toBe(false);
        });
    });

    // ==========================================
    // INVOICE AGE
    // ==========================================

    describe('Invoice age', () => {
        it('should check invoice_age_years_gt', () => {
            const condition: RuleCondition = { invoice_age_years_gt: 5 };

            const oldDate = new Date();
            oldDate.setFullYear(oldDate.getFullYear() - 6);

            const recentDate = new Date();
            recentDate.setFullYear(recentDate.getFullYear() - 3);

            expect(evaluateCondition(condition, { invoice_date: oldDate })).toBe(true);
            expect(evaluateCondition(condition, { invoice_date: recentDate })).toBe(false);
        });

        it('should use current_date if provided', () => {
            const condition: RuleCondition = { invoice_age_years_gt: 2 };

            const invoiceDate = new Date('2020-01-01');
            const checkDate = new Date('2023-01-15'); // 3+ years later

            expect(evaluateCondition(condition, {
                invoice_date: invoiceDate,
                current_date: checkDate
            })).toBe(true);
        });
    });

    // ==========================================
    // LABOR CONTRACT
    // ==========================================

    describe('Labor contract', () => {
        it('should check has_labor_contract true', () => {
            const condition: RuleCondition = { has_labor_contract: true };

            expect(evaluateCondition(condition, { has_labor_contract: true })).toBe(true);
            expect(evaluateCondition(condition, { has_labor_contract: false })).toBe(false);
        });

        it('should check has_labor_contract false', () => {
            const condition: RuleCondition = { has_labor_contract: false };

            expect(evaluateCondition(condition, { has_labor_contract: false })).toBe(true);
            expect(evaluateCondition(condition, { has_labor_contract: true })).toBe(false);
        });
    });

    // ==========================================
    // ENTERTAINMENT
    // ==========================================

    describe('Entertainment', () => {
        it('should check amount_per_person_gte', () => {
            const condition: RuleCondition = { amount_per_person_gte: 500000 };

            expect(evaluateCondition(condition, { amount_per_person: 600000 })).toBe(true);
            expect(evaluateCondition(condition, { amount_per_person: 500000 })).toBe(true);
            expect(evaluateCondition(condition, { amount_per_person: 400000 })).toBe(false);
        });

        it('should check entertainment_ratio_gt', () => {
            const condition: RuleCondition = { entertainment_ratio_gt: 15 };

            // 20% > 15% = true
            expect(evaluateCondition(condition, {
                total_entertainment: 20000000,
                total_expenses: 100000000
            })).toBe(true);

            // 10% > 15% = false
            expect(evaluateCondition(condition, {
                total_entertainment: 10000000,
                total_expenses: 100000000
            })).toBe(false);

            // 15% > 15% = false (not strictly greater)
            expect(evaluateCondition(condition, {
                total_entertainment: 15000000,
                total_expenses: 100000000
            })).toBe(false);
        });
    });

    // ==========================================
    // CATEGORY
    // ==========================================

    describe('Category', () => {
        it('should check category_in', () => {
            const condition: RuleCondition = { category_in: ['ENTERTAINMENT', 'LUXURY'] };

            expect(evaluateCondition(condition, { category: 'ENTERTAINMENT' })).toBe(true);
            expect(evaluateCondition(condition, { category: 'LUXURY' })).toBe(true);
            expect(evaluateCondition(condition, { category: 'OFFICE' })).toBe(false);
        });

        it('should check category_not_in', () => {
            const condition: RuleCondition = { category_not_in: ['PROHIBITED', 'BANNED'] };

            expect(evaluateCondition(condition, { category: 'OFFICE' })).toBe(true);
            expect(evaluateCondition(condition, { category: 'PROHIBITED' })).toBe(false);
            expect(evaluateCondition(condition, { category: 'BANNED' })).toBe(false);
        });
    });

    // ==========================================
    // LOGICAL OPERATORS
    // ==========================================

    describe('Logical operators', () => {
        it('should handle AND (all must match)', () => {
            const condition: RuleCondition = {
                AND: [
                    { amount_gte: 20000000 },
                    { payment_method: 'CASH' }
                ]
            };

            expect(evaluateCondition(condition, { amount: 25000000, payment_method: 'CASH' })).toBe(true);
            expect(evaluateCondition(condition, { amount: 25000000, payment_method: 'BANK_TRANSFER' })).toBe(false);
            expect(evaluateCondition(condition, { amount: 15000000, payment_method: 'CASH' })).toBe(false);
        });

        it('should handle OR (any can match)', () => {
            const condition: RuleCondition = {
                OR: [
                    { amount_gte: 50000000 },
                    { category_in: ['LUXURY'] }
                ]
            };

            expect(evaluateCondition(condition, { amount: 60000000 })).toBe(true);
            expect(evaluateCondition(condition, { category: 'LUXURY' })).toBe(true);
            expect(evaluateCondition(condition, { amount: 30000000, category: 'OFFICE' })).toBe(false);
        });

        it('should handle NOT (negate)', () => {
            const condition: RuleCondition = {
                NOT: { payment_method: 'CASH' }
            };

            expect(evaluateCondition(condition, { payment_method: 'BANK_TRANSFER' })).toBe(true);
            expect(evaluateCondition(condition, { payment_method: 'MOMO' })).toBe(true);
            expect(evaluateCondition(condition, { payment_method: 'CASH' })).toBe(false);
        });

        it('should handle nested AND/OR', () => {
            const condition: RuleCondition = {
                AND: [
                    { amount_gte: 20000000 },
                    {
                        OR: [
                            { payment_method: 'CASH' },
                            { category_in: ['LUXURY'] }
                        ]
                    }
                ]
            };

            // >= 20M AND (CASH OR LUXURY)
            expect(evaluateCondition(condition, { amount: 25000000, payment_method: 'CASH' })).toBe(true);
            expect(evaluateCondition(condition, { amount: 25000000, category: 'LUXURY' })).toBe(true);
            expect(evaluateCondition(condition, { amount: 25000000, payment_method: 'BANK_TRANSFER' })).toBe(false);
            expect(evaluateCondition(condition, { amount: 15000000, payment_method: 'CASH' })).toBe(false);
        });
    });

    // ==========================================
    // NO CONDITION
    // ==========================================

    describe('No condition', () => {
        it('should return true for empty condition', () => {
            expect(evaluateCondition({}, {})).toBe(true);
        });

        it('should return true for null condition', () => {
            expect(evaluateCondition(null, {})).toBe(true);
        });

        it('should return true for undefined condition', () => {
            expect(evaluateCondition(undefined, {})).toBe(true);
        });
    });

    // ==========================================
    // COMBINED CONDITIONS (implicit AND)
    // ==========================================

    describe('Combined conditions', () => {
        it('should combine multiple conditions as AND', () => {
            const condition: RuleCondition = {
                amount_gte: 20000000,
                payment_method_not: 'BANK_TRANSFER'
            };

            // Both must match
            expect(evaluateCondition(condition, { amount: 25000000, payment_method: 'CASH' })).toBe(true);
            expect(evaluateCondition(condition, { amount: 25000000, payment_method: 'BANK_TRANSFER' })).toBe(false);
            expect(evaluateCondition(condition, { amount: 15000000, payment_method: 'CASH' })).toBe(false);
        });
    });
});

// ==========================================
// isRuleEffective TESTS
// ==========================================

describe('isRuleEffective', () => {
    it('should return true if no dates specified', () => {
        expect(isRuleEffective(null, null)).toBe(true);
        expect(isRuleEffective(undefined, undefined)).toBe(true);
    });

    it('should check effective_from', () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);

        const pastDate = new Date();
        pastDate.setFullYear(pastDate.getFullYear() - 1);

        expect(isRuleEffective(futureDate, null)).toBe(false); // Not yet effective
        expect(isRuleEffective(pastDate, null)).toBe(true);    // Already effective
    });

    it('should check effective_to', () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);

        const pastDate = new Date();
        pastDate.setFullYear(pastDate.getFullYear() - 1);

        expect(isRuleEffective(null, futureDate)).toBe(true);  // Not yet expired
        expect(isRuleEffective(null, pastDate)).toBe(false);   // Already expired
    });

    it('should work with custom check date', () => {
        const from = new Date('2024-01-01');
        const to = new Date('2024-12-31');

        expect(isRuleEffective(from, to, new Date('2024-06-15'))).toBe(true);  // In range
        expect(isRuleEffective(from, to, new Date('2023-06-15'))).toBe(false); // Before
        expect(isRuleEffective(from, to, new Date('2025-06-15'))).toBe(false); // After
    });

    it('should work with string dates', () => {
        expect(isRuleEffective('2023-01-01', '2025-12-31', new Date())).toBe(true);
        expect(isRuleEffective('2030-01-01', null, new Date())).toBe(false);
    });
});

// ==========================================
// parseCondition TESTS
// ==========================================

describe('parseCondition', () => {
    it('should return null for null/undefined', () => {
        expect(parseCondition(null)).toBe(null);
        expect(parseCondition(undefined)).toBe(null);
    });

    it('should parse JSON string', () => {
        const json = '{"amount_gte": 20000000}';
        const result = parseCondition(json);

        expect(result).toEqual({ amount_gte: 20000000 });
    });

    it('should return object as-is', () => {
        const obj = { amount_gte: 20000000 };
        const result = parseCondition(obj);

        expect(result).toBe(obj);
    });

    it('should return null for invalid JSON', () => {
        const invalidJson = 'not valid json';
        const result = parseCondition(invalidJson);

        expect(result).toBe(null);
    });
});
