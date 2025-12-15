// src/lib/payroll-calculator.ts
import Decimal from 'decimal.js';
import type { InsuranceConfig } from '@/types/payroll';

// Decimal helpers
function toDecimal(v: number | string | Decimal): Decimal {
    return new Decimal(v);
}

function roundMoney(v: Decimal | number): number {
    const d = v instanceof Decimal ? v : new Decimal(v);
    return Number(d.toFixed(0));
}

// Bậc thuế TNCN Việt Nam (sau giảm trừ)
const TAX_BRACKETS = [
    { max: 5_000_000, rate: 0.05 },
    { max: 10_000_000, rate: 0.10 },
    { max: 18_000_000, rate: 0.15 },
    { max: 32_000_000, rate: 0.20 },
    { max: 52_000_000, rate: 0.25 },
    { max: 80_000_000, rate: 0.30 },
    { max: Infinity, rate: 0.35 },
];

/**
 * Tính thuế TNCN lũy tiến theo bậc
 */
export function calculateProgressiveTax(taxableIncome: number): number {
    if (taxableIncome <= 0) return 0;

    let tax = new Decimal(0);
    let remaining = toDecimal(taxableIncome);
    let prevMax = new Decimal(0);

    for (const bracket of TAX_BRACKETS) {
        const bracketWidth = toDecimal(bracket.max).minus(prevMax);
        const taxableInBracket = Decimal.min(remaining, bracketWidth);

        if (taxableInBracket.lte(0)) break;

        tax = tax.plus(taxableInBracket.times(bracket.rate));
        remaining = remaining.minus(taxableInBracket);
        prevMax = toDecimal(bracket.max);

        if (remaining.lte(0)) break;
    }

    return roundMoney(tax);
}

/**
 * Tính BHXH, BHYT, BHTN cho cả NV và DN
 */
export function calculateInsurance(insuranceBase: number, config: InsuranceConfig): {
    // Phần NV đóng (10.5%)
    bhxh: number;
    bhyt: number;
    bhtn: number;
    total: number;
    // Phần DN đóng (21.5%)
    employer_bhxh: number;    // 17%
    employer_bhyt: number;    // 3%
    employer_bhtn: number;    // 1%
    employer_bhtnld: number;  // 0.5%
    employer_total: number;   // 21.5%
} {
    const base = Math.min(insuranceBase, config.max_insurance_base);

    // Phần NV đóng (10.5%)
    const bhxh = roundMoney((base * config.bhxh_employee_rate) / 100);
    const bhyt = roundMoney((base * config.bhyt_employee_rate) / 100);
    const bhtn = roundMoney((base * config.bhtn_employee_rate) / 100);

    // Phần DN đóng (21.5%)
    const employer_bhxh = roundMoney((base * 17) / 100);    // BHXH DN: 17%
    const employer_bhyt = roundMoney((base * 3) / 100);     // BHYT DN: 3%
    const employer_bhtn = roundMoney((base * 1) / 100);     // BHTN DN: 1%
    const employer_bhtnld = roundMoney((base * 0.5) / 100); // BHTNLĐ-BNN: 0.5%

    return {
        bhxh,
        bhyt,
        bhtn,
        total: bhxh + bhyt + bhtn,
        employer_bhxh,
        employer_bhyt,
        employer_bhtn,
        employer_bhtnld,
        employer_total: employer_bhxh + employer_bhyt + employer_bhtn + employer_bhtnld,
    };
}

/**
 * Tính thuế TNCN cho 1 nhân viên
 */
export function calculateWorkerTax(params: {
    grossIncome: number;
    insuranceAmount: number;
    config: InsuranceConfig;
    dependents: number;
    isSubjectToTax: boolean;
}): number {
    if (!params.isSubjectToTax) return 0;

    const totalDeduction =
        params.insuranceAmount +
        params.config.personal_deduction +
        (params.config.dependent_deduction * params.dependents);

    const taxableIncome = Math.max(0, params.grossIncome - totalDeduction);
    return calculateProgressiveTax(taxableIncome);
}

/**
 * Tính tiền OT theo loại
 */
export function calculateOtAmount(params: {
    hourlyRate: number;
    otNormalHours: number;
    otWeekendHours: number;
    otHolidayHours: number;
    nightHours: number;
    config: InsuranceConfig;
}): {
    ot_normal_amount: number;
    ot_weekend_amount: number;
    ot_holiday_amount: number;
    night_amount: number;
    total_ot: number;
} {
    const hourly = toDecimal(params.hourlyRate);

    const otNormal = roundMoney(hourly.times(params.otNormalHours).times(params.config.ot_normal_rate));
    const otWeekend = roundMoney(hourly.times(params.otWeekendHours).times(params.config.ot_weekend_rate));
    const otHoliday = roundMoney(hourly.times(params.otHolidayHours).times(params.config.ot_holiday_rate));
    const night = roundMoney(hourly.times(params.nightHours).times(params.config.night_bonus_rate));

    return {
        ot_normal_amount: otNormal,
        ot_weekend_amount: otWeekend,
        ot_holiday_amount: otHoliday,
        night_amount: night,
        total_ot: otNormal + otWeekend + otHoliday + night,
    };
}

/**
 * Tính lương đầy đủ cho 1 nhân viên
 */
export function calculateWorkerPayroll(params: {
    salary_type: string;
    worker_type?: string; // FULL_TIME, PART_TIME, SEASONAL
    base_salary: number;
    work_days: number;
    work_hours: number;
    ot_normal_hours: number;
    ot_weekend_hours: number;
    ot_holiday_hours: number;
    night_hours: number;
    allowances?: Array<{ name: string; amount: number }>;
    deductions?: Array<{ name: string; amount: number }>;
    insurance_base?: number;
    dependents: number;
    is_subject_to_tax: boolean;
    config: InsuranceConfig;
}) {
    const baseSalary = toDecimal(params.base_salary);
    let baseAmount = new Decimal(0);
    let hourlyRate = 0;

    // Tính lương cơ bản theo loại
    switch (params.salary_type) {
        case 'MONTHLY':
            baseAmount = baseSalary;
            hourlyRate = Number(baseSalary.dividedBy(26).dividedBy(8));
            break;
        case 'DAILY':
            baseAmount = baseSalary.times(params.work_days);
            hourlyRate = Number(baseSalary.dividedBy(8));
            break;
        case 'HOURLY':
            baseAmount = baseSalary.times(params.work_hours);
            hourlyRate = params.base_salary;
            break;
    }

    // Tính OT
    const otCalc = calculateOtAmount({
        hourlyRate,
        otNormalHours: params.ot_normal_hours,
        otWeekendHours: params.ot_weekend_hours,
        otHolidayHours: params.ot_holiday_hours,
        nightHours: params.night_hours,
        config: params.config,
    });

    // Phụ cấp
    const totalAllowance = (params.allowances || []).reduce((sum, a) => sum + a.amount, 0);

    // Khấu trừ thủ công
    const totalDeduction = (params.deductions || []).reduce((sum, d) => sum + d.amount, 0);

    // Gross = Base + OT + Allowances
    const grossAmount = roundMoney(baseAmount) + otCalc.total_ot + totalAllowance;

    // BHXH - Chỉ tính cho nhân viên MONTHLY + không phải SEASONAL
    // Không tính cho DAILY/HOURLY hoặc SEASONAL (lao động thời vụ/giao khoán)
    const isSubjectToInsurance =
        params.salary_type === 'MONTHLY' &&
        params.worker_type !== 'SEASONAL';

    let insurance = {
        bhxh: 0, bhyt: 0, bhtn: 0, total: 0,
        employer_bhxh: 0, employer_bhyt: 0, employer_bhtn: 0, employer_bhtnld: 0, employer_total: 0
    };
    if (isSubjectToInsurance) {
        const insuranceBase = params.insurance_base || params.base_salary;
        insurance = calculateInsurance(insuranceBase, params.config);
    }

    // Thuế TNCN
    const tax = calculateWorkerTax({
        grossIncome: grossAmount,
        insuranceAmount: insurance.total,
        config: params.config,
        dependents: params.dependents,
        isSubjectToTax: params.is_subject_to_tax,
    });

    // Net = Gross - BHXH - Thuế - Khấu trừ
    const netAmount = grossAmount - insurance.total - tax - totalDeduction;

    return {
        work_days: params.work_days,
        work_hours: params.work_hours,
        ot_normal_hours: params.ot_normal_hours,
        ot_weekend_hours: params.ot_weekend_hours,
        ot_holiday_hours: params.ot_holiday_hours,
        night_hours: params.night_hours,
        base_amount: roundMoney(baseAmount),
        ...otCalc,
        total_allowance: totalAllowance,
        total_deduction: totalDeduction,
        // Phần NV đóng (10.5%)
        bhxh_amount: insurance.bhxh,
        bhyt_amount: insurance.bhyt,
        bhtn_amount: insurance.bhtn,
        insurance_amount: insurance.total,
        // Phần DN đóng (21.5%)
        employer_bhxh: insurance.employer_bhxh,
        employer_bhyt: insurance.employer_bhyt,
        employer_bhtn: insurance.employer_bhtn,
        employer_bhtnld: insurance.employer_bhtnld,
        employer_insurance: insurance.employer_total,
        // Thuế và tổng
        tax_amount: tax,
        gross_amount: grossAmount,
        net_amount: roundMoney(Math.max(0, netAmount)),
    };
}
