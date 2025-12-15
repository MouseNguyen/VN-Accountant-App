// src/lib/tax/rules-evaluator.ts
// Rule condition evaluator for Tax Engine

import { RuleCondition, EvaluationContext } from '@/types/tax-engine';

/**
 * Đánh giá một điều kiện với context
 * @returns true nếu điều kiện được thỏa mãn
 */
export function evaluateCondition(
    condition: RuleCondition | null | undefined,
    context: EvaluationContext
): boolean {
    // Không có điều kiện = luôn áp dụng
    if (!condition || Object.keys(condition).length === 0) {
        return true;
    }

    // Xử lý logical operators trước
    if (condition.AND) {
        return condition.AND.every(c => evaluateCondition(c, context));
    }

    if (condition.OR) {
        return condition.OR.some(c => evaluateCondition(c, context));
    }

    if (condition.NOT) {
        return !evaluateCondition(condition.NOT, context);
    }

    // Đánh giá từng điều kiện
    const results: boolean[] = [];

    // Amount comparisons
    if (condition.amount_gte !== undefined) {
        const amount = context.amount ?? context.total_amount ?? 0;
        results.push(amount >= condition.amount_gte);
    }

    if (condition.amount_lte !== undefined) {
        const amount = context.amount ?? context.total_amount ?? 0;
        results.push(amount <= condition.amount_lte);
    }

    if (condition.amount_gt !== undefined) {
        const amount = context.amount ?? context.total_amount ?? 0;
        results.push(amount > condition.amount_gt);
    }

    if (condition.amount_lt !== undefined) {
        const amount = context.amount ?? context.total_amount ?? 0;
        results.push(amount < condition.amount_lt);
    }

    // Payment method
    if (condition.payment_method !== undefined) {
        results.push(context.payment_method === condition.payment_method);
    }

    if (condition.payment_method_not !== undefined) {
        results.push(context.payment_method !== condition.payment_method_not);
    }

    // Vehicle
    if (condition.vehicle_type !== undefined) {
        results.push(context.vehicle_type === condition.vehicle_type);
    }

    if (condition.seats_lt !== undefined) {
        results.push((context.seats ?? 0) < condition.seats_lt);
    }

    if (condition.seats_gte !== undefined) {
        results.push((context.seats ?? 0) >= condition.seats_gte);
    }

    // Supplier tax code
    if (condition.supplier_tax_code === null) {
        // Check if supplier_tax_code is missing/empty
        results.push(!context.supplier_tax_code);
    } else if (condition.supplier_tax_code !== undefined) {
        results.push(context.supplier_tax_code === condition.supplier_tax_code);
    }

    // Invoice age
    if (condition.invoice_age_years_gt !== undefined) {
        const invoiceDate = context.invoice_date ?? new Date();
        const now = context.current_date ?? new Date();
        const years = (now.getTime() - invoiceDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        results.push(years > condition.invoice_age_years_gt);
    }

    // Labor contract
    if (condition.has_labor_contract !== undefined) {
        results.push(context.has_labor_contract === condition.has_labor_contract);
    }

    // Entertainment
    if (condition.amount_per_person_gte !== undefined) {
        results.push((context.amount_per_person ?? 0) >= condition.amount_per_person_gte);
    }

    if (condition.entertainment_ratio_gt !== undefined) {
        const ratio = context.total_expenses
            ? ((context.total_entertainment ?? 0) / Number(context.total_expenses)) * 100
            : 0;
        results.push(ratio > condition.entertainment_ratio_gt);
    }

    // Depreciation
    if (condition.depreciation_exceeds_tt45 !== undefined) {
        results.push(context.depreciation_exceeds_tt45 === condition.depreciation_exceeds_tt45);
    }

    // Category
    if (condition.category_in !== undefined) {
        results.push(condition.category_in.includes(context.category ?? ''));
    }

    if (condition.category_not_in !== undefined) {
        results.push(!condition.category_not_in.includes(context.category ?? ''));
    }

    // Date
    if (condition.date_before !== undefined) {
        const targetDate = new Date(condition.date_before);
        const checkDate = context.current_date ?? new Date();
        results.push(checkDate < targetDate);
    }

    if (condition.date_after !== undefined) {
        const targetDate = new Date(condition.date_after);
        const checkDate = context.current_date ?? new Date();
        results.push(checkDate > targetDate);
    }

    // Tất cả điều kiện phải thỏa mãn (AND logic)
    return results.length === 0 || results.every(r => r);
}

/**
 * Kiểm tra rule có trong thời hạn hiệu lực không
 */
export function isRuleEffective(
    effectiveFrom: Date | string | null | undefined,
    effectiveTo: Date | string | null | undefined,
    checkDate: Date = new Date()
): boolean {
    if (effectiveFrom) {
        const fromDate = new Date(effectiveFrom);
        if (checkDate < fromDate) return false;
    }

    if (effectiveTo) {
        const toDate = new Date(effectiveTo);
        if (checkDate > toDate) return false;
    }

    return true;
}

/**
 * Parse condition từ JSON string hoặc object
 */
export function parseCondition(condition: unknown): RuleCondition | null {
    if (!condition) return null;

    if (typeof condition === 'string') {
        try {
            return JSON.parse(condition) as RuleCondition;
        } catch {
            return null;
        }
    }

    return condition as RuleCondition;
}
