// src/services/worker.service.ts
import prisma from '@/lib/prisma';
import { getCurrentFarmId } from '@/lib/context';
import { createAuditLog } from './audit-log.service';
import type { WorkerQueryInput, CreateWorkerInput, UpdateWorkerInput } from '@/lib/validations/worker';
import type { Worker, WorkerListResponse } from '@/types/worker';

/**
 * Tạo mã nhân viên tự động (NV001, NV002...)
 */
async function generateWorkerCode(farmId: string): Promise<string> {
    const lastWorker = await prisma.worker.findFirst({
        where: { farm_id: farmId },
        orderBy: { code: 'desc' },
        select: { code: true },
    });

    let seq = 1;
    if (lastWorker?.code) {
        const match = lastWorker.code.match(/^NV(\d+)$/);
        if (match) {
            seq = parseInt(match[1], 10) + 1;
        }
    }

    return `NV${seq.toString().padStart(3, '0')}`;
}

/**
 * Format worker từ DB sang API response
 */
function formatWorker(w: any): Worker {
    return {
        id: w.id,
        code: w.code,
        name: w.name,
        phone: w.phone,
        id_card: w.id_card,
        address: w.address,
        date_of_birth: w.date_of_birth?.toISOString().split('T')[0] || null,
        worker_type: w.worker_type,
        status: w.status,
        position: w.position,
        start_date: w.start_date.toISOString().split('T')[0],
        end_date: w.end_date?.toISOString().split('T')[0] || null,
        salary_type: w.salary_type,
        base_salary: Number(w.base_salary),
        tax_code: w.tax_code,
        dependents: w.dependents,
        insurance_base: w.insurance_base ? Number(w.insurance_base) : null,
        is_subject_to_tax: w.is_subject_to_tax,
        annual_leave_days: Number(w.annual_leave_days),
        annual_leave_used: Number(w.annual_leave_used),
        annual_leave_remaining: Number(w.annual_leave_days) - Number(w.annual_leave_used),
        sick_leave_days: Number(w.sick_leave_days),
        sick_leave_used: Number(w.sick_leave_used),
        sick_leave_remaining: Number(w.sick_leave_days) - Number(w.sick_leave_used),
        bank_name: w.bank_name,
        bank_account: w.bank_account,
        bank_holder: w.bank_holder,
        note: w.note,
        created_at: w.created_at.toISOString(),
        updated_at: w.updated_at.toISOString(),
    };
}

/**
 * Lấy danh sách nhân viên
 */
export async function getWorkers(params: WorkerQueryInput): Promise<WorkerListResponse> {
    const farmId = getCurrentFarmId();
    const { page, limit, search, status, worker_type, sort_by, sort_order } = params;
    const skip = (page - 1) * limit;

    const where: any = { farm_id: farmId, deleted_at: null };
    if (status) where.status = status;
    if (worker_type) where.worker_type = worker_type;
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search.toUpperCase(), mode: 'insensitive' } },
            { phone: { contains: search } },
        ];
    }

    const [items, total, summary] = await Promise.all([
        prisma.worker.findMany({
            where,
            orderBy: { [sort_by]: sort_order },
            skip,
            take: limit
        }),
        prisma.worker.count({ where }),
        prisma.worker.groupBy({
            by: ['status', 'worker_type'],
            where: { farm_id: farmId, deleted_at: null },
            _count: true,
        }),
    ]);

    // Tính summary
    let totalActive = 0, totalInactive = 0;
    const byType = { full_time: 0, part_time: 0, seasonal: 0 };

    summary.forEach((s) => {
        if (s.status === 'ACTIVE') {
            totalActive += s._count;
            const key = s.worker_type.toLowerCase() as keyof typeof byType;
            if (key in byType) byType[key] += s._count;
        } else {
            totalInactive += s._count;
        }
    });

    return {
        items: items.map(formatWorker),
        total,
        page,
        limit,
        hasMore: skip + items.length < total,
        summary: {
            total_active: totalActive,
            total_inactive: totalInactive,
            by_type: byType
        },
    };
}

/**
 * Lấy chi tiết nhân viên
 */
export async function getWorker(id: string): Promise<Worker | null> {
    const farmId = getCurrentFarmId();
    const worker = await prisma.worker.findFirst({
        where: { id, farm_id: farmId, deleted_at: null }
    });
    return worker ? formatWorker(worker) : null;
}

/**
 * Tạo nhân viên mới
 */
export async function createWorker(input: CreateWorkerInput): Promise<Worker> {
    const farmId = getCurrentFarmId();
    const code = await generateWorkerCode(farmId);

    const worker = await prisma.worker.create({
        data: {
            farm_id: farmId,
            code,
            name: input.name,
            phone: input.phone || null,
            id_card: input.id_card || null,
            address: input.address || null,
            date_of_birth: input.date_of_birth ? new Date(input.date_of_birth) : null,
            worker_type: input.worker_type || 'FULL_TIME',
            position: input.position || null,
            start_date: input.start_date ? new Date(input.start_date) : new Date(),
            salary_type: input.salary_type || 'MONTHLY',
            base_salary: input.base_salary || 0,
            tax_code: input.tax_code || null,
            dependents: input.dependents || 0,
            insurance_base: input.insurance_base || null,
            is_subject_to_tax: input.is_subject_to_tax ?? true,
            annual_leave_days: input.annual_leave_days || 12,
            bank_name: input.bank_name || null,
            bank_account: input.bank_account || null,
            bank_holder: input.bank_holder || null,
            note: input.note || null,
        },
    });

    await createAuditLog({
        action: 'CREATE',
        entityType: 'Worker',
        entityId: worker.id,
        description: `Tạo nhân viên ${code} - ${input.name}`,
    });

    return formatWorker(worker);
}

/**
 * Cập nhật nhân viên
 */
export async function updateWorker(id: string, input: UpdateWorkerInput): Promise<Worker> {
    const farmId = getCurrentFarmId();
    const existing = await prisma.worker.findFirst({
        where: { id, farm_id: farmId, deleted_at: null }
    });
    if (!existing) throw new Error('Không tìm thấy nhân viên');

    const updateData: any = {};

    // Map input fields
    if (input.name !== undefined) updateData.name = input.name;
    if (input.phone !== undefined) updateData.phone = input.phone || null;
    if (input.id_card !== undefined) updateData.id_card = input.id_card || null;
    if (input.address !== undefined) updateData.address = input.address || null;
    if (input.date_of_birth !== undefined) {
        updateData.date_of_birth = input.date_of_birth ? new Date(input.date_of_birth) : null;
    }
    if (input.worker_type !== undefined) updateData.worker_type = input.worker_type;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.position !== undefined) updateData.position = input.position || null;
    if (input.start_date !== undefined) updateData.start_date = new Date(input.start_date);
    if (input.end_date !== undefined) {
        updateData.end_date = input.end_date ? new Date(input.end_date) : null;
    }
    if (input.salary_type !== undefined) updateData.salary_type = input.salary_type;
    if (input.base_salary !== undefined) updateData.base_salary = input.base_salary;
    if (input.tax_code !== undefined) updateData.tax_code = input.tax_code || null;
    if (input.dependents !== undefined) updateData.dependents = input.dependents;
    if (input.insurance_base !== undefined) updateData.insurance_base = input.insurance_base || null;
    if (input.is_subject_to_tax !== undefined) updateData.is_subject_to_tax = input.is_subject_to_tax;
    if (input.annual_leave_days !== undefined) updateData.annual_leave_days = input.annual_leave_days;
    if (input.bank_name !== undefined) updateData.bank_name = input.bank_name || null;
    if (input.bank_account !== undefined) updateData.bank_account = input.bank_account || null;
    if (input.bank_holder !== undefined) updateData.bank_holder = input.bank_holder || null;
    if (input.note !== undefined) updateData.note = input.note || null;

    const worker = await prisma.worker.update({
        where: { id },
        data: updateData,
    });

    await createAuditLog({
        action: 'UPDATE',
        entityType: 'Worker',
        entityId: id,
        description: `Cập nhật nhân viên ${existing.code}`,
    });

    return formatWorker(worker);
}

/**
 * Xóa nhân viên (soft delete)
 */
export async function deleteWorker(id: string): Promise<void> {
    const farmId = getCurrentFarmId();
    const worker = await prisma.worker.findFirst({
        where: { id, farm_id: farmId, deleted_at: null }
    });
    if (!worker) throw new Error('Không tìm thấy nhân viên');

    // Kiểm tra có payroll chưa thanh toán không
    const unpaidPayroll = await prisma.payrollItem.findFirst({
        where: { worker_id: id, is_paid: false },
    });

    if (unpaidPayroll) {
        throw new Error('Không thể xóa nhân viên có lương chưa thanh toán');
    }

    await prisma.worker.update({
        where: { id },
        data: { deleted_at: new Date(), status: 'INACTIVE' },
    });

    await createAuditLog({
        action: 'DELETE',
        entityType: 'Worker',
        entityId: id,
        description: `Xóa nhân viên ${worker.code} - ${worker.name}`,
    });
}

/**
 * Lấy danh sách nhân viên đang làm việc (cho dropdown)
 */
export async function getActiveWorkers(): Promise<Array<{
    id: string;
    code: string;
    name: string;
    salary_type: string;
    base_salary: number;
    dependents: number;
}>> {
    const farmId = getCurrentFarmId();

    const workers = await prisma.worker.findMany({
        where: { farm_id: farmId, status: 'ACTIVE', deleted_at: null },
        select: {
            id: true,
            code: true,
            name: true,
            salary_type: true,
            base_salary: true,
            dependents: true
        },
        orderBy: { name: 'asc' },
    });

    return workers.map(w => ({
        ...w,
        base_salary: Number(w.base_salary),
    }));
}
