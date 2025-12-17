// src/lib/notifications/tax-reminders.ts
// Tax Deadline Reminders
// Task 12 Phase 3

import { prisma } from '@/lib/prisma';

// ==========================================
// TYPES
// ==========================================

interface TaxReminder {
    farm_id: string;
    farm_name: string;
    tax_type: string;
    period: string;
    due_date: Date;
    days_until_due: number;
    amount?: number;
}

interface ReminderResult {
    sent: number;
    failed: number;
    reminders: TaxReminder[];
}

// ==========================================
// SEND TAX REMINDERS
// ==========================================

/**
 * Send tax deadline reminders
 * Queries TaxSchedule for upcoming deadlines and sends notifications
 */
export async function sendTaxReminders(): Promise<ReminderResult> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get upcoming deadlines (within 7 days)
    const upcomingTaxes = await prisma.taxSchedule.findMany({
        where: {
            status: 'PENDING',
            due_date: {
                gte: today,
                lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
            },
        },
        include: {
            farm: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
        orderBy: { due_date: 'asc' },
    });

    const reminders: TaxReminder[] = [];
    let sent = 0;
    let failed = 0;

    for (const tax of upcomingTaxes) {
        const daysUntilDue = Math.ceil(
            (tax.due_date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
        );

        const reminder: TaxReminder = {
            farm_id: tax.farm_id,
            farm_name: tax.farm.name,
            tax_type: tax.tax_type,
            period: tax.period,
            due_date: tax.due_date,
            days_until_due: daysUntilDue,
            amount: tax.amount ? Number(tax.amount) : undefined,
        };

        reminders.push(reminder);

        try {
            // Send notification (console for now, can integrate with email/SMS later)
            await sendNotification(reminder);

            // Update reminder count
            await prisma.taxSchedule.update({
                where: { id: tax.id },
                data: {
                    reminded_at: new Date(),
                    reminder_count: { increment: 1 },
                },
            });

            sent++;
            console.log(
                `[TAX REMINDER] ${tax.farm.name}: ${tax.tax_type} ${tax.period} due in ${daysUntilDue} days`
            );
        } catch (error) {
            failed++;
            console.error(`[TAX REMINDER] Failed for ${tax.id}:`, error);
        }
    }

    console.log(`[TAX REMINDER] Summary: ${sent} sent, ${failed} failed`);

    return { sent, failed, reminders };
}

// ==========================================
// NOTIFICATION CHANNEL
// ==========================================

/**
 * Send notification for a tax reminder
 * Currently logs to console - can be extended for email/SMS
 */
async function sendNotification(reminder: TaxReminder): Promise<void> {
    const urgencyLabel = getUrgencyLabel(reminder.days_until_due);
    const amountStr = reminder.amount
        ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(reminder.amount)
        : 'chưa tính';

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  ${urgencyLabel} NHẮ NHẮC NỘP THUẾ
║  
║  Tên đơn vị: ${reminder.farm_name}
║  Loại thuế:  ${formatTaxType(reminder.tax_type)}
║  Kỳ khai:    ${reminder.period}
║  Hạn nộp:    ${formatDate(reminder.due_date)}
║  Còn lại:    ${reminder.days_until_due} ngày
║  Số tiền:    ${amountStr}
╚══════════════════════════════════════════════════════════════╝
`);

    // TODO: Integrate with email service
    // await sendEmail({
    //     to: reminder.farm_email,
    //     subject: `[${urgencyLabel}] Nhắc nhở nộp ${formatTaxType(reminder.tax_type)}`,
    //     body: ...
    // });
}

// ==========================================
// HELPERS
// ==========================================

function getUrgencyLabel(daysUntilDue: number): string {
    if (daysUntilDue <= 1) return '🔴 KHẨN CẤP';
    if (daysUntilDue <= 3) return '🟠 CẦN CHÚ Ý';
    return '🟢 THÔNG BÁO';
}

function formatTaxType(type: string): string {
    const labels: Record<string, string> = {
        VAT_MONTHLY: 'VAT hàng tháng',
        VAT_QUARTERLY: 'VAT hàng quý',
        CIT_QUARTERLY: 'Thuế TNDN tạm tính',
        CIT_ANNUAL: 'Thuế TNDN quyết toán',
        PIT_MONTHLY: 'Thuế TNCN hàng tháng',
        PIT_ANNUAL: 'Thuế TNCN quyết toán',
    };
    return labels[type] || type;
}

function formatDate(date: Date): string {
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

// ==========================================
// GET UPCOMING REMINDERS (for UI)
// ==========================================

/**
 * Get list of upcoming tax deadlines for a farm
 */
export async function getUpcomingTaxDeadlines(
    farmId: string,
    daysAhead: number = 30
): Promise<TaxReminder[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const taxes = await prisma.taxSchedule.findMany({
        where: {
            farm_id: farmId,
            status: { in: ['PENDING', 'OVERDUE'] },
            due_date: {
                lte: new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000),
            },
        },
        include: {
            farm: { select: { name: true } },
        },
        orderBy: { due_date: 'asc' },
    });

    return taxes.map((tax) => ({
        farm_id: tax.farm_id,
        farm_name: tax.farm.name,
        tax_type: tax.tax_type,
        period: tax.period,
        due_date: tax.due_date,
        days_until_due: Math.ceil(
            (tax.due_date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
        ),
        amount: tax.amount ? Number(tax.amount) : undefined,
    }));
}
