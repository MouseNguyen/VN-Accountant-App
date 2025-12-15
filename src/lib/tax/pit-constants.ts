// src/lib/tax/pit-constants.ts
// PIT (Personal Income Tax) Constants - Task 7
// Based on TT111 and NQ954/2020

// ==========================================
// TAX BRACKETS (7 levels - Progressive)
// ==========================================

export const PIT_BRACKETS = [
    { bracket: 1, min: 0, max: 5_000_000, rate: 0.05, quickDeduct: 0 },
    { bracket: 2, min: 5_000_000, max: 10_000_000, rate: 0.10, quickDeduct: 250_000 },
    { bracket: 3, min: 10_000_000, max: 18_000_000, rate: 0.15, quickDeduct: 750_000 },
    { bracket: 4, min: 18_000_000, max: 32_000_000, rate: 0.20, quickDeduct: 1_650_000 },
    { bracket: 5, min: 32_000_000, max: 52_000_000, rate: 0.25, quickDeduct: 3_250_000 },
    { bracket: 6, min: 52_000_000, max: 80_000_000, rate: 0.30, quickDeduct: 5_850_000 },
    { bracket: 7, min: 80_000_000, max: Infinity, rate: 0.35, quickDeduct: 9_850_000 },
];

// ==========================================
// DEDUCTIONS (Giảm trừ gia cảnh)
// ==========================================

// Giảm trừ bản thân (NQ954/2020, effective from 01/07/2020)
export const SELF_DEDUCTION = 11_000_000;

// Giảm trừ mỗi người phụ thuộc
export const DEPENDENT_DEDUCTION = 4_400_000;

// ==========================================
// INSURANCE RATES (Người lao động đóng)
// ==========================================

// BHXH: 8%, BHYT: 1.5%, BHTN: 1% → Total: 10.5%
export const INSURANCE_RATE = 0.105;

// ==========================================
// FLAT RATE (For casual/short-term workers)
// ==========================================

// LĐ thời vụ, HĐ < 3 tháng, không cư trú
export const FLAT_RATE_RESIDENT = 0.10;      // 10% cho cư trú, >= 2M
export const FLAT_RATE_NON_RESIDENT = 0.20;  // 20% cho không cư trú
export const FLAT_RATE_THRESHOLD = 2_000_000; // Ngưỡng khấu trừ

// ==========================================
// LABELS (for UI)
// ==========================================

export const PIT_BRACKET_LABELS: Record<number, string> = {
    1: '5%: Đến 5 triệu',
    2: '10%: 5-10 triệu',
    3: '15%: 10-18 triệu',
    4: '20%: 18-32 triệu',
    5: '25%: 32-52 triệu',
    6: '30%: 52-80 triệu',
    7: '35%: Trên 80 triệu',
};
