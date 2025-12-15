// src/lib/validations/attendance.ts
import { z } from 'zod';

// AttendanceType enum values (matching Prisma schema - Phase 1 Task 7)
const AttendanceTypes = [
    'NORMAL',
    'PRESENT',
    'OVERTIME',
    'HALF_DAY',
    'ABSENT',
    'SICK_LEAVE',
    'ANNUAL_LEAVE',
    'HOLIDAY',
    'LATE',
    'EARLY_LEAVE'
] as const;

export const attendanceQuerySchema = z.object({
    worker_id: z.string().uuid().optional(),
    date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    attendance_type: z.enum(AttendanceTypes).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const createAttendanceSchema = z.object({
    worker_id: z.string().uuid('ID nhân viên không hợp lệ'),

    work_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ'),

    attendance_type: z.enum(AttendanceTypes).default('NORMAL'),

    check_in: z.string().datetime().optional(),
    check_out: z.string().datetime().optional(),

    work_hours: z
        .number()
        .min(0, 'Số giờ không được âm')
        .max(24, 'Số giờ tối đa là 24')
        .default(8),

    // OT tách loại
    ot_normal_hours: z
        .number()
        .min(0)
        .max(12, 'OT tối đa 12 giờ')
        .default(0),

    ot_weekend_hours: z
        .number()
        .min(0)
        .max(12)
        .default(0),

    ot_holiday_hours: z
        .number()
        .min(0)
        .max(12)
        .default(0),

    night_hours: z
        .number()
        .min(0)
        .max(8)
        .default(0),

    note: z.string().max(500).optional(),
});

export const bulkAttendanceSchema = z.object({
    work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

    attendances: z
        .array(
            z.object({
                worker_id: z.string().uuid(),
                attendance_type: z.enum(AttendanceTypes).default('NORMAL'),
                work_hours: z.number().min(0).max(24).default(8),
                ot_normal_hours: z.number().min(0).max(12).default(0),
                ot_weekend_hours: z.number().min(0).max(12).default(0),
                ot_holiday_hours: z.number().min(0).max(12).default(0),
                night_hours: z.number().min(0).max(8).default(0),
                note: z.string().max(500).optional(),
            })
        )
        .min(1, 'Phải có ít nhất 1 nhân viên')
        .max(100, 'Tối đa 100 nhân viên'),
});

export type AttendanceQueryInput = z.infer<typeof attendanceQuerySchema>;
export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;
export type BulkAttendanceInput = z.infer<typeof bulkAttendanceSchema>;
