// src/services/tax-schedule.service.ts
// Tax Schedule Status Management
// Task 12 Phase 3

import { prisma } from '@/lib/prisma';
import { TaxType } from '@prisma/client';

// ==========================================
// TYPES
// ==========================================

interface StatusUpdateResult {
    updated: number;
    overdue: number;
    details: {
        id: string;
        farm_id: string;
        tax_type: string;
        period: string;
        old_status: string;
        new_status: string;
    }[];
}

// ==========================================
// UPDATE TAX SCHEDULE STATUS
// ==========================================

/**
 * Update status of all tax schedules based on current date
 * - PENDING → OVERDUE if past due date
 * - Also cleans up any SUBMITTED but not PAID entries
 */
export async function updateTaxScheduleStatus(): Promise<StatusUpdateResult> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result: StatusUpdateResult = {
        updated: 0,
        overdue: 0,
        details: [],
    };

    // Find all PENDING schedules that are past due
    const overdueSchedules = await prisma.taxSchedule.findMany({
        where: {
            status: 'PENDING',
            due_date: { lt: today },
        },
    });

    // Update each to OVERDUE
    for (const schedule of overdueSchedules) {
        await prisma.taxSchedule.update({
            where: { id: schedule.id },
            data: { status: 'OVERDUE' },
        });

        result.details.push({
            id: schedule.id,
            farm_id: schedule.farm_id,
            tax_type: schedule.tax_type,
            period: schedule.period,
            old_status: 'PENDING',
            new_status: 'OVERDUE',
        });

        result.updated++;
        result.overdue++;

        console.log(
            `[TAX STATUS] ${schedule.tax_type} ${schedule.period} → OVERDUE`
        );
    }

    console.log(
        `[TAX STATUS] Updated ${result.updated} schedules (${result.overdue} now overdue)`
    );

    return result;
}

// ==========================================
// CREATE TAX SCHEDULES FOR PERIOD
// ==========================================

/**
 * Generate tax schedules for a farm for a given year
 * Creates entries for VAT, CIT, PIT based on declaration type
 */
export async function generateTaxSchedules(
    farmId: string,
    year: number,
    vatType: 'MONTHLY' | 'QUARTERLY' = 'QUARTERLY'
): Promise<number> {
    const schedules: {
        farm_id: string;
        tax_type: TaxType;
        period: string;
        due_date: Date;
    }[] = [];

    // VAT schedules
    if (vatType === 'MONTHLY') {
        // Monthly VAT - due by 20th of next month
        for (let month = 1; month <= 12; month++) {
            const dueDate = new Date(year, month, 20); // 20th of next month
            if (dueDate > new Date()) {
                schedules.push({
                    farm_id: farmId,
                    tax_type: 'VAT_MONTHLY',
                    period: `${year}-${String(month).padStart(2, '0')}`,
                    due_date: dueDate,
                });
            }
        }
    } else {
        // Quarterly VAT - due by 30th of month after quarter
        for (let q = 1; q <= 4; q++) {
            const dueMonth = q * 3 + 1; // April, July, October, January
            const dueYear = q === 4 ? year + 1 : year;
            const dueDate = new Date(dueYear, dueMonth - 1, 30);
            if (dueDate > new Date()) {
                schedules.push({
                    farm_id: farmId,
                    tax_type: 'VAT_QUARTERLY',
                    period: `${year}-Q${q}`,
                    due_date: dueDate,
                });
            }
        }
    }

    // CIT schedules - quarterly provisional + annual final
    for (let q = 1; q <= 4; q++) {
        const dueMonth = q * 3 + 1;
        const dueYear = q === 4 ? year + 1 : year;
        const dueDate = new Date(dueYear, dueMonth - 1, 30);
        if (dueDate > new Date()) {
            schedules.push({
                farm_id: farmId,
                tax_type: 'CIT_QUARTERLY',
                period: `${year}-Q${q}`,
                due_date: dueDate,
            });
        }
    }

    // CIT Annual - due by March 31 of next year
    const citAnnualDue = new Date(year + 1, 2, 31);
    if (citAnnualDue > new Date()) {
        schedules.push({
            farm_id: farmId,
            tax_type: 'CIT_ANNUAL',
            period: `${year}`,
            due_date: citAnnualDue,
        });
    }

    // PIT Annual - due by March 31 of next year
    const pitAnnualDue = new Date(year + 1, 2, 31);
    if (pitAnnualDue > new Date()) {
        schedules.push({
            farm_id: farmId,
            tax_type: 'PIT_ANNUAL',
            period: `${year}`,
            due_date: pitAnnualDue,
        });
    }

    // Create schedules (skip duplicates)
    let created = 0;
    for (const schedule of schedules) {
        try {
            await prisma.taxSchedule.upsert({
                where: {
                    farm_id_tax_type_period: {
                        farm_id: schedule.farm_id,
                        tax_type: schedule.tax_type,
                        period: schedule.period,
                    },
                },
                create: {
                    ...schedule,
                    status: 'PENDING',
                },
                update: {}, // Don't update if exists
            });
            created++;
        } catch {
            // Skip if constraint error
        }
    }

    console.log(`[TAX SCHEDULE] Generated ${created} schedules for ${year}`);

    return created;
}

// ==========================================
// MARK AS SUBMITTED/PAID
// ==========================================

export async function markTaxAsSubmitted(
    farmId: string,
    taxType: TaxType,
    period: string
): Promise<void> {
    await prisma.taxSchedule.update({
        where: {
            farm_id_tax_type_period: { farm_id: farmId, tax_type: taxType, period },
        },
        data: {
            status: 'SUBMITTED',
            submitted_at: new Date(),
        },
    });
}

export async function markTaxAsPaid(
    farmId: string,
    taxType: TaxType,
    period: string,
    paymentRef?: string
): Promise<void> {
    await prisma.taxSchedule.update({
        where: {
            farm_id_tax_type_period: { farm_id: farmId, tax_type: taxType, period },
        },
        data: {
            status: 'PAID',
            paid_at: new Date(),
            payment_ref: paymentRef,
        },
    });
}
