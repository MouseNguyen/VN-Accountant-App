// src/services/payroll.service.ts
import prisma, { prismaBase } from '@/lib/prisma';
import { getCurrentFarmId, getContext } from '@/lib/context';
import { createAuditLog } from './audit-log.service';
import { calculateWorkerPayroll } from '@/lib/payroll-calculator';
import { getAttendanceSummary } from './attendance.service';
import type { PayrollQueryInput, CreatePayrollInput, UpdatePayrollItemInput, PayrollPaymentInput } from '@/lib/validations/payroll';
import type { Payroll, PayrollListResponse, InsuranceConfig } from '@/types/payroll';

/**
 * Tạo mã bảng lương tự động (BL2501-001)
 */
async function generatePayrollCode(farmId: string, periodStart: Date): Promise<string> {
    const prefix = `BL${periodStart.getFullYear().toString().slice(-2)}${(periodStart.getMonth() + 1).toString().padStart(2, '0')}`;

    const lastPayroll = await prisma.payroll.findFirst({
        where: { farm_id: farmId, code: { startsWith: prefix } },
        orderBy: { code: 'desc' },
        select: { code: true },
    });

    let seq = 1;
    if (lastPayroll?.code) {
        const match = lastPayroll.code.match(/-(\d+)$/);
        if (match) {
            seq = parseInt(match[1], 10) + 1;
        }
    }

    return `${prefix}-${seq.toString().padStart(3, '0')}`;
}

/**
 * Lấy InsuranceConfig của farm
 */
async function getInsuranceConfig(farmId: string): Promise<InsuranceConfig> {
    const config = await prisma.insuranceConfig.findUnique({ where: { farm_id: farmId } });

    if (!config) {
        // Default config
        return {
            bhxh_employee_rate: 8,
            bhyt_employee_rate: 1.5,
            bhtn_employee_rate: 1,
            max_insurance_base: 36000000,
            personal_deduction: 11000000,
            dependent_deduction: 4400000,
            ot_normal_rate: 1.5,
            ot_weekend_rate: 2.0,
            ot_holiday_rate: 3.0,
            night_bonus_rate: 0.3,
        };
    }

    return {
        bhxh_employee_rate: Number(config.bhxh_employee_rate),
        bhyt_employee_rate: Number(config.bhyt_employee_rate),
        bhtn_employee_rate: Number(config.bhtn_employee_rate),
        max_insurance_base: Number(config.max_insurance_base),
        personal_deduction: Number(config.personal_deduction),
        dependent_deduction: Number(config.dependent_deduction),
        ot_normal_rate: Number(config.ot_normal_rate),
        ot_weekend_rate: Number(config.ot_weekend_rate),
        ot_holiday_rate: Number(config.ot_holiday_rate),
        night_bonus_rate: Number(config.night_bonus_rate),
    };
}

/**
 * Format payroll từ DB
 */
function formatPayroll(p: any): Payroll {
    return {
        id: p.id,
        code: p.code,
        period_start: p.period_start.toISOString().split('T')[0],
        period_end: p.period_end.toISOString().split('T')[0],
        period_type: p.period_type,
        total_base: Number(p.total_base),
        total_ot: Number(p.total_ot),
        total_allowance: Number(p.total_allowance),
        total_deduction: Number(p.total_deduction),
        total_gross: Number(p.total_gross),
        total_net: Number(p.total_net),
        paid_amount: Number(p.paid_amount),
        remaining_amount: Number(p.total_net) - Number(p.paid_amount),
        status: p.status,
        note: p.note,
        confirmed_at: p.confirmed_at?.toISOString() || null,
        created_at: p.created_at.toISOString(),
        item_count: p._count?.items || p.items?.length || 0,
        items: p.items?.map((i: any) => ({
            id: i.id,
            payroll_id: i.payroll_id,
            worker_id: i.worker_id,
            worker: i.worker,
            salary_type: i.salary_type,
            base_rate: Number(i.base_rate),
            work_days: Number(i.work_days),
            work_hours: Number(i.work_hours),
            ot_normal_hours: Number(i.ot_normal_hours),
            ot_weekend_hours: Number(i.ot_weekend_hours),
            ot_holiday_hours: Number(i.ot_holiday_hours),
            night_hours: Number(i.night_hours),
            base_amount: Number(i.base_amount),
            ot_normal_amount: Number(i.ot_normal_amount),
            ot_weekend_amount: Number(i.ot_weekend_amount),
            ot_holiday_amount: Number(i.ot_holiday_amount),
            night_amount: Number(i.night_amount),
            allowances: i.allowances,
            total_allowance: Number(i.total_allowance),
            deductions: i.deductions,
            total_deduction: Number(i.total_deduction),
            // NV đóng (10.5%)
            bhxh_amount: Number(i.bhxh_amount),
            bhyt_amount: Number(i.bhyt_amount),
            bhtn_amount: Number(i.bhtn_amount),
            insurance_amount: Number(i.insurance_amount),
            // DN đóng (21.5%)
            employer_bhxh: Number(i.employer_bhxh || 0),
            employer_bhyt: Number(i.employer_bhyt || 0),
            employer_bhtn: Number(i.employer_bhtn || 0),
            employer_bhtnld: Number(i.employer_bhtnld || 0),
            employer_insurance: Number(i.employer_insurance || 0),
            // Thuế và tổng
            tax_amount: Number(i.tax_amount),
            gross_amount: Number(i.gross_amount),
            net_amount: Number(i.net_amount),
            paid_amount: Number(i.paid_amount),
            is_paid: i.is_paid,
            paid_at: i.paid_at?.toISOString() || null,
            note: i.note,
        })),
        payments: p.payments?.map((pay: any) => ({
            id: pay.id,
            amount: Number(pay.amount),
            payment_method: pay.payment_method,
            payment_date: pay.payment_date.toISOString(),
            note: pay.note,
            created_at: pay.created_at.toISOString(),
        })),
    };
}

/**
 * Lấy danh sách bảng lương
 */
export async function getPayrolls(params: PayrollQueryInput): Promise<PayrollListResponse> {
    const farmId = getCurrentFarmId();
    const { page, limit, status, period_from, period_to, sort_by, sort_order } = params;
    const skip = (page - 1) * limit;

    const where: any = { farm_id: farmId };
    if (status) where.status = status;
    if (period_from) where.period_start = { gte: new Date(period_from) };
    if (period_to) where.period_end = { lte: new Date(period_to) };

    const [items, total] = await Promise.all([
        prisma.payroll.findMany({
            where,
            orderBy: { [sort_by]: sort_order },
            skip,
            take: limit,
            include: { _count: { select: { items: true } } },
        }),
        prisma.payroll.count({ where }),
    ]);

    return {
        items: items.map(formatPayroll),
        total,
        page,
        limit,
        hasMore: skip + items.length < total,
    };
}

/**
 * Lấy chi tiết bảng lương
 */
export async function getPayroll(id: string): Promise<Payroll | null> {
    const farmId = getCurrentFarmId();

    const payroll = await prisma.payroll.findFirst({
        where: { id, farm_id: farmId },
        include: {
            items: {
                include: {
                    worker: { select: { id: true, code: true, name: true, bank_account: true } },
                },
                orderBy: { worker: { name: 'asc' } },
            },
            payments: { orderBy: { payment_date: 'desc' } },
        },
    });

    if (!payroll) return null;
    return formatPayroll(payroll);
}

/**
 * Tạo bảng lương mới (có kiểm tra overlap)
 */
export async function createPayroll(input: CreatePayrollInput): Promise<Payroll> {
    const farmId = getCurrentFarmId();
    const periodStart = new Date(input.period_start);
    const periodEnd = new Date(input.period_end);

    // Kiểm tra overlap
    const overlap = await prisma.payroll.findFirst({
        where: {
            farm_id: farmId,
            status: { not: 'CANCELLED' },
            OR: [
                { period_start: { lte: periodStart }, period_end: { gte: periodStart } },
                { period_start: { lte: periodEnd }, period_end: { gte: periodEnd } },
                { period_start: { gte: periodStart }, period_end: { lte: periodEnd } },
            ],
        },
        select: { code: true, period_start: true, period_end: true },
    });

    if (overlap) {
        throw new Error(
            `Đã có bảng lương ${overlap.code} trong kỳ ${overlap.period_start.toISOString().split('T')[0]} - ${overlap.period_end.toISOString().split('T')[0]}. Vui lòng chọn kỳ khác.`
        );
    }

    const payrollId = await prismaBase.$transaction(async (tx) => {

        const code = await generatePayrollCode(farmId, periodStart);
        const config = await getInsuranceConfig(farmId);

        // Lấy workers
        const workerWhere: any = { farm_id: farmId, status: 'ACTIVE', deleted_at: null };
        if (input.worker_ids?.length) {
            workerWhere.id = { in: input.worker_ids };
        }

        const workers = await tx.worker.findMany({ where: workerWhere });
        if (!workers.length) {
            throw new Error('Không có nhân viên nào để tính lương');
        }

        // Lấy attendance summary
        const attendanceSummary = await getAttendanceSummary({
            worker_ids: workers.map((w) => w.id),
            date_from: input.period_start,
            date_to: input.period_end,
        });
        const attMap = new Map(attendanceSummary.map((a) => [a.worker_id, a]));

        // Tạo payroll
        const payroll = await tx.payroll.create({
            data: {
                farm_id: farmId,
                code,
                period_start: periodStart,
                period_end: periodEnd,
                period_type: input.period_type || 'MONTHLY',
                note: input.note || null,
            },
        });

        // Totals
        let totals = { base: 0, ot: 0, allowance: 0, deduction: 0, gross: 0, net: 0 };

        // Tính lương cho từng worker
        for (const worker of workers) {
            const att = attMap.get(worker.id) || {
                total_days: 0,
                total_hours: 0,
                ot_normal_hours: 0,
                ot_weekend_hours: 0,
                ot_holiday_hours: 0,
                night_hours: 0,
            };

            const calc = calculateWorkerPayroll({
                salary_type: worker.salary_type,
                worker_type: worker.worker_type,
                base_salary: Number(worker.base_salary),
                work_days: att.total_days,
                work_hours: att.total_hours,
                ot_normal_hours: att.ot_normal_hours,
                ot_weekend_hours: att.ot_weekend_hours,
                ot_holiday_hours: att.ot_holiday_hours,
                night_hours: att.night_hours,
                insurance_base: worker.insurance_base ? Number(worker.insurance_base) : undefined,
                dependents: worker.dependents,
                is_subject_to_tax: worker.is_subject_to_tax,
                config,
            });

            await tx.payrollItem.create({
                data: {
                    farm_id: farmId,
                    payroll_id: payroll.id,
                    worker_id: worker.id,
                    salary_type: worker.salary_type,
                    base_rate: worker.base_salary,
                    work_days: calc.work_days,
                    work_hours: calc.work_hours,
                    ot_normal_hours: calc.ot_normal_hours,
                    ot_weekend_hours: calc.ot_weekend_hours,
                    ot_holiday_hours: calc.ot_holiday_hours,
                    night_hours: calc.night_hours,
                    base_amount: calc.base_amount,
                    ot_normal_amount: calc.ot_normal_amount,
                    ot_weekend_amount: calc.ot_weekend_amount,
                    ot_holiday_amount: calc.ot_holiday_amount,
                    night_amount: calc.night_amount,
                    total_allowance: calc.total_allowance,
                    total_deduction: calc.total_deduction,
                    // Phần NV đóng (10.5%)
                    bhxh_amount: calc.bhxh_amount,
                    bhyt_amount: calc.bhyt_amount,
                    bhtn_amount: calc.bhtn_amount,
                    insurance_amount: calc.insurance_amount,
                    // Phần DN đóng (21.5%)
                    employer_bhxh: calc.employer_bhxh,
                    employer_bhyt: calc.employer_bhyt,
                    employer_bhtn: calc.employer_bhtn,
                    employer_bhtnld: calc.employer_bhtnld,
                    employer_insurance: calc.employer_insurance,
                    // Thuế và tổng
                    tax_amount: calc.tax_amount,
                    gross_amount: calc.gross_amount,
                    net_amount: calc.net_amount,
                },
            });

            totals.base += calc.base_amount;
            totals.ot += calc.total_ot;
            totals.allowance += calc.total_allowance;
            totals.deduction += calc.total_deduction + calc.insurance_amount + calc.tax_amount;
            totals.gross += calc.gross_amount;
            totals.net += calc.net_amount;
        }

        // Cập nhật totals
        await tx.payroll.update({
            where: { id: payroll.id },
            data: {
                total_base: totals.base,
                total_ot: totals.ot,
                total_allowance: totals.allowance,
                total_deduction: totals.deduction,
                total_gross: totals.gross,
                total_net: totals.net,
            },
        });

        await createAuditLog({
            action: 'CREATE',
            entityType: 'Payroll',
            entityId: payroll.id,
            description: `Tạo bảng lương ${code} cho ${workers.length} nhân viên`,
        });

        // Return payroll ID to fetch after transaction commits
        return payroll.id;
    }, { timeout: 60000 });

    // Fetch full payroll AFTER transaction commits
    const result = await getPayroll(payrollId);
    if (!result) throw new Error('Không thể tạo bảng lương');
    return result;
}

/**
 * Xác nhận bảng lương
 */
export async function confirmPayroll(id: string): Promise<Payroll> {
    const farmId = getCurrentFarmId();
    const context = getContext();

    const payroll = await prisma.payroll.findFirst({
        where: { id, farm_id: farmId },
        include: { items: true }
    });
    if (!payroll) throw new Error('Không tìm thấy bảng lương');
    if (payroll.status !== 'DRAFT') throw new Error('Chỉ có thể xác nhận bảng lương Nháp');

    // Tính tổng employer insurance từ items
    const totalEmployerInsurance = payroll.items.reduce(
        (sum, item) => sum + Number(item.employer_insurance || 0),
        0
    );

    // Tạo Transaction chi phí BHXH nếu có
    let transactionId: string | null = null;
    if (totalEmployerInsurance > 0) {
        const periodStart = new Date(payroll.period_start);
        const monthYear = `${periodStart.getMonth() + 1}/${periodStart.getFullYear()}`;

        const transaction = await prisma.transaction.create({
            data: {
                farm_id: farmId,
                trans_number: `CP-BHXH-${payroll.code}`,
                code: `CP-BHXH-${payroll.code}`,
                trans_type: 'EXPENSE',
                trans_date: new Date(),
                amount: totalEmployerInsurance,
                total_amount: totalEmployerInsurance,
                paid_amount: 0,
                payment_status: 'PENDING',
                payment_method: 'BANK_TRANSFER',
                description: `Chi phí BHXH/BHYT/BHTN tháng ${monthYear} (DN đóng 21.5%) - Liên kết bảng lương ${payroll.code}`,
                items: {
                    create: [{
                        description: `BHXH+BHYT+BHTN+BHTNLĐ DN đóng tháng ${monthYear}`,
                        quantity: 1,
                        unit: 'kỳ',
                        unit_price: totalEmployerInsurance,
                        line_total: totalEmployerInsurance,
                    }]
                }
            }
        });
        transactionId = transaction.id;
    }

    await prisma.payroll.update({
        where: { id },
        data: {
            status: 'CONFIRMED',
            confirmed_at: new Date(),
            confirmed_by: context?.userId,
            total_employer_insurance: totalEmployerInsurance,
            employer_insurance_transaction_id: transactionId,
        },
    });

    await createAuditLog({
        action: 'UPDATE',
        entityType: 'Payroll',
        entityId: id,
        description: `Xác nhận bảng lương ${payroll.code}`,
    });

    return getPayroll(id) as Promise<Payroll>;
}

/**
 * Chi trả lương
 */
export async function payPayroll(id: string, input: PayrollPaymentInput): Promise<Payroll> {
    const farmId = getCurrentFarmId();
    const context = getContext();

    return prismaBase.$transaction(async (tx) => {
        const payroll = await tx.payroll.findFirst({ where: { id, farm_id: farmId } });
        if (!payroll) throw new Error('Không tìm thấy bảng lương');
        if (payroll.status === 'DRAFT') throw new Error('Phải xác nhận bảng lương trước khi chi trả');
        if (payroll.status === 'PAID') throw new Error('Bảng lương đã được trả hết');

        const remaining = Number(payroll.total_net) - Number(payroll.paid_amount);
        if (input.amount > remaining) {
            throw new Error(`Số tiền vượt quá còn lại (${remaining.toLocaleString()}đ)`);
        }

        const newPaid = Number(payroll.paid_amount) + input.amount;
        const newStatus = newPaid >= Number(payroll.total_net) ? 'PAID' : 'PARTIAL_PAID';

        await tx.payroll.update({
            where: { id },
            data: { paid_amount: newPaid, status: newStatus },
        });

        // Create PayrollPayment record
        const payment = await tx.payrollPayment.create({
            data: {
                farm_id: farmId,
                payroll_id: id,
                amount: input.amount,
                payment_method: input.payment_method || 'CASH',
                payment_date: input.payment_date ? new Date(input.payment_date) : new Date(),
                note: input.note,
                created_by: context?.userId,
            },
        });

        // ================================================================
        // FIX: Create EXPENSE transaction for salary payment
        // This ensures salary payments show up in expense reports
        // ================================================================
        const periodStart = new Date(payroll.period_start);
        const monthYear = `${periodStart.getMonth() + 1}/${periodStart.getFullYear()}`;
        const paymentCount = await tx.payrollPayment.count({ where: { payroll_id: id } });

        await tx.transaction.create({
            data: {
                farm_id: farmId,
                trans_number: `LUONG-${payroll.code}-${paymentCount}`,
                code: `LUONG-${payroll.code}-${paymentCount}`,
                trans_type: 'EXPENSE',
                trans_date: input.payment_date ? new Date(input.payment_date) : new Date(),
                amount: input.amount,
                total_amount: input.amount,
                paid_amount: input.amount,  // Fully paid since it's cash/transfer out
                payment_status: 'PAID',
                payment_method: input.payment_method || 'CASH',
                description: `Chi lương tháng ${monthYear} - ${payroll.code}`,
                notes: input.note || undefined,
                items: {
                    create: [{
                        description: `Chi lương nhân viên tháng ${monthYear}`,
                        quantity: 1,
                        unit: 'kỳ',
                        unit_price: input.amount,
                        line_total: input.amount,
                    }]
                }
            }
        });

        // Nếu trả hết, đánh dấu items là đã trả
        if (newStatus === 'PAID') {
            await tx.payrollItem.updateMany({
                where: { payroll_id: id },
                data: { is_paid: true, paid_at: new Date() },
            });
        }

        await createAuditLog({
            action: 'UPDATE',
            entityType: 'Payroll',
            entityId: id,
            description: `Chi trả lương ${payroll.code}: ${input.amount.toLocaleString()}đ`,
        });

        return getPayroll(id) as Promise<Payroll>;
    });
}

/**
 * Xóa bảng lương (chỉ DRAFT)
 */
export async function deletePayroll(id: string): Promise<void> {
    const farmId = getCurrentFarmId();

    const payroll = await prisma.payroll.findFirst({ where: { id, farm_id: farmId } });
    if (!payroll) throw new Error('Không tìm thấy bảng lương');
    if (payroll.status !== 'DRAFT') throw new Error('Chỉ có thể xóa bảng lương Nháp');

    await prisma.payroll.delete({ where: { id } });

    await createAuditLog({
        action: 'DELETE',
        entityType: 'Payroll',
        entityId: id,
        description: `Xóa bảng lương ${payroll.code}`,
    });
}

/**
 * Cập nhật payroll item (phụ cấp/khấu trừ)
 */
export async function updatePayrollItem(itemId: string, input: UpdatePayrollItemInput): Promise<Payroll> {
    const farmId = getCurrentFarmId();

    const item = await prisma.payrollItem.findFirst({
        where: { id: itemId, farm_id: farmId },
        include: { payroll: true, worker: true },
    });

    if (!item) throw new Error('Không tìm thấy chi tiết lương');
    if (item.payroll.status !== 'DRAFT') throw new Error('Chỉ có thể sửa bảng lương Nháp');

    const config = await getInsuranceConfig(farmId);

    // Recalculate với allowances/deductions mới
    const calc = calculateWorkerPayroll({
        salary_type: item.salary_type,
        worker_type: item.worker?.worker_type,
        base_salary: Number(item.base_rate),
        work_days: Number(item.work_days),
        work_hours: Number(item.work_hours),
        ot_normal_hours: Number(item.ot_normal_hours),
        ot_weekend_hours: Number(item.ot_weekend_hours),
        ot_holiday_hours: Number(item.ot_holiday_hours),
        night_hours: Number(item.night_hours),
        allowances: input.allowances,
        deductions: input.deductions,
        dependents: item.worker?.dependents || 0,
        is_subject_to_tax: item.worker?.is_subject_to_tax ?? true,
        config,
    });

    await prisma.payrollItem.update({
        where: { id: itemId },
        data: {
            allowances: input.allowances ?? undefined,
            deductions: input.deductions ?? undefined,
            total_allowance: calc.total_allowance,
            total_deduction: calc.total_deduction,
            gross_amount: calc.gross_amount,
            net_amount: calc.net_amount,
            note: input.note,
        },
    });

    // Recalculate payroll totals
    const allItems = await prisma.payrollItem.findMany({
        where: { payroll_id: item.payroll_id },
    });

    const totals = allItems.reduce(
        (acc, i) => ({
            base: acc.base + Number(i.base_amount),
            ot: acc.ot + Number(i.ot_normal_amount) + Number(i.ot_weekend_amount) + Number(i.ot_holiday_amount) + Number(i.night_amount),
            allowance: acc.allowance + Number(i.total_allowance),
            deduction: acc.deduction + Number(i.total_deduction) + Number(i.insurance_amount) + Number(i.tax_amount),
            gross: acc.gross + Number(i.gross_amount),
            net: acc.net + Number(i.net_amount),
        }),
        { base: 0, ot: 0, allowance: 0, deduction: 0, gross: 0, net: 0 }
    );

    await prisma.payroll.update({
        where: { id: item.payroll_id },
        data: {
            total_base: totals.base,
            total_ot: totals.ot,
            total_allowance: totals.allowance,
            total_deduction: totals.deduction,
            total_gross: totals.gross,
            total_net: totals.net,
        },
    });

    return getPayroll(item.payroll_id) as Promise<Payroll>;
}
