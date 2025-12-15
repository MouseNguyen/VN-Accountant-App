// src/lib/validations/worker.ts
import { z } from 'zod';

// Inline enums to avoid Prisma client export issues
const WorkerTypes = ['FULL_TIME', 'PART_TIME', 'SEASONAL', 'CONTRACT'] as const;
const WorkerStatuses = ['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE'] as const;
const SalaryTypes = ['MONTHLY', 'DAILY', 'HOURLY', 'PIECE'] as const;

const MAX_SALARY = 999_999_999;

export const workerQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    status: z.enum(WorkerStatuses).optional(),
    worker_type: z.enum(WorkerTypes).optional(),
    sort_by: z.enum(['name', 'code', 'start_date', 'base_salary']).default('name'),
    sort_order: z.enum(['asc', 'desc']).default('asc'),
});

export const createWorkerSchema = z.object({
    name: z
        .string()
        .min(2, 'Tên phải có ít nhất 2 ký tự')
        .max(100, 'Tên quá dài'),

    phone: z
        .string()
        .regex(/^[0-9]{10,12}$/, 'Số điện thoại phải từ 10-12 số')
        .optional()
        .or(z.literal(''))
        .transform(v => v || undefined),

    id_card: z
        .string()
        .regex(/^[0-9]{9,12}$/, 'Số CCCD/CMND không hợp lệ')
        .optional()
        .or(z.literal('')),

    address: z.string().max(500).optional(),

    date_of_birth: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),

    worker_type: z.enum(WorkerTypes).default('FULL_TIME'),

    position: z.string().max(100).optional(),

    start_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .default(() => new Date().toISOString().split('T')[0]),

    salary_type: z.enum(SalaryTypes).default('MONTHLY'),

    base_salary: z
        .number()
        .min(0, 'Lương không được âm')
        .max(MAX_SALARY, 'Lương quá lớn')
        .default(0),

    // BHXH & Thuế
    tax_code: z.string().max(20).optional(),
    dependents: z.number().int().min(0).max(10).default(0),
    insurance_base: z.number().min(0).max(MAX_SALARY).optional(),
    is_subject_to_tax: z.boolean().default(true),

    // Phép
    annual_leave_days: z.number().min(0).max(30).default(12),

    bank_name: z.string().max(100).optional(),
    bank_account: z.string().max(50).optional(),
    bank_holder: z.string().max(100).optional(),

    note: z.string().max(1000).optional(),
});

export const updateWorkerSchema = createWorkerSchema.partial().extend({
    status: z.enum(WorkerStatuses).optional(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type WorkerQueryInput = z.infer<typeof workerQuerySchema>;
export type CreateWorkerInput = z.infer<typeof createWorkerSchema>;
export type UpdateWorkerInput = z.infer<typeof updateWorkerSchema>;
