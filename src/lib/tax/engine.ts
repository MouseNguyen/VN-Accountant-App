// src/lib/tax/engine.ts
// Tax Rules Engine Core - Phase 3

import { prisma } from '@/lib/prisma';
import { TaxRuleType, TaxRuleAction } from '@prisma/client';
import {
    TaxRule,
    EvaluationContext,
    RuleEvaluationResult,
    RuleEngineResult,
} from '@/types/tax-engine';
import { evaluateCondition, isRuleEffective, parseCondition } from './rules-evaluator';

// ==========================================
// GET RULES
// ==========================================

export async function getRulesForFarm(
    farmId: string,
    ruleType?: TaxRuleType
): Promise<TaxRule[]> {
    const where: {
        farm_id: string;
        is_active: boolean;
        rule_type?: TaxRuleType;
    } = {
        farm_id: farmId,
        is_active: true,
    };

    if (ruleType) where.rule_type = ruleType;

    const rules = await prisma.taxRule.findMany({
        where,
        orderBy: [
            { priority: 'asc' },
            { created_at: 'asc' },
        ],
    });

    return rules.map(formatTaxRule);
}

// ==========================================
// APPLY SINGLE RULE
// ==========================================

export function applyRule(
    rule: TaxRule,
    context: EvaluationContext
): RuleEvaluationResult {
    const result: RuleEvaluationResult = {
        rule_id: rule.id,
        rule_code: rule.code,
        is_applicable: false,
        is_passed: true,
        action: rule.action,
        message: '',
    };

    // 1. Kiểm tra thời hạn hiệu lực
    if (!isRuleEffective(
        rule.effective_from,
        rule.effective_to,
        context.current_date ?? new Date()
    )) {
        result.message = 'Rule hết hiệu lực';
        return result;
    }

    // 2. Parse condition
    const condition = parseCondition(rule.condition);

    // 3. Đánh giá điều kiện
    const conditionMet = evaluateCondition(condition, context);
    result.is_applicable = true;
    result.details = { condition_met: conditionMet };

    // 4. Áp dụng action dựa trên kết quả
    switch (rule.action) {
        case 'DENY':
            if (conditionMet) {
                result.is_passed = false;
                result.message = rule.description ?? 'Không được phép';
            } else {
                result.message = 'Đạt yêu cầu';
            }
            break;

        case 'ALLOW':
            result.is_passed = conditionMet;
            result.message = conditionMet ? 'Được phép' : 'Không đạt điều kiện';
            break;

        case 'LIMIT':
            if (conditionMet) {
                const baseAmount = context.amount ?? context.total_amount ?? 0;
                const limit = rule.limit_value ?? rule.value;

                if (baseAmount > limit) {
                    result.is_passed = false;
                    result.result_value = limit;
                    result.details.exceeded_amount = baseAmount - limit;
                    result.details.limit = limit;
                    result.message = `Vượt giới hạn ${limit.toLocaleString('vi-VN')}đ`;
                } else {
                    result.result_value = baseAmount;
                    result.message = 'Trong giới hạn cho phép';
                }
            }
            break;

        case 'ADD_BACK':
            if (conditionMet) {
                result.is_passed = false;
                result.result_value = context.amount ?? 0;
                result.message = rule.description ?? 'Điều chỉnh tăng';
            }
            break;

        case 'DEDUCT':
            result.result_value = rule.value;
            result.message = `Giảm trừ ${rule.value.toLocaleString('vi-VN')}đ`;
            break;

        case 'SET_RATE':
            result.result_value = rule.value;
            result.message = `Thuế suất ${rule.value}%`;
            break;

        case 'WARN':
            if (conditionMet) {
                result.is_passed = true; // Still passes but with warning
                result.message = `⚠️ ${rule.description ?? 'Cảnh báo'}`;
            } else {
                result.message = 'Không có cảnh báo';
            }
            break;

        case 'PARTIAL':
            // PARTIAL action: Calculate ratio-based deduction (e.g., VAT_CAR_LUXURY 1.6B cap)
            if (conditionMet) {
                const originalAmount = context.amount ?? context.total_amount ?? 0;
                const cap = rule.value; // e.g., 1,600,000,000 for car luxury

                if (originalAmount > cap) {
                    const ratio = cap / originalAmount;
                    const deductibleAmount = (context.vat_amount ?? context.tax_amount ?? 0) * ratio;
                    const nonDeductibleAmount = (context.vat_amount ?? context.tax_amount ?? 0) * (1 - ratio);

                    result.is_passed = false; // Partially rejected
                    result.result_value = deductibleAmount;
                    result.details = {
                        ...result.details,
                        deductible_amount: deductibleAmount,
                        addback_amount: nonDeductibleAmount,
                        exceeded_amount: originalAmount - cap,
                        limit: cap,
                    };
                    result.message = `Chỉ khấu trừ ${Math.round(ratio * 100)}% (${deductibleAmount.toLocaleString('vi-VN')}đ)`;
                } else {
                    // Under cap - fully deductible
                    result.is_passed = true;
                    result.result_value = context.vat_amount ?? context.tax_amount ?? 0;
                    result.message = 'Được khấu trừ toàn bộ';
                }
            }
            break;

        case 'CALCULATE':
            // Dành cho PIT progressive tax - xử lý riêng
            result.message = 'Tính toán theo công thức';
            break;
    }

    return result;
}

// ==========================================
// EVALUATE MULTIPLE RULES
// ==========================================

export async function evaluateRules(
    farmId: string,
    ruleType: TaxRuleType,
    context: EvaluationContext
): Promise<RuleEngineResult> {
    const rules = await getRulesForFarm(farmId, ruleType);

    const result: RuleEngineResult = {
        is_allowed: true,
        applied_rules: [],
        errors: [],
        warnings: [],
    };

    for (const rule of rules) {
        const ruleResult = applyRule(rule, context);

        if (ruleResult.is_applicable) {
            result.applied_rules.push(ruleResult);

            // Collect errors and warnings
            if (!ruleResult.is_passed) {
                if (rule.action === 'DENY') {
                    result.is_allowed = false;
                    result.errors.push(ruleResult.message);
                } else if (rule.action === 'LIMIT') {
                    result.warnings.push(ruleResult.message);
                } else if (rule.action === 'ADD_BACK') {
                    result.adjustments = (result.adjustments ?? 0) + (ruleResult.result_value ?? 0);
                }
            }

            // Collect warnings
            if (rule.action === 'WARN' && ruleResult.message.startsWith('⚠️')) {
                result.warnings.push(ruleResult.message);
            }
        }
    }

    return result;
}

// ==========================================
// GET SPECIFIC RULE VALUE
// ==========================================

export async function getRuleValue(
    farmId: string,
    ruleCode: string
): Promise<number> {
    const rule = await prisma.taxRule.findUnique({
        where: { farm_id_code: { farm_id: farmId, code: ruleCode } },
    });

    if (!rule || !rule.is_active) {
        throw new Error(`Rule ${ruleCode} không tồn tại hoặc không hoạt động`);
    }

    return Number(rule.value);
}

// ==========================================
// UPDATE RULE VALUE (User Override)
// ==========================================

export async function updateRuleValue(
    farmId: string,
    ruleId: string,
    newValue: number,
    userId: string
): Promise<TaxRule> {
    const rule = await prisma.taxRule.findFirst({
        where: { id: ruleId, farm_id: farmId },
    });

    if (!rule) throw new Error('Rule không tồn tại');

    const oldValue = Number(rule.value);

    // Update rule
    const updated = await prisma.taxRule.update({
        where: { id: ruleId },
        data: {
            value: newValue,
            is_overridden: true,
        },
    });

    // Log history
    await prisma.taxRuleHistory.create({
        data: {
            tax_rule_id: ruleId,
            farm_id: farmId,
            action: 'USER_OVERRIDE',
            old_value: oldValue,
            new_value: newValue,
            created_by: userId,
            note: 'Người dùng chỉnh sửa thủ công',
        },
    });

    return formatTaxRule(updated);
}

// ==========================================
// RESET RULE TO DEFAULT
// ==========================================

export async function resetRuleToDefault(
    farmId: string,
    ruleId: string,
    userId: string
): Promise<TaxRule> {
    const rule = await prisma.taxRule.findFirst({
        where: { id: ruleId, farm_id: farmId },
    });

    if (!rule) throw new Error('Rule không tồn tại');

    const oldValue = Number(rule.value);
    const originalValue = Number(rule.original_value ?? rule.value);

    const updated = await prisma.taxRule.update({
        where: { id: ruleId },
        data: {
            value: originalValue,
            is_overridden: false,
        },
    });

    // Log history
    await prisma.taxRuleHistory.create({
        data: {
            tax_rule_id: ruleId,
            farm_id: farmId,
            action: 'USER_RESET',
            old_value: oldValue,
            new_value: originalValue,
            created_by: userId,
            note: 'Khôi phục về mặc định',
        },
    });

    return formatTaxRule(updated);
}

// ==========================================
// GET RULE HISTORY
// ==========================================

export async function getRuleHistory(
    ruleId: string,
    limit = 20
) {
    const history = await prisma.taxRuleHistory.findMany({
        where: { tax_rule_id: ruleId },
        orderBy: { created_at: 'desc' },
        take: limit,
    });

    return history.map(h => ({
        id: h.id,
        action: h.action,
        old_value: h.old_value ? Number(h.old_value) : null,
        new_value: h.new_value ? Number(h.new_value) : null,
        note: h.note,
        created_at: h.created_at.toISOString(),
        created_by: h.created_by,
    }));
}

// ==========================================
// HELPER
// ==========================================

function formatTaxRule(rule: {
    id: string;
    farm_id: string;
    code: string;
    rule_type: TaxRuleType;
    category: string;
    action: TaxRuleAction;
    condition: unknown;
    value: { toNumber?: () => number } | number;
    limit_value: { toNumber?: () => number } | number | null;
    name: string | null;
    description: string | null;
    reference: string | null;
    effective_from: Date | null;
    effective_to: Date | null;
    original_value: { toNumber?: () => number } | number | null;
    is_system: boolean;
    is_overridden: boolean;
    is_active: boolean;
    priority: number;
    master_version: number | null;
    synced_at: Date | null;
}): TaxRule {
    return {
        id: rule.id,
        farm_id: rule.farm_id,
        code: rule.code,
        rule_type: rule.rule_type,
        category: rule.category,
        action: rule.action,
        condition: rule.condition as TaxRule['condition'],
        value: typeof rule.value === 'object' && rule.value?.toNumber
            ? rule.value.toNumber()
            : Number(rule.value),
        limit_value: rule.limit_value
            ? (typeof rule.limit_value === 'object' && rule.limit_value?.toNumber
                ? rule.limit_value.toNumber()
                : Number(rule.limit_value))
            : undefined,
        name: rule.name ?? undefined,
        description: rule.description ?? undefined,
        reference: rule.reference ?? undefined,
        effective_from: rule.effective_from?.toISOString().split('T')[0],
        effective_to: rule.effective_to?.toISOString().split('T')[0],
        original_value: rule.original_value
            ? (typeof rule.original_value === 'object' && rule.original_value?.toNumber
                ? rule.original_value.toNumber()
                : Number(rule.original_value))
            : undefined,
        is_system: rule.is_system,
        is_overridden: rule.is_overridden,
        is_active: rule.is_active,
        priority: rule.priority,
        master_version: rule.master_version ?? undefined,
        synced_at: rule.synced_at?.toISOString(),
    };
}
