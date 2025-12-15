// src/__tests__/services/inventory.test.ts
// Unit tests cho Inventory Service - Moving Average & COGS calculations

import { describe, it, expect } from 'vitest';
import {
    calculateMovingAverageCost,
    roundMoney,
    roundQuantity,
    formatMoney,
    formatQuantity
} from '@/lib/decimal';

describe('Moving Average Cost Calculation', () => {
    describe('calculateMovingAverageCost', () => {
        it('should calculate initial avg cost when no existing stock', () => {
            const result = calculateMovingAverageCost(0, 0, 100, 50000);
            expect(result).toBe(50000);
        });

        it('should calculate weighted average when adding to existing stock', () => {
            // Existing: 100 units @ 50,000
            // Adding: 50 units @ 80,000
            // Expected: (100*50000 + 50*80000) / 150 = 60,000
            const result = calculateMovingAverageCost(100, 50000, 50, 80000);
            expect(result).toBe(60000);
        });

        it('should handle equal quantities', () => {
            // Existing: 100 units @ 50,000
            // Adding: 100 units @ 60,000
            // Expected: (100*50000 + 100*60000) / 200 = 55,000
            const result = calculateMovingAverageCost(100, 50000, 100, 60000);
            expect(result).toBe(55000);
        });

        it('should handle small additions to large stock', () => {
            // Existing: 1000 units @ 50,000
            // Adding: 10 units @ 100,000
            // Expected: (1000*50000 + 10*100000) / 1010 = 50,495.05
            const result = calculateMovingAverageCost(1000, 50000, 10, 100000);
            expect(result).toBeCloseTo(50495.05, 0);
        });

        it('should handle large additions to small stock', () => {
            // Existing: 10 units @ 50,000
            // Adding: 1000 units @ 100,000
            // Expected: (10*50000 + 1000*100000) / 1010 = 99,504.95
            const result = calculateMovingAverageCost(10, 50000, 1000, 100000);
            expect(result).toBeCloseTo(99504.95, 0);
        });

        it('should keep same price when adding at same price', () => {
            const result = calculateMovingAverageCost(100, 50000, 50, 50000);
            expect(result).toBe(50000);
        });

        it('should handle decimal quantities', () => {
            // Existing: 10.5 kg @ 100,000
            // Adding: 5.5 kg @ 120,000
            // Expected: (10.5*100000 + 5.5*120000) / 16 = 106,875
            const result = calculateMovingAverageCost(10.5, 100000, 5.5, 120000);
            expect(result).toBe(106875);
        });

        it('should handle zero new price (free goods)', () => {
            // Existing: 100 units @ 50,000
            // Adding: 50 units @ 0 (free goods)
            // Expected: (100*50000 + 50*0) / 150 = 33,333.33
            const result = calculateMovingAverageCost(100, 50000, 50, 0);
            expect(result).toBeCloseTo(33333.33, 0);
        });
    });
});

describe('COGS Calculation', () => {
    it('should calculate COGS correctly', () => {
        const avgCost = 50000;
        const quantity = 10;
        const cogs = roundMoney(quantity * avgCost);
        expect(cogs).toBe(500000);
    });

    it('should handle decimal quantities', () => {
        const avgCost = 50000;
        const quantity = 10.5;
        const cogs = roundMoney(quantity * avgCost);
        expect(cogs).toBe(525000);
    });

    it('should handle small quantities', () => {
        const avgCost = 50000;
        const quantity = 0.001;
        const cogs = roundMoney(quantity * avgCost);
        expect(cogs).toBe(50);
    });
});

describe('Rounding Functions', () => {
    describe('roundMoney', () => {
        it('should round to 2 decimal places', () => {
            expect(roundMoney(1234.5678)).toBe(1234.57);
        });

        it('should handle negative values', () => {
            expect(roundMoney(-1234.5678)).toBe(-1234.57);
        });
    });

    describe('roundQuantity', () => {
        it('should round to 3 decimal places', () => {
            expect(roundQuantity(1.23456789)).toBe(1.235);
        });

        it('should handle whole numbers', () => {
            expect(roundQuantity(100)).toBe(100);
        });
    });
});

describe('Format Functions', () => {
    describe('formatMoney', () => {
        it('should format with thousand separators (vi-VN)', () => {
            // vi-VN dùng dấu . làm ngàn
            expect(formatMoney(1234567)).toBe('1.234.567');
        });

        it('should handle zero', () => {
            expect(formatMoney(0)).toBe('0');
        });
    });

    describe('formatQuantity', () => {
        it('should format with decimal places', () => {
            expect(formatQuantity(123.456)).toBe('123.456');
        });

        it('should remove trailing zeros', () => {
            expect(formatQuantity(123.000)).toBe('123');
        });

        it('should handle decimals', () => {
            expect(formatQuantity(123.400)).toBe('123.4');
        });
    });
});

describe('Stock Validation', () => {
    describe('Negative Stock Check', () => {
        it('should detect when quantity exceeds stock', () => {
            const currentStock = 100;
            const requestedQty = 150;
            const isOverStock = requestedQty > currentStock;
            expect(isOverStock).toBe(true);
        });

        it('should allow when quantity equals stock', () => {
            const currentStock = 100;
            const requestedQty = 100;
            const isOverStock = requestedQty > currentStock;
            expect(isOverStock).toBe(false);
        });

        it('should allow when quantity is less than stock', () => {
            const currentStock = 100;
            const requestedQty = 50;
            const isOverStock = requestedQty > currentStock;
            expect(isOverStock).toBe(false);
        });
    });
});

describe('Inventory Flow Scenarios', () => {
    it('should maintain correct avg cost through multiple operations', () => {
        let qty = 0;
        let avgCost = 0;

        // First purchase: 100 @ 50,000
        avgCost = calculateMovingAverageCost(qty, avgCost, 100, 50000);
        qty += 100;
        expect(avgCost).toBe(50000);
        expect(qty).toBe(100);

        // Second purchase: 50 @ 60,000
        avgCost = calculateMovingAverageCost(qty, avgCost, 50, 60000);
        qty += 50;
        expect(Math.round(avgCost)).toBe(53333);
        expect(qty).toBe(150);

        // Sell: 75 units (avg cost doesn't change on sell)
        const soldQty = 75;
        const cogs = roundMoney(soldQty * avgCost);
        qty -= soldQty;
        expect(qty).toBe(75);
        // 75 * 53333.33 ≈ 4,000,000 (with slight floating point variance)
        expect(cogs).toBeCloseTo(4000000, 0);

        // Third purchase: 25 @ 55,000
        avgCost = calculateMovingAverageCost(qty, avgCost, 25, 55000);
        qty += 25;
        expect(qty).toBe(100);
        // Expected: (75*53333.33 + 25*55000) / 100 = 53,750
        expect(Math.round(avgCost)).toBeCloseTo(53750, -2);
    });
});
