// src/types/payroll.ts

import { PayrollStatus, SalaryType, PaymentMethod } from '@prisma/client';

export interface AllowanceItem {
    name: string;
    amount: number;
}

export interface DeductionItem {
    name: string;
    amount: number;
}

export interface PayrollItem {
    id: string;
    payroll_id: string;
    worker_id: string;
    worker?: {
        id: string;
        code: string;
        name: string;
        bank_account?: string | null;
    };

    salary_type: SalaryType;
    base_rate: number;

    work_days: number;
    work_hours: number;

    // OT chi tiết
    ot_normal_hours: number;
    ot_weekend_hours: number;
    ot_holiday_hours: number;
    night_hours: number;

    // Tiền
    base_amount: number;
    ot_normal_amount: number;
    ot_weekend_amount: number;
    ot_holiday_amount: number;
    night_amount: number;

    // Phụ cấp & Khấu trừ
    allowances?: AllowanceItem[] | null;
    total_allowance: number;
    deductions?: DeductionItem[] | null;
    total_deduction: number;

    // BHXH & Thuế
    bhxh_amount: number;
    bhyt_amount: number;
    bhtn_amount: number;
    insurance_amount: number;
    tax_amount: number;

    // Tổng
    gross_amount: number;
    net_amount: number;

    paid_amount: number;
    is_paid: boolean;
    paid_at?: string | null;

    note?: string | null;
}

export interface PayrollPayment {
    id: string;
    amount: number;
    payment_method: PaymentMethod;
    payment_date: string;
    note?: string | null;
    created_at: string;
}

export interface Payroll {
    id: string;
    code: string;

    period_start: string;
    period_end: string;
    period_type: string;

    total_base: number;
    total_ot: number;
    total_allowance: number;
    total_deduction: number;
    total_gross: number;
    total_net: number;

    paid_amount: number;
    remaining_amount: number;
    status: PayrollStatus;

    note?: string | null;
    confirmed_at?: string | null;
    created_at: string;

    items?: PayrollItem[];
    payments?: PayrollPayment[];
    item_count?: number;
}

export interface PayrollListParams {
    page?: number;
    limit?: number;
    status?: PayrollStatus;
    period_from?: string;
    period_to?: string;
    sort_by?: 'period_start' | 'created_at' | 'total_net';
    sort_order?: 'asc' | 'desc';
}

export interface PayrollListResponse {
    items: Payroll[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    summary?: {
        total_gross: number;
        total_net: number;
        total_paid: number;
        total_unpaid: number;
    };
}

export interface CreatePayrollInput {
    period_start: string;
    period_end: string;
    period_type?: string;
    worker_ids?: string[];
    note?: string;
}

export interface UpdatePayrollItemInput {
    allowances?: AllowanceItem[];
    deductions?: DeductionItem[];
    note?: string;
}

export interface PayrollPaymentInput {
    amount: number;
    payment_method?: PaymentMethod;
    payment_date?: string;
    note?: string;
}

export interface InsuranceConfig {
    bhxh_employee_rate: number;
    bhyt_employee_rate: number;
    bhtn_employee_rate: number;
    max_insurance_base: number;
    personal_deduction: number;
    dependent_deduction: number;
    ot_normal_rate: number;
    ot_weekend_rate: number;
    ot_holiday_rate: number;
    night_bonus_rate: number;
}
