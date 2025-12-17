// src/lib/decimal.ts
// Decimal.js utilities cho tính toán tiền tệ chính xác

import Decimal from 'decimal.js';

// Configure Decimal.js
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Chuyển đổi giá trị sang Decimal
 */
export function toDecimal(value: number | string | Decimal | null | undefined): Decimal {
    if (value === null || value === undefined) return new Decimal(0);
    return new Decimal(value);
}

/**
 * Chuyển đổi Prisma Decimal/any value sang number
 * Use this for frontend calculations where Prisma returns Decimal objects
 */
export function toNum(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value) || 0;
    // Handle Prisma Decimal objects (they have toString method)
    if (typeof value === 'object' && value !== null && 'toString' in value) {
        return parseFloat(String(value)) || 0;
    }
    return 0;
}

/**
 * Tính tổng nhiều giá trị
 */
export function sum(...values: (number | string | Decimal)[]): Decimal {
    return values.reduce<Decimal>(
        (acc, val) => acc.plus(toDecimal(val)),
        new Decimal(0)
    );
}

/**
 * Nhân 2 số
 */
export function multiply(
    a: number | string | Decimal,
    b: number | string | Decimal
): Decimal {
    return toDecimal(a).times(toDecimal(b));
}

/**
 * Chia 2 số (trả về 0 nếu chia cho 0)
 */
export function divide(
    a: number | string | Decimal,
    b: number | string | Decimal
): Decimal {
    const divisor = toDecimal(b);
    if (divisor.isZero()) return new Decimal(0);
    return toDecimal(a).dividedBy(divisor);
}

/**
 * Làm tròn số tiền VND (không có chữ số thập phân - VND không có đơn vị nhỏ hơn đồng)
 */
export function roundMoney(value: number | string | Decimal): number {
    return toDecimal(value).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Làm tròn số lượng (3 chữ số thập phân)
 */
export function roundQuantity(value: number | string | Decimal): number {
    return toDecimal(value).toDecimalPlaces(3, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Tính phần trăm: value * rate / 100
 */
export function percent(
    value: number | string | Decimal,
    rate: number | string | Decimal
): Decimal {
    return multiply(value, divide(rate, 100));
}

/**
 * Trừ 2 số
 */
export function subtract(
    a: number | string | Decimal,
    b: number | string | Decimal
): Decimal {
    return toDecimal(a).minus(toDecimal(b));
}

/**
 * Moving Average Cost - Giá vốn trung bình
 * Formula: ((oldQty * oldAvgCost) + (newQty * newCost)) / (oldQty + newQty)
 * 
 * @example
 * // Tồn kho 100kg @ 50,000đ, mua thêm 50kg @ 60,000đ
 * calculateMovingAverageCost(100, 50000, 50, 60000) // = 53,333.33
 */
export function calculateMovingAverageCost(
    oldQty: number | string | Decimal,
    oldAvgCost: number | string | Decimal,
    newQty: number | string | Decimal,
    newCost: number | string | Decimal
): number {
    const oldTotal = multiply(oldQty, oldAvgCost);
    const newTotal = multiply(newQty, newCost);
    const totalQty = sum(oldQty, newQty);

    if (totalQty.isZero()) return 0;
    return roundMoney(divide(sum(oldTotal, newTotal), totalQty));
}

/**
 * So sánh a > b
 */
export function isGreaterThan(
    a: number | string | Decimal,
    b: number | string | Decimal
): boolean {
    return toDecimal(a).comparedTo(toDecimal(b)) > 0;
}

/**
 * So sánh a >= b
 */
export function isGreaterThanOrEqual(
    a: number | string | Decimal,
    b: number | string | Decimal
): boolean {
    return toDecimal(a).comparedTo(toDecimal(b)) >= 0;
}

/**
 * So sánh a < b
 */
export function isLessThan(
    a: number | string | Decimal,
    b: number | string | Decimal
): boolean {
    return toDecimal(a).comparedTo(toDecimal(b)) < 0;
}

/**
 * So sánh a <= b
 */
export function isLessThanOrEqual(
    a: number | string | Decimal,
    b: number | string | Decimal
): boolean {
    return toDecimal(a).comparedTo(toDecimal(b)) <= 0;
}

/**
 * Kiểm tra bằng 0
 */
export function isZero(value: number | string | Decimal): boolean {
    return toDecimal(value).isZero();
}

/**
 * Kiểm tra dương
 */
export function isPositive(value: number | string | Decimal): boolean {
    return toDecimal(value).isPositive() && !toDecimal(value).isZero();
}

/**
 * Format số tiền VND
 */
export function formatMoney(value: number | string | Decimal): string {
    return new Intl.NumberFormat('vi-VN').format(roundMoney(value));
}

/**
 * Format số lượng
 */
export function formatQuantity(value: number | string | Decimal): string {
    const num = roundQuantity(value);
    // Only remove trailing zeros after decimal point, not from whole numbers
    // 80 stays as "80", 80.500 becomes "80.5", 80.000 becomes "80"
    const str = num.toString();
    if (str.includes('.')) {
        return str.replace(/\.?0+$/, '');
    }
    return str;
}
