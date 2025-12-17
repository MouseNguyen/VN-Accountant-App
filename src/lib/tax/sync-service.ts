// src/lib/tax/sync-service.ts
// Hybrid Tax Sync Engine - Task 9
// Auto-sync tax rules from Master JSON with user override protection

import { prisma } from '@/lib/prisma';
import { TaxRuleType, TaxRuleAction } from '@prisma/client';

// ==========================================
// TYPES
// ==========================================

interface MasterRule {
    code: string;
    rule_type: string;
    category: string;
    action: string;
    value: number;
    limit_value?: number | null;
    condition?: Record<string, unknown>;
    description: string;
    reference?: string;
    effective_from: string;
}

interface MasterData {
    version: number;
    effective_date: string;
    changelog?: string;
    breaking_changes?: BreakingChange[];
    rules: MasterRule[];
}

interface BreakingChange {
    rule_code: string;
    from_value: number;
    to_value: number;
    effective_date: string;
    impact: 'LOW' | 'MEDIUM' | 'HIGH';
    notification_priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export interface SyncResult {
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
    version: number;
}

export interface SyncPreview {
    will_create: MasterRule[];
    will_update: Array<{
        code: string;
        description: string;
        old_value: number;
        new_value: number;
    }>;
    will_skip: Array<{
        code: string;
        description: string;
        reason: string;
        user_value: number;
        master_value: number;
    }>;
    breaking_changes: BreakingChange[];
    master_version: number;
    current_version: number | null;
}

export interface UpdateCheckResult {
    has_updates: boolean;
    current_version: number | null;
    latest_version: number;
    changelog?: string;
    breaking_changes?: BreakingChange[];
}

// ==========================================
// FETCH MASTER JSON
// ==========================================

const MASTER_SOURCES = [
    // Add CDN URL in production
    // 'https://cdn.laba.vn/tax-rules/master.json',
    '/tax-rules-master.json', // Local file
];

export async function fetchMasterJson(): Promise<MasterData> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    for (const source of MASTER_SOURCES) {
        try {
            const url = source.startsWith('http') ? source : `${baseUrl}${source}`;
            const res = await fetch(url, {
                cache: 'no-store',
                headers: { 'Content-Type': 'application/json' },
            });

            if (res.ok) {
                return res.json();
            }
        } catch (error) {
            console.warn(`Failed to fetch from ${source}:`, error);
        }
    }

    throw new Error('Không thể tải master rules từ tất cả nguồn');
}

// ==========================================
// CHECK FOR UPDATES
// ==========================================

export async function checkForUpdates(farmId: string): Promise<UpdateCheckResult> {
    const masterData = await fetchMasterJson();

    const lastSync = await prisma.taxRule.findFirst({
        where: { farm_id: farmId },
        orderBy: { synced_at: 'desc' },
        select: { master_version: true },
    });

    const currentVersion = lastSync?.master_version || null;
    const hasUpdates = !currentVersion || currentVersion < masterData.version;

    return {
        has_updates: hasUpdates,
        current_version: currentVersion,
        latest_version: masterData.version,
        changelog: masterData.changelog,
        breaking_changes: hasUpdates ? masterData.breaking_changes : [],
    };
}

// ==========================================
// PREVIEW SYNC (without applying)
// ==========================================

export async function previewSync(farmId: string): Promise<SyncPreview> {
    const masterData = await fetchMasterJson();

    const farmRules = await prisma.taxRule.findMany({
        where: { farm_id: farmId },
    });

    const preview: SyncPreview = {
        will_create: [],
        will_update: [],
        will_skip: [],
        breaking_changes: masterData.breaking_changes || [],
        master_version: masterData.version,
        current_version: farmRules[0]?.master_version || null,
    };

    for (const masterRule of masterData.rules) {
        const farmRule = farmRules.find((r) => r.code === masterRule.code);

        if (!farmRule) {
            // New rule
            preview.will_create.push(masterRule);
        } else if (farmRule.is_overridden) {
            // User overridden - skip
            preview.will_skip.push({
                code: masterRule.code,
                description: masterRule.description,
                reason: 'User đã tùy chỉnh giá trị',
                user_value: Number(farmRule.value),
                master_value: masterRule.value,
            });
        } else if (Number(farmRule.value) !== masterRule.value) {
            // Will update
            preview.will_update.push({
                code: masterRule.code,
                description: masterRule.description,
                old_value: Number(farmRule.value),
                new_value: masterRule.value,
            });
        }
    }

    return preview;
}

// ==========================================
// SYNC TAX RULES FOR SINGLE FARM
// ==========================================

export async function syncTaxRules(farmId: string): Promise<SyncResult> {
    const masterData = await fetchMasterJson();
    const masterVersion = masterData.version;

    console.log(`[TaxSync] Starting sync for farm ${farmId}, master v${masterVersion}`);

    const result: SyncResult = {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [],
        version: masterVersion,
    };

    await prisma.$transaction(async (tx) => {
        for (const masterRule of masterData.rules) {
            try {
                const existingRule = await tx.taxRule.findUnique({
                    where: {
                        farm_id_code: { farm_id: farmId, code: masterRule.code },
                    },
                });

                if (!existingRule) {
                    // === CASE A: CREATE NEW ===
                    const newRule = await tx.taxRule.create({
                        data: {
                            farm_id: farmId,
                            code: masterRule.code,
                            rule_type: masterRule.rule_type as TaxRuleType,
                            category: masterRule.category,
                            action: masterRule.action as TaxRuleAction,
                            value: masterRule.value,
                            limit_value: masterRule.limit_value,
                            original_value: masterRule.value,
                            condition: masterRule.condition
                                ? JSON.stringify(masterRule.condition)
                                : undefined,
                            description: masterRule.description,
                            reference: masterRule.reference,
                            effective_from: new Date(masterRule.effective_from),
                            is_system: true,
                            is_overridden: false,
                            is_active: true,
                            master_version: masterVersion,
                            synced_at: new Date(),
                        },
                    });

                    // Record history
                    await tx.taxRuleHistory.create({
                        data: {
                            tax_rule_id: newRule.id,
                            farm_id: farmId,
                            action: 'SYNC_CREATE',
                            new_value: masterRule.value,
                            master_version: masterVersion,
                            note: `Tạo mới từ Master v${masterVersion}`,
                        },
                    });

                    result.created++;
                } else if (existingRule.is_overridden) {
                    // === CASE B: USER OVERRIDDEN - Skip value update ===
                    await tx.taxRule.update({
                        where: { id: existingRule.id },
                        data: {
                            // Update metadata only, NOT value
                            description: masterRule.description,
                            reference: masterRule.reference,
                            original_value: masterRule.value,
                            master_version: masterVersion,
                            synced_at: new Date(),
                        },
                    });

                    console.log(
                        `[TaxSync] Rule ${masterRule.code} is overridden, skipping value update`
                    );
                    result.skipped++;
                } else {
                    // === CASE C: UPDATE ALL ===
                    const oldValue = Number(existingRule.value);
                    const valueChanged = oldValue !== masterRule.value;

                    await tx.taxRule.update({
                        where: { id: existingRule.id },
                        data: {
                            value: masterRule.value,
                            original_value: masterRule.value,
                            limit_value: masterRule.limit_value,
                            condition: masterRule.condition
                                ? JSON.stringify(masterRule.condition)
                                : undefined,
                            description: masterRule.description,
                            reference: masterRule.reference,
                            effective_from: new Date(masterRule.effective_from),
                            master_version: masterVersion,
                            synced_at: new Date(),
                        },
                    });

                    if (valueChanged) {
                        await tx.taxRuleHistory.create({
                            data: {
                                tax_rule_id: existingRule.id,
                                farm_id: farmId,
                                action: 'SYNC_UPDATE',
                                old_value: oldValue,
                                new_value: masterRule.value,
                                master_version: masterVersion,
                                note: `Cập nhật từ Master v${masterVersion}: ${oldValue} → ${masterRule.value}`,
                            },
                        });
                        result.updated++;
                    }
                }
            } catch (error) {
                const errorMsg = `Failed to sync rule ${masterRule.code}: ${error}`;
                console.error(`[TaxSync] ${errorMsg}`);
                result.errors.push(errorMsg);
            }
        }
    });

    console.log(
        `[TaxSync] Completed: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`
    );

    return result;
}

// ==========================================
// SYNC ALL FARMS
// ==========================================

export async function syncAllFarms(): Promise<{
    total: number;
    synced: number;
    errors: string[];
}> {
    const masterData = await fetchMasterJson();

    const farms = await prisma.farm.findMany({
        select: { id: true, name: true },
    });

    let synced = 0;
    const errors: string[] = [];

    for (const farm of farms) {
        try {
            const lastSync = await prisma.taxRule.findFirst({
                where: { farm_id: farm.id },
                orderBy: { synced_at: 'desc' },
                select: { master_version: true },
            });

            const needsSync =
                !lastSync || (lastSync.master_version || 0) < masterData.version;

            if (needsSync) {
                await syncTaxRules(farm.id);
                synced++;
                console.log(`[TaxSync] Synced farm: ${farm.name}`);
            }
        } catch (error) {
            const errorMsg = `Failed to sync farm ${farm.id}: ${error}`;
            console.error(`[TaxSync] ${errorMsg}`);
            errors.push(errorMsg);
        }
    }

    return {
        total: farms.length,
        synced,
        errors,
    };
}

// ==========================================
// RESET SINGLE RULE TO DEFAULT
// ==========================================

export async function resetRuleToDefault(
    farmId: string,
    ruleId: string
): Promise<{ success: boolean; new_value: number }> {
    const rule = await prisma.taxRule.findFirst({
        where: { id: ruleId, farm_id: farmId },
    });

    if (!rule) {
        throw new Error('Rule not found');
    }

    if (!rule.original_value) {
        throw new Error('No original value available');
    }

    const oldValue = Number(rule.value);
    const newValue = Number(rule.original_value);

    await prisma.$transaction(async (tx) => {
        await tx.taxRule.update({
            where: { id: ruleId },
            data: {
                value: newValue,
                is_overridden: false,
            },
        });

        await tx.taxRuleHistory.create({
            data: {
                tax_rule_id: ruleId,
                farm_id: farmId,
                action: 'RESET',
                old_value: oldValue,
                new_value: newValue,
                note: 'Khôi phục về giá trị mặc định',
            },
        });
    });

    return { success: true, new_value: newValue };
}

// ==========================================
// UPDATE RULE (USER OVERRIDE)
// ==========================================

export async function updateRuleValue(
    farmId: string,
    ruleId: string,
    newValue: number,
    userId?: string
): Promise<{ success: boolean }> {
    const rule = await prisma.taxRule.findFirst({
        where: { id: ruleId, farm_id: farmId },
    });

    if (!rule) {
        throw new Error('Rule not found');
    }

    const oldValue = Number(rule.value);

    await prisma.$transaction(async (tx) => {
        await tx.taxRule.update({
            where: { id: ruleId },
            data: {
                value: newValue,
                is_overridden: true,
            },
        });

        await tx.taxRuleHistory.create({
            data: {
                tax_rule_id: ruleId,
                farm_id: farmId,
                action: 'USER_OVERRIDE',
                old_value: oldValue,
                new_value: newValue,
                note: `User ${userId ? `(${userId})` : ''} đã thay đổi giá trị: ${oldValue} → ${newValue}`,
            },
        });
    });

    return { success: true };
}

// ==========================================
// GET RULE HISTORY
// ==========================================

export async function getRuleHistory(
    farmId: string,
    ruleId: string
): Promise<
    Array<{
        id: string;
        action: string;
        old_value: number | null;
        new_value: number | null;
        master_version: number | null;
        note: string | null;
        created_at: Date;
    }>
> {
    const history = await prisma.taxRuleHistory.findMany({
        where: {
            tax_rule_id: ruleId,
            farm_id: farmId,
        },
        orderBy: { created_at: 'desc' },
        take: 20,
    });

    return history.map((h) => ({
        id: h.id,
        action: h.action,
        old_value: h.old_value ? Number(h.old_value) : null,
        new_value: h.new_value ? Number(h.new_value) : null,
        master_version: h.master_version,
        note: h.note,
        created_at: h.created_at,
    }));
}
