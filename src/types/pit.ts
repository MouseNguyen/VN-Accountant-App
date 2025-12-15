// src/types/pit.ts
// PIT Calculation Types - Task 7

export interface PITCalculationInput {
    employee_id: string;
    period: string;              // "2024-12"
    gross_income: number;
    dependents_count?: number;
    other_deduction?: number;
}

export interface PITCalculationResult {
    id: string;
    employee_id: string;
    employee_name: string;
    employee_code?: string;
    period: string;

    // Income
    gross_income: number;

    // Tax method
    tax_method: 'PROGRESSIVE' | 'FLAT_10' | 'FLAT_20' | 'EXEMPT';
    tax_method_reason?: string;

    // Deductions (only for progressive)
    insurance_deduction: number;
    family_deduction: number;
    dependent_deduction: number;
    other_deduction: number;
    total_deduction: number;

    // Tax calculation
    taxable_income: number;
    pit_amount: number;
    effective_rate: number;      // Actual % of gross

    // Bracket details (for progressive)
    tax_brackets: TaxBracketDetail[];

    // Worker info
    dependents_count: number;
    is_casual: boolean;
    has_commitment_08: boolean;

    // Status
    status: string;
    calculated_at?: string;
}

export interface TaxBracketDetail {
    bracket: number;
    range: string;
    rate: number;                // As percentage (5, 10, 15...)
    income_in_bracket: number;
    tax_in_bracket: number;
}

export interface PITBatchResult {
    period: string;
    total_employees: number;
    total_pit: number;
    calculations: PITCalculationResult[];
    summary: {
        progressive_count: number;
        flat_10_count: number;
        flat_20_count: number;
        exempt_count: number;
    };
}
