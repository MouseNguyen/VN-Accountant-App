// src/types/attendance.ts

import { AttendanceType } from '@prisma/client';

export interface Attendance {
    id: string;
    worker_id: string;
    worker?: {
        id: string;
        code: string;
        name: string;
    };

    work_date: string;
    attendance_type: AttendanceType;

    check_in?: string | null;
    check_out?: string | null;
    work_hours: number;

    // OT tách loại
    ot_normal_hours: number;
    ot_weekend_hours: number;
    ot_holiday_hours: number;
    night_hours: number;

    // Computed
    total_ot_hours: number;

    note?: string | null;
    created_at: string;
}

export interface AttendanceListParams {
    worker_id?: string;
    date_from?: string;
    date_to?: string;
    attendance_type?: AttendanceType;
    page?: number;
    limit?: number;
}

export interface AttendanceListResponse {
    items: Attendance[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    summary: {
        total_days: number;
        total_hours: number;
        ot_normal_hours: number;
        ot_weekend_hours: number;
        ot_holiday_hours: number;
        night_hours: number;
        by_type: Record<AttendanceType, number>;
    };
}

export interface CreateAttendanceInput {
    worker_id: string;
    work_date: string;
    attendance_type?: AttendanceType;
    check_in?: string;
    check_out?: string;
    work_hours?: number;
    ot_normal_hours?: number;
    ot_weekend_hours?: number;
    ot_holiday_hours?: number;
    night_hours?: number;
    note?: string;
}

export interface BulkAttendanceInput {
    work_date: string;
    attendances: Array<{
        worker_id: string;
        attendance_type?: AttendanceType;
        work_hours?: number;
        ot_normal_hours?: number;
        ot_weekend_hours?: number;
        ot_holiday_hours?: number;
        night_hours?: number;
        note?: string;
    }>;
}

export interface AttendanceSummary {
    worker_id: string;
    total_days: number;
    total_hours: number;
    ot_normal_hours: number;
    ot_weekend_hours: number;
    ot_holiday_hours: number;
    night_hours: number;
}
