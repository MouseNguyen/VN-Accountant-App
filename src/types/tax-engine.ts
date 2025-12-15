// src/types/tax-engine.ts
// Types for Tax Rules Engine - Tax Engine Logic 2025
// Based on: TAX_ENGINE_LOGIC_2025.md

import { TaxRuleType, TaxRuleAction, SupplierStatus, UsagePurpose, ExpenseType, LaborType } from '@prisma/client';

// ==========================================
// TAX RULE
// ==========================================

export interface TaxRule {
    id: string;
    farm_id: string;
    code: string;

    rule_type: TaxRuleType;
    category: string;
    action: TaxRuleAction;

    condition?: RuleCondition | null;

    value: number;
    limit_value?: number;

    name?: string;
    description?: string;
    reference?: string;

    effective_from?: string;
    effective_to?: string;

    original_value?: number;
    is_system: boolean;
    is_overridden: boolean;
    is_active: boolean;

    priority: number;
    master_version?: number;
    synced_at?: string;
}

// ==========================================
// RULE CONDITION (JSON Schema) - Tax Engine 2025
// ==========================================

export interface RuleCondition {
    // ==================== AMOUNT COMPARISONS ====================
    amount_gte?: number;           // Số tiền >= X
    amount_lte?: number;           // Số tiền <= X
    amount_gt?: number;            // Số tiền > X
    amount_lt?: number;            // Số tiền < X

    // ==================== PAYMENT METHOD ====================
    payment_method?: 'CASH' | 'BANK_TRANSFER' | 'CREDIT' | 'MOMO' | 'ZALO_PAY' | 'OTHER';
    payment_method_not?: 'CASH' | 'BANK_TRANSFER' | 'CREDIT' | 'MOMO' | 'ZALO_PAY' | 'OTHER';

    // ==================== VEHICLE RULES (VAT_CAR_LUXURY) ====================
    asset_type?: 'CAR_UNDER_9_SEATS' | 'VEHICLE' | 'MACHINERY' | 'BUILDING' | 'EQUIPMENT';
    vehicle_type?: 'CAR' | 'TRUCK' | 'MOTORCYCLE';
    seats_lt?: number;
    seats_gte?: number;
    original_price_gt?: number;    // Giá gốc > X (1.6B cho xe)
    purchase_price_gt?: number;    // Giá mua > X
    biz_type_not?: string;         // Loại hình KD không phải X (TRANSPORT)

    // ==================== SUPPLIER RULES (VAT_SUPPLIER_STATUS) ====================
    supplier_status_in?: ('ACTIVE' | 'SUSPENDED' | 'CLOSED' | 'BANKRUPT')[];
    supplier_tax_code?: string | null;

    // ==================== BUYER INFO RULES (VAT_INFO_CHECK) ====================
    buyer_tax_code?: string | null;
    buyer_name_mismatch?: boolean;

    // ==================== USAGE PURPOSE RULES (VAT_NON_BIZ) ====================
    usage_purpose?: 'BUSINESS' | 'PERSONAL' | 'WELFARE_FUND';
    fund_source?: 'WELFARE_FUND' | 'BUSINESS';

    // ==================== EXPENSE TYPE RULES (CIT rules) ====================
    expense_type?: 'NORMAL' | 'ADMIN_PENALTY' | 'WELFARE' | 'MATERIALS';

    // ==================== LABOR RULES (CIT_CASUAL_LABOR, PIT) ====================
    labor_type?: 'FULL_TIME' | 'CASUAL' | 'PROBATION' | 'NON_RESIDENT';
    labor_type_in?: ('FULL_TIME' | 'CASUAL' | 'PROBATION' | 'NON_RESIDENT')[];
    has_labor_contract?: boolean;
    has_commitment_08?: boolean;
    pit_withheld?: number;
    estimated_annual_income_lte?: number;
    is_non_resident?: boolean;

    // ==================== INVOICE RULES ====================
    has_valid_invoice?: boolean;
    invoice_age_years_gt?: number;

    // ==================== MATERIALS RULES (CIT_MATERIALS_EXCESS) ====================
    materials_exceed_norms?: boolean;

    // ==================== PIT BRACKET RULES ====================
    bracket?: number;              // Bậc thuế (1-7)
    min_income?: number;           // Thu nhập tối thiểu cho bậc
    max_income?: number;           // Thu nhập tối đa cho bậc
    quick_deduct?: number;         // Công thức tính nhanh (số trừ)

    // ==================== DEPRECIATION RULES ====================
    depreciation_exceeds_tt45?: boolean;

    // ==================== CATEGORY MATCHING ====================
    category_in?: string[];
    category_not_in?: string[];

    // ==================== DATE RULES ====================
    date_before?: string;
    date_after?: string;

    // ==================== LOGICAL OPERATORS ====================
    AND?: RuleCondition[];
    OR?: RuleCondition[];
    NOT?: RuleCondition;
}

// ==========================================
// EVALUATION CONTEXT - Tax Engine 2025
// ==========================================

export interface EvaluationContext {
    // ==================== AMOUNT ====================
    amount?: number;
    total_amount?: number;
    tax_amount?: number;
    vat_amount?: number;

    // ==================== PAYMENT ====================
    payment_method?: string;

    // ==================== INVOICE ====================
    supplier_tax_code?: string;
    invoice_date?: Date;
    invoice_number?: string;
    has_valid_invoice?: boolean;

    // ==================== SUPPLIER - Tax Engine 2025 ====================
    supplier_status?: SupplierStatus;

    // ==================== BUYER INFO - Tax Engine 2025 ====================
    buyer_tax_code?: string;
    buyer_name?: string;
    company_name?: string;
    buyer_name_mismatch?: boolean;

    // ==================== USAGE PURPOSE - Tax Engine 2025 ====================
    usage_purpose?: UsagePurpose;
    fund_source?: string;

    // ==================== EXPENSE TYPE - Tax Engine 2025 ====================
    expense_type?: ExpenseType;

    // ==================== VEHICLE/ASSET ====================
    asset_type?: string;
    vehicle_type?: string;
    seats?: number;
    original_price?: number;
    purchase_price?: number;
    biz_type?: string;
    is_transport_biz?: boolean;

    // ==================== LABOR - Tax Engine 2025 ====================
    labor_type?: LaborType;
    has_labor_contract?: boolean;
    has_commitment_08?: boolean;
    is_non_resident?: boolean;
    pit_withheld?: number;
    estimated_annual_income?: number;

    // ==================== PIT CALCULATION ====================
    gross_income?: number;
    taxable_income?: number;
    dependents_count?: number;
    insurance_deduction?: number;

    // ==================== MATERIALS - Tax Engine 2025 ====================
    materials_exceed_norms?: boolean;
    excess_quantity?: number;
    unit_price?: number;

    // ==================== WELFARE - Tax Engine 2025 ====================
    welfare_type?: string;
    total_welfare_year?: number;
    avg_monthly_salary?: number;

    // ==================== DEPRECIATION ====================
    depreciation_exceeds_tt45?: boolean;
    monthly_depreciation?: number;
    max_deductible_value?: number;

    // ==================== CATEGORY ====================
    category?: string;
    trans_type?: string;

    // ==================== DATE ====================
    current_date?: Date;

    // ==================== CUSTOM DATA ====================
    [key: string]: unknown;
}

// ==========================================
// RULE RESULT
// ==========================================

export interface RuleEvaluationResult {
    rule_id: string;
    rule_code: string;

    is_applicable: boolean;     // Rule có áp dụng được không
    is_passed: boolean;         // Có vượt qua điều kiện không

    action: TaxRuleAction;

    // Kết quả
    result_value?: number;
    message: string;

    // Chi tiết
    details?: {
        condition_met: boolean;
        exceeded_amount?: number;
        limit?: number;
        deductible_amount?: number;  // For PARTIAL action
        addback_amount?: number;     // For CIT ADD_BACK
    };
}

export interface RuleEngineResult {
    is_allowed: boolean;

    applied_rules: RuleEvaluationResult[];
    errors: string[];
    warnings: string[];

    final_value?: number;
    adjustments?: number;

    // Tax Engine 2025: Dual status
    vat_deductible?: boolean;
    vat_deductible_amount?: number;
    cit_deductible?: boolean;
    cit_addback_amount?: number;
}

// ==========================================
// VAT VALIDATION RESULT - Tax Engine 2025
// ==========================================

export interface VATValidationResult {
    is_deductible: boolean;
    rejection_code?: string;      // VAT_NON_CASH, VAT_CAR_LUXURY, etc.
    rejection_reason?: string;
    deductible_amount?: number;   // For PARTIAL (1.6B cap)
    original_amount: number;
    warnings: string[];
}

// ==========================================
// CIT ADDBACK RESULT - Tax Engine 2025
// ==========================================

export interface CITAddbackResult {
    is_deductible: boolean;
    addback_code?: string;        // CIT_PENALTY, CIT_WELFARE_CAP, etc.
    addback_reason?: string;
    addback_amount: number;
    original_amount: number;
    details?: {
        category: string;
        calculation: string;
    };
}

// ==========================================
// PIT CALCULATION RESULT - Tax Engine 2025
// ==========================================

export interface PITCalculationResult {
    gross_income: number;

    // Deductions
    insurance_deduction: number;    // 10.5%
    self_deduction: number;         // 11,000,000
    dependent_deduction: number;    // 4,400,000 × n

    taxable_income: number;

    // Tax calculation
    pit_amount: number;
    effective_rate: number;

    // Breakdown by brackets
    brackets: PITBracketDetail[];

    // Flat rate info (if applicable)
    is_flat_rate: boolean;
    flat_rate?: number;             // 0%, 10%, or 20%
    flat_rate_code?: string;        // PIT_FLAT_0, PIT_FLAT_10, PIT_COMMITMENT_08, PIT_FLAT_20
}

export interface PITBracketDetail {
    bracket: number;          // 1-7
    min_income: number;
    max_income: number | null;
    rate: number;             // 5%, 10%, 15%, 20%, 25%, 30%, 35%
    taxable_in_bracket: number;
    tax_in_bracket: number;
}

// ==========================================
// MASTER JSON FORMAT
// ==========================================

export interface TaxRulesMaster {
    version: number;           // 20251215
    effective_date: string;    // "2025-12-15"
    rules: MasterRule[];
}

export interface MasterRule {
    code: string;
    rule_type: string;
    category: string;
    action: string;
    value: number;
    limit_value?: number;
    priority?: number;
    condition?: RuleCondition;
    description: string;
    reference?: string;
    effective_from: string;
}

// ==========================================
// API RESPONSE TYPES
// ==========================================

export interface TaxRulesGrouped {
    [ruleType: string]: TaxRule[];
}

export interface UpdateRuleRequest {
    value: number;
}

export interface RuleHistoryEntry {
    id: string;
    action: string;
    old_value: number | null;
    new_value: number | null;
    note?: string;
    created_at: string;
    created_by?: string;
}

// ==========================================
// TRANSACTION TAX STATUS - Tax Engine 2025
// ==========================================

export interface TransactionTaxStatus {
    // VAT Status
    vat_deductible: boolean;
    vat_rejection_code?: string;
    vat_rejection_reason?: string;
    vat_deductible_amount?: number;

    // CIT Status
    cit_deductible: boolean;
    cit_addback_amount: number;
    cit_addback_reason?: string;

    // Dual Status
    accounting_expense: boolean;  // Reflected in P&L
    tax_expense: boolean;         // Deductible for tax
}

// ==========================================
// WORKER TAX STATUS - Tax Engine 2025
// ==========================================

export interface WorkerTaxInfo {
    labor_type: LaborType;
    has_commitment_08: boolean;
    commitment_08_date?: Date;
    commitment_08_file?: string;
    is_non_resident: boolean;
    dependents: number;
    estimated_annual_income?: number;
}
