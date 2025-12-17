// src/cron/index.ts
// Cron Jobs Scheduler for LABA ERP
// Task 12 Phase 3

import cron from 'node-cron';
import { withLock } from '@/lib/distributed-lock';
import { calculateMonthlyDepreciation } from '@/services/asset.service';
import { sendTaxReminders } from '@/lib/notifications/tax-reminders';
import { syncAllFarms } from '@/lib/tax/sync-service';
import { updateTaxScheduleStatus } from '@/services/tax-schedule.service';

// ==========================================
// CRON INITIALIZATION
// ==========================================

let initialized = false;

/**
 * Initialize all cron jobs
 * Should be called once on server startup
 */
export function initCronJobs() {
    if (initialized) {
        console.log('[CRON] Already initialized, skipping...');
        return;
    }

    console.log('[CRON] Initializing cron jobs...');

    // 1. Monthly Depreciation - Day 1 of each month at 00:00
    cron.schedule('0 0 1 * *', async () => {
        const lockKey = `cron:depreciation:${formatMonth(new Date())}`;

        await withLock(lockKey, 7200, async () => {
            console.log('[CRON] Starting monthly depreciation...');
            try {
                const result = await calculateMonthlyDepreciation();
                console.log(`[CRON] Depreciation done: ${result.processed} processed, ${result.skipped} skipped`);
            } catch (error) {
                console.error('[CRON] Depreciation error:', error);
            }
        });
    });
    console.log('[CRON] ✓ Monthly depreciation scheduled (Day 1, 00:00)');

    // 2. Tax Reminders - Daily at 08:00
    cron.schedule('0 8 * * *', async () => {
        const lockKey = `cron:tax-reminder:${formatDate(new Date())}`;

        await withLock(lockKey, 3600, async () => {
            console.log('[CRON] Sending tax reminders...');
            try {
                const result = await sendTaxReminders();
                console.log(`[CRON] Tax reminders sent: ${result.sent}, failed: ${result.failed}`);
            } catch (error) {
                console.error('[CRON] Tax reminder error:', error);
            }
        });
    });
    console.log('[CRON] ✓ Tax reminders scheduled (Daily, 08:00)');

    // 3. Tax Status Update - Daily at 00:00
    cron.schedule('0 0 * * *', async () => {
        const lockKey = `cron:tax-status:${formatDate(new Date())}`;

        await withLock(lockKey, 3600, async () => {
            console.log('[CRON] Updating tax schedule status...');
            try {
                const result = await updateTaxScheduleStatus();
                console.log(`[CRON] Tax status updated: ${result.updated} changes`);
            } catch (error) {
                console.error('[CRON] Tax status update error:', error);
            }
        });
    });
    console.log('[CRON] ✓ Tax status update scheduled (Daily, 00:00)');

    // 4. Tax Rules Sync - Weekly on Sunday at 00:00
    cron.schedule('0 0 * * 0', async () => {
        const lockKey = `cron:tax-sync:${formatWeek(new Date())}`;

        await withLock(lockKey, 7200, async () => {
            console.log('[CRON] Syncing tax rules for all farms...');
            try {
                const result = await syncAllFarms();
                console.log(`[CRON] Tax rules synced: ${result.synced}/${result.total} farms`);
            } catch (error) {
                console.error('[CRON] Tax sync error:', error);
            }
        });
    });
    console.log('[CRON] ✓ Tax rules sync scheduled (Sunday, 00:00)');

    initialized = true;
    console.log('[CRON] All cron jobs initialized successfully');
}

// ==========================================
// MANUAL TRIGGERS (for testing/admin)
// ==========================================

/**
 * Manually trigger depreciation calculation
 */
export async function triggerDepreciation(): Promise<{
    processed: number;
    skipped: number;
}> {
    console.log('[CRON] Manual depreciation triggered');
    return await calculateMonthlyDepreciation();
}

/**
 * Manually trigger tax reminders
 */
export async function triggerTaxReminders(): Promise<{
    sent: number;
    failed: number;
}> {
    console.log('[CRON] Manual tax reminders triggered');
    const result = await sendTaxReminders();
    return { sent: result.sent, failed: result.failed };
}

/**
 * Manually trigger tax status update
 */
export async function triggerTaxStatusUpdate(): Promise<{
    updated: number;
    overdue: number;
}> {
    console.log('[CRON] Manual tax status update triggered');
    const result = await updateTaxScheduleStatus();
    return { updated: result.updated, overdue: result.overdue };
}

/**
 * Manually trigger tax rules sync
 */
export async function triggerTaxSync(): Promise<{
    total: number;
    synced: number;
    errors: string[];
}> {
    console.log('[CRON] Manual tax sync triggered');
    return await syncAllFarms();
}

// ==========================================
// DATE FORMAT HELPERS
// ==========================================

function formatMonth(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatDate(d: Date): string {
    return d.toISOString().split('T')[0];
}

function formatWeek(d: Date): string {
    const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
    const days = Math.floor(
        (d.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000)
    );
    const week = Math.ceil((days + firstDayOfYear.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

// ==========================================
// STATUS CHECK
// ==========================================

/**
 * Get cron jobs status
 */
export function getCronStatus(): {
    initialized: boolean;
    jobs: Array<{
        name: string;
        schedule: string;
        description: string;
    }>;
} {
    return {
        initialized,
        jobs: [
            {
                name: 'Monthly Depreciation',
                schedule: '0 0 1 * *',
                description: 'Calculate monthly depreciation for all assets',
            },
            {
                name: 'Tax Reminders',
                schedule: '0 8 * * *',
                description: 'Send tax deadline reminders',
            },
            {
                name: 'Tax Status Update',
                schedule: '0 0 * * *',
                description: 'Update overdue tax schedules',
            },
            {
                name: 'Tax Rules Sync',
                schedule: '0 0 * * 0',
                description: 'Sync tax rules from master JSON',
            },
        ],
    };
}
