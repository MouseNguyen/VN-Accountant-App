// src/services/attendance.service.ts
import prisma, { prismaBase } from '@/lib/prisma';
import { getCurrentFarmId, getContext } from '@/lib/context';
import { createAuditLog } from './audit-log.service';
import type { AttendanceQueryInput, CreateAttendanceInput, BulkAttendanceInput } from '@/lib/validations/attendance';
import type { Attendance, AttendanceListResponse, AttendanceSummary } from '@/types/attendance';
import { AttendanceType } from '@prisma/client';

/**
 * Format attendance từ DB sang API response
 */
function formatAttendance(a: any): Attendance {
    return {
        id: a.id,
        worker_id: a.worker_id,
        worker: a.worker,
        work_date: a.work_date.toISOString().split('T')[0],
        attendance_type: a.attendance_type,
        check_in: a.check_in?.toISOString() || null,
        check_out: a.check_out?.toISOString() || null,
        work_hours: Number(a.work_hours),
        ot_normal_hours: Number(a.ot_normal_hours),
        ot_weekend_hours: Number(a.ot_weekend_hours),
        ot_holiday_hours: Number(a.ot_holiday_hours),
        night_hours: Number(a.night_hours),
        total_ot_hours: Number(a.ot_normal_hours) + Number(a.ot_weekend_hours) + Number(a.ot_holiday_hours),
        note: a.note,
        created_at: a.created_at.toISOString(),
    };
}

/**
 * Kiểm tra attendance có bị khóa bởi Payroll đã xác nhận không
 */
async function checkAttendanceLocked(farmId: string, workDate: Date): Promise<void> {
    const lockedPayroll = await prisma.payroll.findFirst({
        where: {
            farm_id: farmId,
            status: { in: ['CONFIRMED', 'PARTIAL_PAID', 'PAID'] },
            period_start: { lte: workDate },
            period_end: { gte: workDate },
        },
        select: { code: true, status: true },
    });

    if (lockedPayroll) {
        throw new Error(
            `Không thể sửa/xóa chấm công! Bảng lương ${lockedPayroll.code} (${lockedPayroll.status}) đã xác nhận cho kỳ này.`
        );
    }
}

/**
 * Lấy danh sách chấm công
 */
export async function getAttendances(params: AttendanceQueryInput): Promise<AttendanceListResponse> {
    const farmId = getCurrentFarmId();
    const { worker_id, date_from, date_to, attendance_type, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: any = { farm_id: farmId };
    if (worker_id) where.worker_id = worker_id;
    if (attendance_type) where.attendance_type = attendance_type;
    if (date_from || date_to) {
        where.work_date = {};
        if (date_from) where.work_date.gte = new Date(date_from);
        if (date_to) where.work_date.lte = new Date(date_to);
    }

    const [items, total, summaryData] = await Promise.all([
        prisma.attendance.findMany({
            where,
            orderBy: { work_date: 'desc' },
            skip,
            take: limit,
            include: {
                worker: { select: { id: true, code: true, name: true } },
            },
        }),
        prisma.attendance.count({ where }),
        prisma.attendance.aggregate({
            where,
            _sum: {
                work_hours: true,
                ot_normal_hours: true,
                ot_weekend_hours: true,
                ot_holiday_hours: true,
                night_hours: true,
            },
            _count: true,
        }),
    ]);

    // Đếm theo loại
    const byTypeData = await prisma.attendance.groupBy({
        by: ['attendance_type'],
        where,
        _count: true,
    });

    const byType: Record<AttendanceType, number> = {
        NORMAL: 0,
        PRESENT: 0,
        OVERTIME: 0,
        HALF_DAY: 0,
        ABSENT: 0,
        SICK_LEAVE: 0,
        ANNUAL_LEAVE: 0,
        HOLIDAY: 0,
        LATE: 0,
        EARLY_LEAVE: 0,
    };
    byTypeData.forEach((t) => {
        byType[t.attendance_type] = t._count;
    });

    return {
        items: items.map(formatAttendance),
        total,
        page,
        limit,
        hasMore: skip + items.length < total,
        summary: {
            total_days: summaryData._count,
            total_hours: Number(summaryData._sum.work_hours || 0),
            ot_normal_hours: Number(summaryData._sum.ot_normal_hours || 0),
            ot_weekend_hours: Number(summaryData._sum.ot_weekend_hours || 0),
            ot_holiday_hours: Number(summaryData._sum.ot_holiday_hours || 0),
            night_hours: Number(summaryData._sum.night_hours || 0),
            by_type: byType,
        },
    };
}

/**
 * Tạo chấm công đơn lẻ (có kiểm tra quỹ phép)
 */
export async function createAttendance(input: CreateAttendanceInput): Promise<Attendance> {
    const farmId = getCurrentFarmId();
    const context = getContext();

    // Kiểm tra worker
    const worker = await prisma.worker.findFirst({
        where: { id: input.worker_id, farm_id: farmId, status: 'ACTIVE', deleted_at: null },
    });

    if (!worker) {
        throw new Error('Không tìm thấy nhân viên hoặc nhân viên không còn làm việc');
    }

    // Kiểm tra quỹ phép năm
    if (input.attendance_type === 'ANNUAL_LEAVE') {
        const remaining = Number(worker.annual_leave_days) - Number(worker.annual_leave_used);
        if (remaining < 1) {
            throw new Error(`Nhân viên ${worker.name} đã hết phép năm! Còn lại: ${remaining} ngày.`);
        }
    }

    // Kiểm tra đã chấm công ngày này chưa
    const existing = await prisma.attendance.findUnique({
        where: {
            farm_id_worker_id_work_date: {
                farm_id: farmId,
                worker_id: input.worker_id,
                work_date: new Date(input.work_date),
            },
        },
    });

    if (existing) {
        throw new Error(`Nhân viên ${worker.name} đã được chấm công ngày ${input.work_date}`);
    }

    // Transaction để tạo attendance và trừ quỹ phép
    return prismaBase.$transaction(async (tx) => {
        const attendance = await tx.attendance.create({
            data: {
                farm_id: farmId,
                worker_id: input.worker_id,
                work_date: new Date(input.work_date),
                attendance_type: input.attendance_type || 'NORMAL',
                check_in: input.check_in ? new Date(input.check_in) : null,
                check_out: input.check_out ? new Date(input.check_out) : null,
                work_hours: input.work_hours ?? 8,
                ot_normal_hours: input.ot_normal_hours ?? 0,
                ot_weekend_hours: input.ot_weekend_hours ?? 0,
                ot_holiday_hours: input.ot_holiday_hours ?? 0,
                night_hours: input.night_hours ?? 0,
                note: input.note || null,
                created_by: context?.userId || null,
            },
            include: {
                worker: { select: { id: true, code: true, name: true } },
            },
        });

        // Trừ quỹ phép nếu là nghỉ phép
        if (input.attendance_type === 'ANNUAL_LEAVE') {
            await tx.worker.update({
                where: { id: input.worker_id },
                data: { annual_leave_used: { increment: 1 } },
            });
        }

        if (input.attendance_type === 'SICK_LEAVE') {
            await tx.worker.update({
                where: { id: input.worker_id },
                data: { sick_leave_used: { increment: 1 } },
            });
        }

        return formatAttendance(attendance);
    });
}

/**
 * Cập nhật chấm công (có kiểm tra khóa)
 */
export async function updateAttendance(id: string, input: Partial<CreateAttendanceInput>): Promise<Attendance> {
    const farmId = getCurrentFarmId();

    const existing = await prisma.attendance.findFirst({
        where: { id, farm_id: farmId },
    });

    if (!existing) {
        throw new Error('Không tìm thấy bản ghi chấm công');
    }

    // Kiểm tra khóa
    await checkAttendanceLocked(farmId, existing.work_date);

    const updateData: any = {};
    if (input.attendance_type !== undefined) updateData.attendance_type = input.attendance_type;
    if (input.check_in !== undefined) updateData.check_in = input.check_in ? new Date(input.check_in) : null;
    if (input.check_out !== undefined) updateData.check_out = input.check_out ? new Date(input.check_out) : null;
    if (input.work_hours !== undefined) updateData.work_hours = input.work_hours;
    if (input.ot_normal_hours !== undefined) updateData.ot_normal_hours = input.ot_normal_hours;
    if (input.ot_weekend_hours !== undefined) updateData.ot_weekend_hours = input.ot_weekend_hours;
    if (input.ot_holiday_hours !== undefined) updateData.ot_holiday_hours = input.ot_holiday_hours;
    if (input.night_hours !== undefined) updateData.night_hours = input.night_hours;
    if (input.note !== undefined) updateData.note = input.note;

    const attendance = await prisma.attendance.update({
        where: { id },
        data: updateData,
        include: {
            worker: { select: { id: true, code: true, name: true } },
        },
    });

    return formatAttendance(attendance);
}

/**
 * Xóa chấm công (có kiểm tra khóa và hoàn phép)
 */
export async function deleteAttendance(id: string): Promise<void> {
    const farmId = getCurrentFarmId();

    const existing = await prisma.attendance.findFirst({
        where: { id, farm_id: farmId },
        include: { worker: true },
    });

    if (!existing) {
        throw new Error('Không tìm thấy bản ghi chấm công');
    }

    // Kiểm tra khóa
    await checkAttendanceLocked(farmId, existing.work_date);

    // Transaction để xóa và hoàn phép
    await prismaBase.$transaction(async (tx) => {
        // Hoàn lại quỹ phép nếu cần
        if (existing.attendance_type === 'ANNUAL_LEAVE') {
            await tx.worker.update({
                where: { id: existing.worker_id },
                data: { annual_leave_used: { decrement: 1 } },
            });
        }

        if (existing.attendance_type === 'SICK_LEAVE' && Number(existing.worker.sick_leave_used) > 0) {
            await tx.worker.update({
                where: { id: existing.worker_id },
                data: { sick_leave_used: { decrement: 1 } },
            });
        }

        await tx.attendance.delete({ where: { id } });
    });

    await createAuditLog({
        action: 'DELETE',
        entityType: 'Attendance',
        entityId: id,
        description: `Xóa chấm công ${existing.worker.code} ngày ${existing.work_date.toISOString().split('T')[0]}`,
    });
}

/**
 * Chấm công hàng loạt (upsert)
 */
export async function bulkCreateAttendance(input: BulkAttendanceInput): Promise<{
    success_count: number;
    total: number;
    results: Array<{ worker_id: string; success: boolean; error?: string }>;
}> {
    const farmId = getCurrentFarmId();
    const context = getContext();
    const workDate = new Date(input.work_date);

    const results: Array<{ worker_id: string; success: boolean; error?: string }> = [];

    for (const att of input.attendances) {
        try {
            // Kiểm tra worker exists
            const worker = await prisma.worker.findFirst({
                where: { id: att.worker_id, farm_id: farmId, status: 'ACTIVE', deleted_at: null },
            });

            if (!worker) {
                results.push({ worker_id: att.worker_id, success: false, error: 'Không tìm thấy nhân viên' });
                continue;
            }

            // Upsert - tạo mới hoặc cập nhật
            await prisma.attendance.upsert({
                where: {
                    farm_id_worker_id_work_date: {
                        farm_id: farmId,
                        worker_id: att.worker_id,
                        work_date: workDate,
                    },
                },
                create: {
                    farm_id: farmId,
                    worker_id: att.worker_id,
                    work_date: workDate,
                    attendance_type: att.attendance_type || 'NORMAL',
                    work_hours: att.work_hours ?? 8,
                    ot_normal_hours: att.ot_normal_hours ?? 0,
                    ot_weekend_hours: att.ot_weekend_hours ?? 0,
                    ot_holiday_hours: att.ot_holiday_hours ?? 0,
                    night_hours: att.night_hours ?? 0,
                    note: att.note || null,
                    created_by: context?.userId || null,
                },
                update: {
                    attendance_type: att.attendance_type || 'NORMAL',
                    work_hours: att.work_hours ?? 8,
                    ot_normal_hours: att.ot_normal_hours ?? 0,
                    ot_weekend_hours: att.ot_weekend_hours ?? 0,
                    ot_holiday_hours: att.ot_holiday_hours ?? 0,
                    night_hours: att.night_hours ?? 0,
                    note: att.note || null,
                },
            });

            results.push({ worker_id: att.worker_id, success: true });
        } catch (err: any) {
            results.push({ worker_id: att.worker_id, success: false, error: err.message });
        }
    }

    const successCount = results.filter((r) => r.success).length;

    await createAuditLog({
        action: 'CREATE',
        entityType: 'Attendance',
        entityId: input.work_date,
        description: `Chấm công ngày ${input.work_date}: ${successCount}/${input.attendances.length} nhân viên`,
    });

    return { success_count: successCount, total: input.attendances.length, results };
}

/**
 * Lấy tổng hợp chấm công theo worker trong khoảng thời gian (cho tính lương)
 */
export async function getAttendanceSummary(params: {
    worker_ids?: string[];
    date_from: string;
    date_to: string;
}): Promise<AttendanceSummary[]> {
    const farmId = getCurrentFarmId();

    const where: any = {
        farm_id: farmId,
        work_date: {
            gte: new Date(params.date_from),
            lte: new Date(params.date_to),
        },
        attendance_type: { in: ['NORMAL', 'OVERTIME', 'HALF_DAY', 'HOLIDAY'] },
    };

    if (params.worker_ids && params.worker_ids.length > 0) {
        where.worker_id = { in: params.worker_ids };
    }

    const result = await prisma.attendance.groupBy({
        by: ['worker_id'],
        where,
        _sum: {
            work_hours: true,
            ot_normal_hours: true,
            ot_weekend_hours: true,
            ot_holiday_hours: true,
            night_hours: true,
        },
        _count: true,
    });

    return result.map((r) => ({
        worker_id: r.worker_id,
        total_days: r._count,
        total_hours: Number(r._sum.work_hours || 0),
        ot_normal_hours: Number(r._sum.ot_normal_hours || 0),
        ot_weekend_hours: Number(r._sum.ot_weekend_hours || 0),
        ot_holiday_hours: Number(r._sum.ot_holiday_hours || 0),
        night_hours: Number(r._sum.night_hours || 0),
    }));
}
