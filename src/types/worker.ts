// src/types/worker.ts

import { WorkerType, WorkerStatus, SalaryType } from '@prisma/client';

export interface Worker {
    id: string;
    code: string;
    name: string;
    phone?: string | null;
    id_card?: string | null;
    address?: string | null;
    date_of_birth?: string | null;

    worker_type: WorkerType;
    status: WorkerStatus;
    position?: string | null;
    start_date: string;
    end_date?: string | null;

    salary_type: SalaryType;
    base_salary: number;

    // BHXH & Thuế
    tax_code?: string | null;
    dependents: number;
    insurance_base?: number | null;
    is_subject_to_tax: boolean;

    // Quỹ phép
    annual_leave_days: number;
    annual_leave_used: number;
    annual_leave_remaining: number;
    sick_leave_days: number;
    sick_leave_used: number;
    sick_leave_remaining: number;

    bank_name?: string | null;
    bank_account?: string | null;
    bank_holder?: string | null;

    note?: string | null;
    created_at: string;
    updated_at: string;
}

export interface WorkerListParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: WorkerStatus;
    worker_type?: WorkerType;
    sort_by?: 'name' | 'code' | 'start_date' | 'base_salary';
    sort_order?: 'asc' | 'desc';
}

export interface WorkerListResponse {
    items: Worker[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    summary: {
        total_active: number;
        total_inactive: number;
        by_type: {
            full_time: number;
            part_time: number;
            seasonal: number;
        };
    };
}

export interface CreateWorkerInput {
    name: string;
    phone?: string;
    id_card?: string;
    address?: string;
    date_of_birth?: string;
    worker_type?: WorkerType;
    position?: string;
    start_date?: string;
    salary_type?: SalaryType;
    base_salary?: number;
    tax_code?: string;
    dependents?: number;
    insurance_base?: number;
    is_subject_to_tax?: boolean;
    annual_leave_days?: number;
    bank_name?: string;
    bank_account?: string;
    bank_holder?: string;
    note?: string;
}

export interface UpdateWorkerInput extends Partial<CreateWorkerInput> {
    status?: WorkerStatus;
    end_date?: string;
}
