// src/lib/tax/pit-calculator.ts
// PIT (Personal Income Tax) Calculator - Task 7
// Supports Progressive (7 brackets) and Flat Rate (10%, 20%) methods

import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/context';
import {
    PIT_BRACKETS,
    SELF_DEDUCTION,
    DEPENDENT_DEDUCTION,
    INSURANCE_RATE,
    FLAT_RATE_RESIDENT,
    FLAT_RATE_NON_RESIDENT,
    FLAT_RATE_THRESHOLD,
} from './pit-constants';
import { getRuleValue } from './engine';
import {
    PITCalculationInput,
    PITCalculationResult,
    TaxBracketDetail,
    PITBatchResult,
} from '@/types/pit';
import Decimal from 'decimal.js';

// ==========================================
// MAIN CALCULATE PIT
// ==========================================

export async function calculatePIT(
    farmId: string,
    input: PITCalculationInput
): Promise<PITCalculationResult> {
    const { employee_id, period, gross_income } = input;

    // Get worker info
    const worker = await prisma.worker.findUnique({
        where: { id: employee_id },
    });

    if (!worker) {
        throw new Error('Nhân viên không tồn tại');
    }

    const dependentsCount = input.dependents_count ?? (worker.dependents || 0);

    // Determine tax method based on worker type
    const taxMethodResult = determineTaxMethod(worker, gross_income);

    let result: PITCalculationResult;

    if (taxMethodResult.method === 'PROGRESSIVE') {
        result = await calculateProgressivePIT(
            farmId,
            worker,
            input,
            dependentsCount
        );
    } else {
        result = calculateFlatRatePIT(
            worker,
            input,
            taxMethodResult.method,
            taxMethodResult.reason
        );
    }

    // Save to database
    await savePITCalculation(farmId, result);

    return result;
}

// ==========================================
// DETERMINE TAX METHOD
// ==========================================

interface TaxMethodResult {
    method: 'PROGRESSIVE' | 'FLAT_10' | 'FLAT_20' | 'EXEMPT';
    reason: string;
}

function determineTaxMethod(
    worker: {
        worker_type?: string | null;
        contract_months?: number | null;
        has_commitment_08?: boolean;
        is_non_resident?: boolean;
    },
    grossIncome: number
): TaxMethodResult {
    // 1. Non-resident → 20% flat
    if (worker.is_non_resident) {
        return {
            method: 'FLAT_20',
            reason: 'Người lao động không cư trú tại Việt Nam',
        };
    }

    // 2. Casual/Short-term worker (HĐ < 3 tháng)
    const isCasual = worker.worker_type === 'CASUAL' ||
        worker.worker_type === 'PROBATION' ||
        (worker.contract_months !== null && worker.contract_months !== undefined && worker.contract_months < 3);

    if (isCasual) {
        // Has Commitment 08 → 0%
        if (worker.has_commitment_08) {
            return {
                method: 'EXEMPT',
                reason: 'Có Cam kết 08 (ước tính thu nhập năm < 132 triệu)',
            };
        }

        // Income < 2M → 0%
        if (grossIncome < FLAT_RATE_THRESHOLD) {
            return {
                method: 'EXEMPT',
                reason: `Thu nhập < ${formatMoney(FLAT_RATE_THRESHOLD)}/lần`,
            };
        }

        // Income >= 2M → 10%
        return {
            method: 'FLAT_10',
            reason: 'Lao động thời vụ/HĐ < 3 tháng, thu nhập >= 2 triệu',
        };
    }

    // 3. Full-time with contract >= 3 months → Progressive
    return {
        method: 'PROGRESSIVE',
        reason: 'Hợp đồng lao động >= 3 tháng',
    };
}

// ==========================================
// PROGRESSIVE TAX (7 BRACKETS)
// ==========================================

async function calculateProgressivePIT(
    farmId: string,
    worker: { id: string; name: string; code?: string | null; dependents_count?: number | null },
    input: PITCalculationInput,
    dependentsCount: number
): Promise<PITCalculationResult> {
    const { period, gross_income } = input;

    // Get values from rules (user can override)
    let selfDeduction = SELF_DEDUCTION;
    let dependentDeduction = DEPENDENT_DEDUCTION;
    let insuranceRate = INSURANCE_RATE;

    try {
        selfDeduction = await getRuleValue(farmId, 'PIT_SELF_DEDUCTION');
    } catch { /* use default */ }

    try {
        dependentDeduction = await getRuleValue(farmId, 'PIT_DEPENDENT_DEDUCTION');
    } catch { /* use default */ }

    try {
        insuranceRate = (await getRuleValue(farmId, 'PIT_INSURANCE_RATE')) / 100;
    } catch { /* use default */ }

    // 1. Calculate insurance (BHXH 10.5%)
    const insuranceDeduction = new Decimal(gross_income)
        .times(insuranceRate)
        .toDecimalPlaces(0)
        .toNumber();

    // 2. Self deduction
    const familyDeduction = selfDeduction;

    // 3. Dependent deduction
    const dependentDeductionTotal = dependentsCount * dependentDeduction;

    // 4. Other deduction
    const otherDeduction = input.other_deduction || 0;

    // 5. Total deduction
    const totalDeduction = insuranceDeduction + familyDeduction + dependentDeductionTotal + otherDeduction;

    // 6. Taxable income
    const taxableIncome = Math.max(0, gross_income - totalDeduction);

    // 7. Calculate progressive tax
    const { pitAmount, taxBrackets } = calculateProgressiveTax(taxableIncome);

    // 8. Effective rate
    const effectiveRate = gross_income > 0 ? (pitAmount / gross_income) * 100 : 0;

    return {
        id: '', // Will be set after save
        employee_id: worker.id,
        employee_name: worker.name,
        employee_code: worker.code || undefined,
        period,
        gross_income,
        tax_method: 'PROGRESSIVE',
        tax_method_reason: 'Hợp đồng lao động >= 3 tháng',
        insurance_deduction: insuranceDeduction,
        family_deduction: familyDeduction,
        dependent_deduction: dependentDeductionTotal,
        other_deduction: otherDeduction,
        total_deduction: totalDeduction,
        taxable_income: taxableIncome,
        pit_amount: pitAmount,
        effective_rate: Math.round(effectiveRate * 100) / 100,
        tax_brackets: taxBrackets,
        dependents_count: dependentsCount,
        is_casual: false,
        has_commitment_08: false,
        status: 'CALCULATED',
    };
}

function calculateProgressiveTax(taxableIncome: number): {
    pitAmount: number;
    taxBrackets: TaxBracketDetail[];
} {
    if (taxableIncome <= 0) {
        return { pitAmount: 0, taxBrackets: [] };
    }

    // Method 1: Quick calculation formula
    // Tax = TNTT × rate - quickDeduct
    let bracketIndex = 0;
    for (let i = PIT_BRACKETS.length - 1; i >= 0; i--) {
        if (taxableIncome > PIT_BRACKETS[i].min) {
            bracketIndex = i;
            break;
        }
    }

    const bracket = PIT_BRACKETS[bracketIndex];
    const pitAmount = new Decimal(taxableIncome)
        .times(bracket.rate)
        .minus(bracket.quickDeduct)
        .toDecimalPlaces(0)
        .toNumber();

    // Method 2: Calculate bracket-by-bracket details for UI
    const taxBrackets: TaxBracketDetail[] = [];
    let remainingIncome = taxableIncome;

    for (const b of PIT_BRACKETS) {
        if (remainingIncome <= 0) break;

        const bracketWidth = b.max === Infinity
            ? remainingIncome
            : b.max - b.min;

        const incomeInBracket = Math.min(remainingIncome, bracketWidth);
        const taxInBracket = new Decimal(incomeInBracket)
            .times(b.rate)
            .toDecimalPlaces(0)
            .toNumber();

        if (incomeInBracket > 0) {
            taxBrackets.push({
                bracket: b.bracket,
                range: b.max === Infinity
                    ? `> ${formatMoney(b.min)}`
                    : `${formatMoney(b.min)} - ${formatMoney(b.max)}`,
                rate: b.rate * 100,
                income_in_bracket: incomeInBracket,
                tax_in_bracket: taxInBracket,
            });
        }

        remainingIncome -= incomeInBracket;
    }

    return { pitAmount, taxBrackets };
}

// ==========================================
// FLAT RATE TAX (10%, 20%, 0%)
// ==========================================

function calculateFlatRatePIT(
    worker: { id: string; name: string; code?: string | null; has_commitment_08?: boolean },
    input: PITCalculationInput,
    method: 'FLAT_10' | 'FLAT_20' | 'EXEMPT',
    reason: string
): PITCalculationResult {
    const { period, gross_income } = input;

    let rate = 0;
    if (method === 'FLAT_10') rate = FLAT_RATE_RESIDENT;
    if (method === 'FLAT_20') rate = FLAT_RATE_NON_RESIDENT;

    const pitAmount = new Decimal(gross_income)
        .times(rate)
        .toDecimalPlaces(0)
        .toNumber();

    const effectiveRate = rate * 100;

    return {
        id: '',
        employee_id: worker.id,
        employee_name: worker.name,
        employee_code: worker.code || undefined,
        period,
        gross_income,
        tax_method: method,
        tax_method_reason: reason,
        insurance_deduction: 0,
        family_deduction: 0,
        dependent_deduction: 0,
        other_deduction: 0,
        total_deduction: 0,
        taxable_income: gross_income,
        pit_amount: pitAmount,
        effective_rate: effectiveRate,
        tax_brackets: [],
        dependents_count: 0,
        is_casual: true,
        has_commitment_08: worker.has_commitment_08 || false,
        status: 'CALCULATED',
    };
}

// ==========================================
// SAVE TO DATABASE
// ==========================================

async function savePITCalculation(
    farmId: string,
    result: PITCalculationResult
): Promise<string> {
    const calculation = await prisma.pITCalculation.upsert({
        where: {
            farm_id_employee_id_period: {
                farm_id: farmId,
                employee_id: result.employee_id,
                period: result.period,
            },
        },
        update: {
            gross_income: result.gross_income,
            insurance_deduction: result.insurance_deduction,
            family_deduction: result.family_deduction,
            dependent_deduction: result.dependent_deduction,
            other_deduction: result.other_deduction,
            total_deduction: result.total_deduction,
            taxable_income: result.taxable_income,
            pit_amount: result.pit_amount,
            tax_brackets: JSON.stringify(result.tax_brackets),
            dependents_count: result.dependents_count,
            calculated_at: new Date(),
        },
        create: {
            farm_id: farmId,
            employee_id: result.employee_id,
            period: result.period,
            gross_income: result.gross_income,
            insurance_deduction: result.insurance_deduction,
            family_deduction: result.family_deduction,
            dependent_deduction: result.dependent_deduction,
            other_deduction: result.other_deduction,
            total_deduction: result.total_deduction,
            taxable_income: result.taxable_income,
            pit_amount: result.pit_amount,
            tax_brackets: JSON.stringify(result.tax_brackets),
            dependents_count: result.dependents_count,
            calculated_at: new Date(),
        },
    });

    result.id = calculation.id;
    return calculation.id;
}

// ==========================================
// BATCH CALCULATE (All employees for period)
// ==========================================

export async function calculatePITBatch(
    farmId: string,
    period: string  // "2024-12"
): Promise<PITBatchResult> {
    // Parse period to get year and month
    const [year, month] = period.split('-').map(Number);
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0); // Last day of month

    // Get all payroll items for the period
    const payrolls = await prisma.payroll.findMany({
        where: {
            farm_id: farmId,
            period_start: {
                gte: periodStart,
                lte: periodEnd,
            },
            status: 'CONFIRMED',
        },
        include: {
            items: {
                include: { worker: true },
            },
        },
    });

    // Flatten payroll items
    const payrollItems = payrolls.flatMap(p => p.items);

    const calculations: PITCalculationResult[] = [];
    let totalPit = 0;
    const summary = {
        progressive_count: 0,
        flat_10_count: 0,
        flat_20_count: 0,
        exempt_count: 0,
    };

    for (const item of payrollItems) {
        if (!item.worker) continue;

        const result = await calculatePIT(farmId, {
            employee_id: item.worker_id,
            period,
            gross_income: Number(item.gross_amount || 0),
            dependents_count: item.worker?.dependents || 0,
        });

        calculations.push(result);
        totalPit += result.pit_amount;

        // Update summary
        switch (result.tax_method) {
            case 'PROGRESSIVE':
                summary.progressive_count++;
                break;
            case 'FLAT_10':
                summary.flat_10_count++;
                break;
            case 'FLAT_20':
                summary.flat_20_count++;
                break;
            case 'EXEMPT':
                summary.exempt_count++;
                break;
        }
    }

    return {
        period,
        total_employees: calculations.length,
        total_pit: totalPit,
        calculations,
        summary,
    };
}

// ==========================================
// GET PIT CALCULATION
// ==========================================

export async function getPITCalculation(
    farmId: string,
    employeeId: string,
    period: string
): Promise<PITCalculationResult | null> {
    const calculation = await prisma.pITCalculation.findUnique({
        where: {
            farm_id_employee_id_period: {
                farm_id: farmId,
                employee_id: employeeId,
                period,
            },
        },
        include: {
            employee: true,
        },
    });

    if (!calculation) return null;

    return {
        id: calculation.id,
        employee_id: calculation.employee_id,
        employee_name: calculation.employee?.name || 'Unknown',
        employee_code: calculation.employee?.code || undefined,
        period: calculation.period,
        gross_income: Number(calculation.gross_income),
        tax_method: 'PROGRESSIVE', // Default, should be stored
        insurance_deduction: Number(calculation.insurance_deduction),
        family_deduction: Number(calculation.family_deduction),
        dependent_deduction: Number(calculation.dependent_deduction),
        other_deduction: Number(calculation.other_deduction),
        total_deduction: Number(calculation.total_deduction),
        taxable_income: Number(calculation.taxable_income),
        pit_amount: Number(calculation.pit_amount),
        effective_rate: Number(calculation.gross_income) > 0
            ? (Number(calculation.pit_amount) / Number(calculation.gross_income)) * 100
            : 0,
        tax_brackets: JSON.parse(calculation.tax_brackets as string || '[]'),
        dependents_count: calculation.dependents_count || 0,
        is_casual: false,
        has_commitment_08: false,
        status: 'CALCULATED',
        calculated_at: calculation.calculated_at?.toISOString(),
    };
}

// ==========================================
// LIST PIT CALCULATIONS
// ==========================================

export async function listPITCalculations(
    farmId: string,
    period: string
): Promise<PITCalculationResult[]> {
    const calculations = await prisma.pITCalculation.findMany({
        where: {
            farm_id: farmId,
            period,
        },
        include: {
            employee: true,
        },
        orderBy: {
            employee: { name: 'asc' },
        },
    });

    return calculations.map(calc => ({
        id: calc.id,
        employee_id: calc.employee_id,
        employee_name: calc.employee?.name || 'Unknown',
        employee_code: calc.employee?.code || undefined,
        period: calc.period,
        gross_income: Number(calc.gross_income),
        tax_method: 'PROGRESSIVE' as const,
        insurance_deduction: Number(calc.insurance_deduction),
        family_deduction: Number(calc.family_deduction),
        dependent_deduction: Number(calc.dependent_deduction),
        other_deduction: Number(calc.other_deduction),
        total_deduction: Number(calc.total_deduction),
        taxable_income: Number(calc.taxable_income),
        pit_amount: Number(calc.pit_amount),
        effective_rate: Number(calc.gross_income) > 0
            ? (Number(calc.pit_amount) / Number(calc.gross_income)) * 100
            : 0,
        tax_brackets: JSON.parse(calc.tax_brackets as string || '[]'),
        dependents_count: calc.dependents_count || 0,
        is_casual: false,
        has_commitment_08: false,
        status: 'CALCULATED',
    }));
}

// ==========================================
// HELPERS
// ==========================================

function formatMoney(amount: number): string {
    return new Intl.NumberFormat('vi-VN').format(amount);
}
