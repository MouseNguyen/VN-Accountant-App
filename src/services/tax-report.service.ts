// src/services/tax-report.service.ts

import { prismaBase } from '@/lib/prisma';
import { getCurrentFarmId, getContext } from '@/lib/context';
import { TaxReportData, VATSummary, InsuranceSummary, TaxPaymentRecord } from '@/types/tax-report';

// TaxType enum (định nghĩa local để tránh phụ thuộc vào prisma generate)
type TaxType = 'VAT' | 'BHXH' | 'TNCN';

// ==========================================
// GET TAX REPORT
// ==========================================

export async function getTaxReport(
    quarter: number,
    year: number
): Promise<TaxReportData> {
    const farmId = getCurrentFarmId();

    // Calculate period
    const startMonth = (quarter - 1) * 3;
    const periodStart = new Date(year, startMonth, 1);
    const periodEnd = new Date(year, startMonth + 3, 0); // Last day of quarter

    // Get VAT summary
    const vatSummary = await getVATSummary(farmId, periodStart, periodEnd);

    // Get Insurance summary
    const insuranceSummary = await getInsuranceSummary(farmId, periodStart, periodEnd);

    // Get existing tax payments
    // @ts-ignore - taxPayment model is newly added
    const payments = await prismaBase.taxPayment.findMany({
        where: {
            farm_id: farmId,
            period_start: { gte: periodStart },
            period_end: { lte: periodEnd },
        },
        include: { transaction: { select: { code: true } } },
    });

    return {
        quarter,
        year,
        vat: vatSummary,
        insurance: insuranceSummary,
        total_liability: vatSummary.payable + insuranceSummary.total_payable,
        payments: (payments as any[]).map((p) => ({
            id: p.id,
            tax_type: p.tax_type as TaxType,
            amount: Number(p.amount),
            status: p.status as 'PENDING' | 'PAID',
            paid_at: p.paid_at?.toISOString(),
            transaction_code: p.transaction?.code,
        })),
    };
}

// ==========================================
// VAT SUMMARY
// ==========================================

async function getVATSummary(
    farmId: string,
    startDate: Date,
    endDate: Date
): Promise<VATSummary> {
    const [income, expense] = await Promise.all([
        // VAT Output (bán hàng)
        prismaBase.transaction.aggregate({
            where: {
                farm_id: farmId,
                trans_type: 'INCOME',
                trans_date: { gte: startDate, lte: endDate },
            },
            _sum: { tax_amount: true },
            _count: true,
        }),
        // VAT Input (mua hàng)
        prismaBase.transaction.aggregate({
            where: {
                farm_id: farmId,
                trans_type: 'EXPENSE',
                trans_date: { gte: startDate, lte: endDate },
            },
            _sum: { tax_amount: true },
            _count: true,
        }),
    ]);

    const output = Number(income._sum.tax_amount || 0);
    const input = Number(expense._sum.tax_amount || 0);

    return {
        period: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
        },
        output,
        input,
        payable: Math.max(0, output - input), // VAT phải nộp không âm
        transaction_count: {
            income: income._count,
            expense: expense._count,
        },
    };
}

// ==========================================
// INSURANCE SUMMARY
// ==========================================

async function getInsuranceSummary(
    farmId: string,
    startDate: Date,
    endDate: Date
): Promise<InsuranceSummary> {
    // Sum from PayrollItems in this period
    const payrollData = await prismaBase.payrollItem.aggregate({
        where: {
            farm_id: farmId,
            payroll: {
                period_start: { gte: startDate },
                period_end: { lte: endDate },
                status: { in: ['CONFIRMED', 'PAID'] },
            },
        },
        _sum: {
            insurance_amount: true, // NV đóng (10.5%)
            employer_insurance: true, // DN đóng (21.5%)
        },
        _count: true,
    });

    const sumData = payrollData._sum ?? { insurance_amount: null, employer_insurance: null };
    const employeePortion = Number(sumData.insurance_amount ?? 0);
    const employerPortion = Number(sumData.employer_insurance ?? 0);
    const workerCount = typeof payrollData._count === 'number' ? payrollData._count : 0;

    return {
        period: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
        },
        employee_portion: employeePortion,
        employer_portion: employerPortion,
        total_payable: employeePortion + employerPortion,
        worker_count: workerCount,
    };
}

// ==========================================
// CONFIRM TAX PAYMENT
// ==========================================

export async function confirmTaxPayment(input: {
    tax_type: TaxType;
    quarter: number;
    year: number;
    amount: number;
    payment_method?: string;
}): Promise<{ tax_payment: unknown; transaction: unknown }> {
    const farmId = getCurrentFarmId();
    const context = getContext();

    const startMonth = (input.quarter - 1) * 3;
    const periodStart = new Date(input.year, startMonth, 1);
    const periodEnd = new Date(input.year, startMonth + 3, 0);

    // Check if already paid
    // @ts-ignore - taxPayment model is newly added
    const existingPayment = await prismaBase.taxPayment.findFirst({
        where: {
            farm_id: farmId,
            tax_type: input.tax_type,
            period_start: periodStart,
            period_end: periodEnd,
            status: 'PAID',
        },
    });

    if (existingPayment) {
        throw new Error(`Thuế ${input.tax_type} Quý ${input.quarter}/${input.year} đã được nộp`);
    }

    return prismaBase.$transaction(async (tx) => {
        // 1. Generate transaction code
        const code = `CP-${input.tax_type}-Q${input.quarter}-${input.year}`;

        // 2. Create expense transaction
        const transaction = await tx.transaction.create({
            data: {
                farm_id: farmId,
                trans_number: code,
                code,
                trans_type: 'EXPENSE',
                trans_date: new Date(),
                amount: input.amount,
                subtotal: input.amount,
                tax_amount: 0,
                discount_amount: 0,
                total_amount: input.amount,
                paid_amount: input.amount,
                payment_status: 'PAID',
                payment_method: (input.payment_method || 'BANK_TRANSFER') as any,
                description:
                    input.tax_type === 'VAT'
                        ? `Nộp thuế GTGT Quý ${input.quarter}/${input.year}`
                        : `Nộp BHXH/BHYT/BHTN Quý ${input.quarter}/${input.year}`,
                created_by: context?.userId,
                items: {
                    create: [
                        {
                            description:
                                input.tax_type === 'VAT'
                                    ? `Thuế GTGT Quý ${input.quarter}/${input.year}`
                                    : `BHXH/BHYT/BHTN Quý ${input.quarter}/${input.year}`,
                            quantity: 1,
                            unit: 'kỳ',
                            unit_price: input.amount,
                            line_total: input.amount,
                        },
                    ],
                },
            },
        });

        // 3. Create tax payment record
        // @ts-ignore - taxPayment model is newly added
        const taxPayment = await tx.taxPayment.create({
            data: {
                farm_id: farmId,
                tax_type: input.tax_type,
                period_start: periodStart,
                period_end: periodEnd,
                amount: input.amount,
                status: 'PAID',
                paid_at: new Date(),
                transaction_id: transaction.id,
            },
        });

        return { tax_payment: taxPayment, transaction };
    });
}

// ==========================================
// GET TAX PAYMENT HISTORY
// ==========================================

export async function getTaxPaymentHistory(
    year?: number
): Promise<TaxPaymentRecord[]> {
    const farmId = getCurrentFarmId();

    const whereClause: any = { farm_id: farmId };
    if (year) {
        whereClause.period_start = {
            gte: new Date(year, 0, 1),
            lte: new Date(year, 11, 31),
        };
    }

    // @ts-ignore - taxPayment model is newly added
    const payments = await prismaBase.taxPayment.findMany({
        where: whereClause,
        include: { transaction: { select: { code: true } } },
        orderBy: { period_start: 'desc' },
    });

    return (payments as any[]).map((p) => {
        const quarter = Math.ceil((p.period_start.getMonth() + 1) / 3);
        return {
            id: p.id,
            tax_type: p.tax_type as TaxType,
            quarter,
            year: p.period_start.getFullYear(),
            amount: Number(p.amount),
            status: p.status,
            paid_at: p.paid_at?.toISOString(),
            transaction_code: p.transaction?.code,
        };
    });
}
