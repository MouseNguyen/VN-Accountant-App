// src/lib/services/tax-schedule.service.ts
// Tax Schedule Service - Task 8
// Manages tax deadlines and reminders

import { prisma } from '@/lib/prisma';
import { TaxType } from '@prisma/client';

// ==========================================
// TAX DEADLINES (Theo quy định VN)
// ==========================================

export const TAX_DEADLINES = {
    VAT: {
        MONTHLY: { day: 20, description: 'Ngày 20 tháng sau' },
        QUARTERLY: { day: 30, description: 'Ngày 30 tháng đầu quý sau' },
    },
    CIT: {
        QUARTERLY: { day: 30, description: 'Ngày 30 tháng đầu quý sau' },
        ANNUAL: { day: 90, description: '90 ngày kể từ kết thúc năm (31/03)' },
    },
    PIT: {
        MONTHLY: { day: 20, description: 'Ngày 20 tháng sau' },
        ANNUAL: { day: 90, description: '90 ngày kể từ kết thúc năm' },
    },
    LICENSE: {
        ANNUAL: { day: 30, description: 'Ngày 30/01 hàng năm' },
    },
};

// ==========================================
// GENERATE TAX SCHEDULE FOR YEAR
// ==========================================

export async function generateTaxScheduleForYear(farmId: string, year: number) {
    const schedules: Array<{
        farm_id: string;
        tax_type: TaxType;
        period: string;
        due_date: Date;
    }> = [];

    // VAT Quarterly (Q1-Q4)
    for (let q = 1; q <= 4; q++) {
        // Due date: Ngày 30 tháng đầu quý sau
        let dueYear = year;
        let dueMonth = q * 3; // Q1->thg3, Q2->thg6, Q3->thg9, Q4->thg12

        // Move to next quarter's first month
        if (dueMonth >= 12) {
            dueYear = year + 1;
            dueMonth = 0; // January
        }

        const dueDate = new Date(dueYear, dueMonth, 30);

        schedules.push({
            farm_id: farmId,
            tax_type: 'VAT' as TaxType,
            period: `${year}-Q${q}`,
            due_date: dueDate,
        });
    }

    // CIT Quarterly (Q1-Q4) - Tạm tính
    for (let q = 1; q <= 4; q++) {
        let dueYear = year;
        let dueMonth = q * 3;

        if (dueMonth >= 12) {
            dueYear = year + 1;
            dueMonth = 0;
        }

        const dueDate = new Date(dueYear, dueMonth, 30);

        schedules.push({
            farm_id: farmId,
            tax_type: 'CIT' as TaxType,
            period: `${year}-Q${q}`,
            due_date: dueDate,
        });
    }

    // CIT Annual (Quyết toán) - 31/03 năm sau
    schedules.push({
        farm_id: farmId,
        tax_type: 'CIT' as TaxType,
        period: `${year}`,
        due_date: new Date(year + 1, 2, 31), // March 31 next year
    });

    // PIT Monthly (1-12)
    for (let m = 1; m <= 12; m++) {
        // Due date: Ngày 20 tháng sau
        let dueYear = year;
        let dueMonth = m; // Next month

        if (dueMonth >= 12) {
            dueYear = year + 1;
            dueMonth = 0;
        }

        const dueDate = new Date(dueYear, dueMonth, 20);

        schedules.push({
            farm_id: farmId,
            tax_type: 'PIT' as TaxType,
            period: `${year}-${String(m).padStart(2, '0')}`,
            due_date: dueDate,
        });
    }

    // PIT Annual (Quyết toán) - 31/03 năm sau
    schedules.push({
        farm_id: farmId,
        tax_type: 'PIT' as TaxType,
        period: `${year}`,
        due_date: new Date(year + 1, 2, 31),
    });

    // Upsert all schedules
    let created = 0;
    let updated = 0;

    for (const s of schedules) {
        const existing = await prisma.taxSchedule.findUnique({
            where: {
                farm_id_tax_type_period: {
                    farm_id: s.farm_id,
                    tax_type: s.tax_type,
                    period: s.period,
                },
            },
        });

        if (existing) {
            await prisma.taxSchedule.update({
                where: { id: existing.id },
                data: { due_date: s.due_date },
            });
            updated++;
        } else {
            await prisma.taxSchedule.create({
                data: {
                    ...s,
                    status: 'PENDING',
                },
            });
            created++;
        }
    }

    return { created, updated, total: schedules.length };
}

// ==========================================
// GET UPCOMING DEADLINES
// ==========================================

export async function getUpcomingDeadlines(farmId: string, days: number = 30) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    return prisma.taxSchedule.findMany({
        where: {
            farm_id: farmId,
            status: { in: ['PENDING', 'REMINDED'] },
            due_date: {
                gte: now,
                lte: futureDate,
            },
        },
        orderBy: { due_date: 'asc' },
    });
}

// ==========================================
// GET OVERDUE ITEMS
// ==========================================

export async function getOverdueItems(farmId: string) {
    return prisma.taxSchedule.findMany({
        where: {
            farm_id: farmId,
            status: { in: ['PENDING', 'REMINDED'] },
            due_date: { lt: new Date() },
        },
        orderBy: { due_date: 'asc' },
    });
}

// ==========================================
// MARK AS SUBMITTED
// ==========================================

export async function markTaxAsSubmitted(
    farmId: string,
    taxType: TaxType,
    period: string,
    amount?: number
) {
    return prisma.taxSchedule.update({
        where: {
            farm_id_tax_type_period: {
                farm_id: farmId,
                tax_type: taxType,
                period,
            },
        },
        data: {
            status: 'SUBMITTED',
            submitted_at: new Date(),
            amount: amount ?? undefined,
        },
    });
}

// ==========================================
// MARK AS PAID
// ==========================================

export async function markTaxAsPaid(
    farmId: string,
    taxType: TaxType,
    period: string,
    paymentRef?: string
) {
    return prisma.taxSchedule.update({
        where: {
            farm_id_tax_type_period: {
                farm_id: farmId,
                tax_type: taxType,
                period,
            },
        },
        data: {
            status: 'PAID',
            paid_at: new Date(),
            payment_ref: paymentRef,
        },
    });
}

// ==========================================
// GET ALL SCHEDULES FOR PERIOD (for dashboard)
// ==========================================

export async function getTaxSchedulesForYear(farmId: string, year: number) {
    return prisma.taxSchedule.findMany({
        where: {
            farm_id: farmId,
            period: {
                startsWith: `${year}`,
            },
        },
        orderBy: { due_date: 'asc' },
    });
}
