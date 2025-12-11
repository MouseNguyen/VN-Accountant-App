// src/tests/utils.test.ts
// Unit tests cho utility functions

import { describe, it, expect } from 'vitest';
import {
    formatMoney,
    formatNumber,
    formatDate,
    formatRelativeDate,
    generateTransNumber,
    generateCode,
    parseMoney,
    isValidEmail,
    isValidPhone,
    isValidTaxCode,
    truncate,
    calculateCasualPIT,
    calculateVAT,
} from '@/lib/utils';

describe('Money Formatting', () => {
    describe('formatMoney', () => {
        it('formats positive numbers correctly', () => {
            expect(formatMoney(1500000)).toBe('1.500.000đ');
            expect(formatMoney(1000)).toBe('1.000đ');
            expect(formatMoney(999999999)).toBe('999.999.999đ');
        });

        it('handles zero', () => {
            expect(formatMoney(0)).toBe('0đ');
        });

        it('handles null/undefined', () => {
            expect(formatMoney(null)).toBe('0đ');
            expect(formatMoney(undefined)).toBe('0đ');
        });

        it('handles string input', () => {
            expect(formatMoney('1500000')).toBe('1.500.000đ');
        });
    });

    describe('formatNumber', () => {
        it('formats numbers without currency symbol', () => {
            expect(formatNumber(1500000)).toBe('1.500.000');
            expect(formatNumber(0)).toBe('0');
        });
    });

    describe('parseMoney', () => {
        it('parses Vietnamese money format', () => {
            expect(parseMoney('1.500.000')).toBe(1500000);
            expect(parseMoney('1.500.000đ')).toBe(1500000);
            expect(parseMoney('')).toBe(0);
        });
    });
});

describe('Date Formatting', () => {
    describe('formatDate', () => {
        it('formats date to Vietnamese format', () => {
            const date = new Date('2024-12-11');
            expect(formatDate(date)).toBe('11/12/2024');
        });

        it('handles null', () => {
            expect(formatDate(null)).toBe('');
        });

        it('handles string input', () => {
            expect(formatDate('2024-12-11')).toBe('11/12/2024');
        });
    });

    describe('formatRelativeDate', () => {
        it('returns "Hôm nay" for today', () => {
            const today = new Date();
            expect(formatRelativeDate(today)).toBe('Hôm nay');
        });

        it('returns "Hôm qua" for yesterday', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            expect(formatRelativeDate(yesterday)).toBe('Hôm qua');
        });
    });
});

describe('Code Generation', () => {
    describe('generateTransNumber', () => {
        it('generates transaction number with correct format', () => {
            const date = new Date('2024-12-11');
            expect(generateTransNumber('PT', date, 1)).toBe('PT-202412-001');
            expect(generateTransNumber('PC', date, 42)).toBe('PC-202412-042');
            expect(generateTransNumber('BH', date, 999)).toBe('BH-202412-999');
        });
    });

    describe('generateCode', () => {
        it('generates code with zero padding', () => {
            expect(generateCode('SP', 1)).toBe('SP001');
            expect(generateCode('KH', 42)).toBe('KH042');
            expect(generateCode('NCC', 999)).toBe('NCC999');
        });
    });
});

describe('Validation', () => {
    describe('isValidEmail', () => {
        it('validates correct emails', () => {
            expect(isValidEmail('test@example.com')).toBe(true);
            expect(isValidEmail('user.name@domain.co.vn')).toBe(true);
        });

        it('rejects invalid emails', () => {
            expect(isValidEmail('invalid')).toBe(false);
            expect(isValidEmail('test@')).toBe(false);
            expect(isValidEmail('@domain.com')).toBe(false);
        });
    });

    describe('isValidPhone', () => {
        it('validates Vietnamese phone numbers', () => {
            expect(isValidPhone('0901234567')).toBe(true);
            expect(isValidPhone('84901234567')).toBe(true);
            expect(isValidPhone('+84901234567')).toBe(true);
        });

        it('rejects invalid phone numbers', () => {
            expect(isValidPhone('123')).toBe(false);
            expect(isValidPhone('abcdefghij')).toBe(false);
        });
    });

    describe('isValidTaxCode', () => {
        it('validates 10-digit tax codes', () => {
            expect(isValidTaxCode('0123456789')).toBe(true);
        });

        it('validates 13-digit tax codes', () => {
            expect(isValidTaxCode('0123456789012')).toBe(true);
        });

        it('rejects invalid tax codes', () => {
            expect(isValidTaxCode('123')).toBe(false);
            expect(isValidTaxCode('abcdefghij')).toBe(false);
        });
    });
});

describe('String Helpers', () => {
    describe('truncate', () => {
        it('truncates long strings', () => {
            expect(truncate('This is a long string', 10)).toBe('This is a ...');
        });

        it('returns short strings unchanged', () => {
            expect(truncate('Short', 10)).toBe('Short');
        });
    });
});

describe('Tax Calculations', () => {
    describe('calculateCasualPIT', () => {
        it('applies 10% tax for income >= 2 million', () => {
            const result = calculateCasualPIT(2000000);
            expect(result.taxAmount).toBe(200000);
            expect(result.netAmount).toBe(1800000);
        });

        it('no tax for income < 2 million', () => {
            const result = calculateCasualPIT(1500000);
            expect(result.taxAmount).toBe(0);
            expect(result.netAmount).toBe(1500000);
        });

        it('calculates correct tax for higher amounts', () => {
            const result = calculateCasualPIT(5000000);
            expect(result.taxAmount).toBe(500000);
            expect(result.netAmount).toBe(4500000);
        });
    });

    describe('calculateVAT', () => {
        it('calculates 10% VAT correctly', () => {
            const result = calculateVAT(1000000, 10);
            expect(result.vatAmount).toBe(100000);
            expect(result.totalAmount).toBe(1100000);
        });

        it('calculates 5% VAT correctly', () => {
            const result = calculateVAT(1000000, 5);
            expect(result.vatAmount).toBe(50000);
            expect(result.totalAmount).toBe(1050000);
        });

        it('handles 0% VAT', () => {
            const result = calculateVAT(1000000, 0);
            expect(result.vatAmount).toBe(0);
            expect(result.totalAmount).toBe(1000000);
        });
    });
});
