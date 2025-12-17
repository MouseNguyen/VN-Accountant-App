// src/tests/decimal.test.ts
// Unit tests for decimal calculation utilities

import { describe, it, expect } from 'vitest';
import {
    toDecimal,
    toNum,
    sum,
    multiply,
    percent,
    roundMoney,
    isGreaterThan,
} from '@/lib/decimal';

describe('Decimal Utilities', () => {
    describe('toDecimal', () => {
        it('converts numbers to Decimal', () => {
            expect(toDecimal(123.45).toNumber()).toBe(123.45);
            expect(toDecimal(0).toNumber()).toBe(0);
            expect(toDecimal(-100).toNumber()).toBe(-100);
        });

        it('converts strings to Decimal', () => {
            expect(toDecimal('123.45').toNumber()).toBe(123.45);
            expect(toDecimal('0').toNumber()).toBe(0);
        });

        it('handles null and undefined', () => {
            expect(toDecimal(null).toNumber()).toBe(0);
            expect(toDecimal(undefined).toNumber()).toBe(0);
        });

        it('handles Decimal objects', () => {
            const d = new (require('decimal.js'))('123.45');
            expect(toDecimal(d).toNumber()).toBe(123.45);
        });
    });

    describe('toNum', () => {
        it('converts Decimal objects to numbers', () => {
            const d = new (require('decimal.js'))('123.45');
            expect(toNum(d)).toBe(123.45);
        });

        it('handles numbers', () => {
            expect(toNum(123.45)).toBe(123.45);
        });

        it('handles strings', () => {
            expect(toNum('123.45')).toBe(123.45);
            expect(toNum('invalid')).toBe(0);
        });

        it('handles null and undefined', () => {
            expect(toNum(null)).toBe(0);
            expect(toNum(undefined)).toBe(0);
        });
    });

    describe('sum', () => {
        it('sums multiple numbers', () => {
            expect(sum(1, 2, 3).toNumber()).toBe(6);
            expect(sum(1.5, 2.5, 3).toNumber()).toBe(7);
        });

        it('handles empty args', () => {
            expect(sum().toNumber()).toBe(0);
        });

        it('handles mixed types', () => {
            expect(sum(1, '2', 3).toNumber()).toBe(6);
        });
    });

    describe('multiply', () => {
        it('multiplies two numbers', () => {
            expect(multiply(3, 4).toNumber()).toBe(12);
            expect(multiply(1.5, 2).toNumber()).toBe(3);
            expect(multiply('3', 4).toNumber()).toBe(12);
        });
    });

    describe('percent', () => {
        it('calculates percentage', () => {
            expect(percent(100, 10).toNumber()).toBe(10);
            expect(percent(200, 5).toNumber()).toBe(10);
            expect(percent(100, 0).toNumber()).toBe(0);
        });
    });

    describe('roundMoney', () => {
        it('rounds to 2 decimal places', () => {
            expect(roundMoney(123.456)).toBe(123.46);
            expect(roundMoney(123.454)).toBe(123.45);
            expect(roundMoney(123.455)).toBe(123.46);
        });

        it('handles strings', () => {
            expect(roundMoney('123.456')).toBe(123.46);
        });
    });

    describe('isGreaterThan', () => {
        it('compares values', () => {
            expect(isGreaterThan(10, 5)).toBe(true);
            expect(isGreaterThan(5, 10)).toBe(false);
            expect(isGreaterThan(10, 10)).toBe(false);
            expect(isGreaterThan('10', 5)).toBe(true);
        });
    });


});