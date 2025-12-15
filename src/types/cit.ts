// src/types/cit.ts
// CIT Calculation Types - Task 4

export interface CITCalculationInput {
    period: string;           // "2024-Q4" hoặc "2024"
    period_type: 'QUARTERLY' | 'ANNUAL';
}

export interface CITCalculationResult {
    id: string;
    period: string;
    period_type: string;

    // Thu nhập
    total_revenue: number;
    other_income: number;

    // Chi phí
    total_expenses: number;

    // Lợi nhuận kế toán
    accounting_profit: number;

    // Điều chỉnh
    add_backs: number;
    deductions: number;

    adjustments: CITAdjustmentItem[];

    // Kết quả
    taxable_income: number;
    tax_rate: number;
    cit_amount: number;

    // Loss
    loss_carried: number;

    status: string;
    calculated_at?: string;
}

export interface CITAdjustmentItem {
    id: string;
    adjustment_type: 'ADD_BACK' | 'DEDUCTION';
    category: string;
    category_label: string;
    rule_code: string;
    description: string;
    amount: number;
    transaction_id?: string;
    transaction_code?: string;
    reference?: string;
}

export interface CITAddBacksResult {
    items: CITAdjustmentItem[];
    total: number;

    by_category: Array<{
        category: string;
        label: string;
        amount: number;
        count: number;
        rule_code: string;
    }>;
}

// Category descriptions
export const CIT_CATEGORY_LABELS: Record<string, string> = {
    ADMIN_PENALTY: 'Tiền phạt hành chính',
    WELFARE_EXCESS: 'Phúc lợi vượt mức',
    ENTERTAINMENT_EXCESS: 'Tiếp khách vượt mức',
    CASH_OVER_LIMIT: 'Chi tiền mặt >= 20 triệu không HĐ',
    CASUAL_LABOR_NO_PIT: 'Lương thời vụ không khấu trừ PIT',
    NO_INVOICE: 'Chi phí không có hóa đơn',
    DEPRECIATION_EXCESS: 'Khấu hao vượt mức',
    MATERIALS_EXCESS: 'NVL vượt định mức',
    OTHER_NON_DEDUCTIBLE: 'Chi phí không được trừ khác',
};
