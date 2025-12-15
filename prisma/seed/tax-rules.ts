// prisma/seed/tax-rules.ts
// Quy tắc thuế theo quy định Việt Nam - Tax Engine Logic 2025
// Based on: TAX_ENGINE_LOGIC_2025.md (TT219, TT96, TT111)
// Seed khi tạo Farm mới - có thể override từng farm

import { PrismaClient, TaxRuleType, TaxRuleAction } from '@prisma/client';

export const TAX_RULES_SEED = [
    // ==================== VAT RATE RULES (3) ====================
    {
        code: 'VAT_STANDARD',
        rule_type: 'VAT_RATE' as TaxRuleType,
        category: 'GENERAL',
        action: 'SET_RATE' as TaxRuleAction,
        value: 10,
        priority: 100,
        description: 'Thuế suất VAT tiêu chuẩn',
        reference: 'Luật thuế GTGT',
        effective_from: new Date('2024-01-01'),
    },
    {
        code: 'VAT_AGRI_5',
        rule_type: 'VAT_RATE' as TaxRuleType,
        category: 'AGRI_PROD',
        action: 'SET_RATE' as TaxRuleAction,
        value: 5,
        priority: 100,
        description: 'Thuế suất VAT nông sản thương mại',
        reference: 'TT219/2013/TT-BTC',
        effective_from: new Date('2024-01-01'),
    },
    {
        code: 'VAT_AGRI_0',
        rule_type: 'VAT_RATE' as TaxRuleType,
        category: 'AGRI_RAW',
        action: 'SET_RATE' as TaxRuleAction,
        value: 0,
        priority: 100,
        description: 'Thuế suất VAT nông sản sơ chế',
        reference: 'TT219/2013/TT-BTC',
        effective_from: new Date('2024-01-01'),
    },

    // ==================== VAT VALIDATION RULES (5) ====================
    // Based on TAX_ENGINE_LOGIC_2025.md Section 1
    {
        code: 'VAT_NON_CASH',
        rule_type: 'VAT_DEDUCTIBLE' as TaxRuleType,
        category: 'PAYMENT_METHOD',
        action: 'DENY' as TaxRuleAction,
        value: 20000000,
        priority: 10,
        condition: {
            AND: [
                { amount_gte: 20000000 },
                { payment_method: 'CASH' }
            ]
        },
        description: 'HĐ >= 20tr VND thanh toán tiền mặt không được khấu trừ VAT',
        reference: 'TT219/2013/TT-BTC Điều 15',
        effective_from: new Date('2014-01-01'),
    },
    {
        code: 'VAT_CAR_LUXURY',
        rule_type: 'VAT_DEDUCTIBLE' as TaxRuleType,
        category: 'VEHICLE',
        action: 'PARTIAL' as TaxRuleAction,
        value: 1600000000, // 1.6 tỷ
        limit_value: 1600000000,
        priority: 20,
        condition: {
            AND: [
                { asset_type: 'CAR_UNDER_9_SEATS' },
                { original_price_gt: 1600000000 },
                { biz_type_not: 'TRANSPORT' }
            ]
        },
        description: 'Xe < 9 chỗ > 1.6 tỷ: chỉ phần VAT tương ứng 1.6 tỷ được khấu trừ',
        reference: 'TT96/2015/TT-BTC',
        effective_from: new Date('2015-01-01'),
    },
    {
        code: 'VAT_SUPPLIER_STATUS',
        rule_type: 'VAT_DEDUCTIBLE' as TaxRuleType,
        category: 'SUPPLIER',
        action: 'DENY' as TaxRuleAction,
        value: 0,
        priority: 5,
        condition: {
            supplier_status_in: ['SUSPENDED', 'CLOSED', 'BANKRUPT']
        },
        description: 'HĐ từ NCC bị đình chỉ/đóng MST/phá sản không hợp lệ',
        reference: 'TT219/2013/TT-BTC',
        effective_from: new Date('2014-01-01'),
    },
    {
        code: 'VAT_INFO_CHECK',
        rule_type: 'VAT_DEDUCTIBLE' as TaxRuleType,
        category: 'INVOICE_INFO',
        action: 'DENY' as TaxRuleAction,
        value: 0,
        priority: 5,
        condition: {
            OR: [
                { buyer_tax_code: null },
                { buyer_name_mismatch: true }
            ]
        },
        description: 'HĐ thiếu MST hoặc sai tên người mua không được khấu trừ',
        reference: 'TT219/2013/TT-BTC',
        effective_from: new Date('2014-01-01'),
    },
    {
        code: 'VAT_NON_BIZ',
        rule_type: 'VAT_DEDUCTIBLE' as TaxRuleType,
        category: 'USAGE_PURPOSE',
        action: 'DENY' as TaxRuleAction,
        value: 0,
        priority: 15,
        condition: {
            OR: [
                { usage_purpose: 'PERSONAL' },
                { fund_source: 'WELFARE_FUND' }
            ]
        },
        description: 'Chi phí cá nhân hoặc quỹ phúc lợi không được khấu trừ VAT',
        reference: 'TT219/2013/TT-BTC',
        effective_from: new Date('2014-01-01'),
    },

    // ==================== CIT ADD-BACK RULES (6) ====================
    // Based on TAX_ENGINE_LOGIC_2025.md Section 2
    {
        code: 'CIT_PENALTY',
        rule_type: 'CIT_ADD_BACK' as TaxRuleType,
        category: 'ADMIN_PENALTY',
        action: 'ADD_BACK' as TaxRuleAction,
        value: 100, // 100% add-back
        priority: 10,
        condition: {
            expense_type: 'ADMIN_PENALTY'
        },
        description: 'Tiền phạt hành chính (ATGT, thuế...) không được trừ - cộng ngược 100%',
        reference: 'TT78/2014/TT-BTC Điều 6',
        effective_from: new Date('2014-08-01'),
    },
    {
        code: 'CIT_DEPRECIATION_CAP',
        rule_type: 'CIT_ADD_BACK' as TaxRuleType,
        category: 'DEPRECIATION',
        action: 'ADD_BACK' as TaxRuleAction,
        value: 1600000000, // 1.6 tỷ cap
        limit_value: 1600000000,
        priority: 20,
        condition: {
            AND: [
                { asset_type: 'CAR_UNDER_9_SEATS' },
                { purchase_price_gt: 1600000000 },
                { biz_type_not: 'TRANSPORT' }
            ]
        },
        description: 'Khấu hao xe < 9 chỗ > 1.6 tỷ: phần vượt không được trừ',
        reference: 'TT96/2015/TT-BTC',
        effective_from: new Date('2015-01-01'),
    },
    {
        code: 'CIT_WELFARE_CAP',
        rule_type: 'CIT_ADD_BACK' as TaxRuleType,
        category: 'WELFARE',
        action: 'ADD_BACK' as TaxRuleAction,
        value: 1, // 1 month avg salary
        priority: 30,
        condition: {
            expense_type: 'WELFARE'
        },
        description: 'Chi phúc lợi vượt 1 tháng lương bình quân: phần vượt không được trừ',
        reference: 'TT96/2015/TT-BTC Điều 6',
        effective_from: new Date('2015-01-01'),
    },
    {
        code: 'CIT_NO_INVOICE',
        rule_type: 'CIT_ADD_BACK' as TaxRuleType,
        category: 'NO_INVOICE',
        action: 'ADD_BACK' as TaxRuleAction,
        value: 100, // 100% add-back
        priority: 10,
        condition: {
            OR: [
                { has_valid_invoice: false },
                {
                    AND: [
                        { amount_gte: 20000000 },
                        { payment_method: 'CASH' }
                    ]
                }
            ]
        },
        description: 'Chi phí không HĐ hoặc >= 20tr tiền mặt: cộng ngược 100%',
        reference: 'TT96/2015/TT-BTC Điều 6',
        effective_from: new Date('2015-01-01'),
    },
    {
        code: 'CIT_CASUAL_LABOR',
        rule_type: 'CIT_ADD_BACK' as TaxRuleType,
        category: 'CASUAL_LABOR',
        action: 'ADD_BACK' as TaxRuleAction,
        value: 100, // 100% add-back
        priority: 25,
        condition: {
            AND: [
                { labor_type: 'CASUAL' },
                { amount_gte: 2000000 },
                { pit_withheld: 0 },
                { has_commitment_08: false }
            ]
        },
        description: 'Lương LĐ thời vụ >= 2tr không khấu trừ 10% (không có cam kết 08): cộng ngược 100%',
        reference: 'TT96/2015/TT-BTC Điều 6',
        effective_from: new Date('2015-01-01'),
    },
    {
        code: 'CIT_MATERIALS_EXCESS',
        rule_type: 'CIT_ADD_BACK' as TaxRuleType,
        category: 'MATERIALS',
        action: 'ADD_BACK' as TaxRuleAction,
        value: 0, // Calculated: excess quantity * unit price
        priority: 40,
        condition: {
            materials_exceed_norms: true
        },
        description: 'Nguyên vật liệu sử dụng vượt định mức: phần vượt không được trừ',
        reference: 'TT78/2014/TT-BTC Điều 6',
        effective_from: new Date('2014-08-01'),
    },

    // ==================== CIT TAX RATE ====================
    {
        code: 'CIT_TAX_RATE',
        rule_type: 'CIT_ADD_BACK' as TaxRuleType,
        category: 'TAX_RATE',
        action: 'SET_RATE' as TaxRuleAction,
        value: 20,
        priority: 100,
        description: 'Thuế suất thuế TNDN 20%',
        reference: 'Điều 10 Luật Thuế TNDN',
        effective_from: new Date('2014-01-01'),
    },

    // ==================== PIT DEDUCTIONS (3) ====================
    // Based on TAX_ENGINE_LOGIC_2025.md Section 3.A
    {
        code: 'PIT_SELF_DEDUCTION',
        rule_type: 'PIT_DEDUCTION' as TaxRuleType,
        category: 'FAMILY',
        action: 'DEDUCT' as TaxRuleAction,
        value: 11000000,
        priority: 10,
        description: 'Giảm trừ gia cảnh bản thân: 11,000,000đ/tháng',
        reference: 'NQ954/2020/UBTVQH14',
        effective_from: new Date('2020-07-01'),
    },
    {
        code: 'PIT_DEPENDENT_DEDUCTION',
        rule_type: 'PIT_DEDUCTION' as TaxRuleType,
        category: 'FAMILY',
        action: 'DEDUCT' as TaxRuleAction,
        value: 4400000,
        priority: 10,
        description: 'Giảm trừ người phụ thuộc: 4,400,000đ/người/tháng',
        reference: 'NQ954/2020/UBTVQH14',
        effective_from: new Date('2020-07-01'),
    },
    {
        code: 'PIT_INSURANCE_RATE',
        rule_type: 'PIT_DEDUCTION' as TaxRuleType,
        category: 'INSURANCE',
        action: 'DEDUCT' as TaxRuleAction,
        value: 10.5,
        priority: 10,
        description: 'Tỷ lệ BHXH người lao động: 10.5%',
        reference: 'Luật BHXH',
        effective_from: new Date('2024-01-01'),
    },

    // ==================== PIT PROGRESSIVE BRACKETS (7) ====================
    // Based on TAX_ENGINE_LOGIC_2025.md Section 3.B
    {
        code: 'PIT_BRACKET_1',
        rule_type: 'PIT_BRACKET' as TaxRuleType,
        category: 'BRACKET_1',
        action: 'CALCULATE' as TaxRuleAction,
        value: 5, // 5%
        limit_value: 5000000, // 0 - 5M
        priority: 1,
        condition: { bracket: 1, max_income: 5000000 },
        description: 'Bậc 1: 0 - 5M → 5% (Công thức: TNTT × 0.05)',
        reference: 'TT111/2013/TT-BTC',
        effective_from: new Date('2014-01-01'),
    },
    {
        code: 'PIT_BRACKET_2',
        rule_type: 'PIT_BRACKET' as TaxRuleType,
        category: 'BRACKET_2',
        action: 'CALCULATE' as TaxRuleAction,
        value: 10, // 10%
        limit_value: 10000000, // 5M - 10M
        priority: 2,
        condition: { bracket: 2, min_income: 5000001, max_income: 10000000, quick_deduct: 250000 },
        description: 'Bậc 2: 5M - 10M → 10% (Công thức: TNTT × 0.10 - 250,000)',
        reference: 'TT111/2013/TT-BTC',
        effective_from: new Date('2014-01-01'),
    },
    {
        code: 'PIT_BRACKET_3',
        rule_type: 'PIT_BRACKET' as TaxRuleType,
        category: 'BRACKET_3',
        action: 'CALCULATE' as TaxRuleAction,
        value: 15, // 15%
        limit_value: 18000000, // 10M - 18M
        priority: 3,
        condition: { bracket: 3, min_income: 10000001, max_income: 18000000, quick_deduct: 750000 },
        description: 'Bậc 3: 10M - 18M → 15% (Công thức: TNTT × 0.15 - 750,000)',
        reference: 'TT111/2013/TT-BTC',
        effective_from: new Date('2014-01-01'),
    },
    {
        code: 'PIT_BRACKET_4',
        rule_type: 'PIT_BRACKET' as TaxRuleType,
        category: 'BRACKET_4',
        action: 'CALCULATE' as TaxRuleAction,
        value: 20, // 20%
        limit_value: 32000000, // 18M - 32M
        priority: 4,
        condition: { bracket: 4, min_income: 18000001, max_income: 32000000, quick_deduct: 1650000 },
        description: 'Bậc 4: 18M - 32M → 20% (Công thức: TNTT × 0.20 - 1,650,000)',
        reference: 'TT111/2013/TT-BTC',
        effective_from: new Date('2014-01-01'),
    },
    {
        code: 'PIT_BRACKET_5',
        rule_type: 'PIT_BRACKET' as TaxRuleType,
        category: 'BRACKET_5',
        action: 'CALCULATE' as TaxRuleAction,
        value: 25, // 25%
        limit_value: 52000000, // 32M - 52M
        priority: 5,
        condition: { bracket: 5, min_income: 32000001, max_income: 52000000, quick_deduct: 3250000 },
        description: 'Bậc 5: 32M - 52M → 25% (Công thức: TNTT × 0.25 - 3,250,000)',
        reference: 'TT111/2013/TT-BTC',
        effective_from: new Date('2014-01-01'),
    },
    {
        code: 'PIT_BRACKET_6',
        rule_type: 'PIT_BRACKET' as TaxRuleType,
        category: 'BRACKET_6',
        action: 'CALCULATE' as TaxRuleAction,
        value: 30, // 30%
        limit_value: 80000000, // 52M - 80M
        priority: 6,
        condition: { bracket: 6, min_income: 52000001, max_income: 80000000, quick_deduct: 5850000 },
        description: 'Bậc 6: 52M - 80M → 30% (Công thức: TNTT × 0.30 - 5,850,000)',
        reference: 'TT111/2013/TT-BTC',
        effective_from: new Date('2014-01-01'),
    },
    {
        code: 'PIT_BRACKET_7',
        rule_type: 'PIT_BRACKET' as TaxRuleType,
        category: 'BRACKET_7',
        action: 'CALCULATE' as TaxRuleAction,
        value: 35, // 35%
        limit_value: null, // > 80M (unlimited)
        priority: 7,
        condition: { bracket: 7, min_income: 80000001, quick_deduct: 9850000 },
        description: 'Bậc 7: > 80M → 35% (Công thức: TNTT × 0.35 - 9,850,000)',
        reference: 'TT111/2013/TT-BTC',
        effective_from: new Date('2014-01-01'),
    },

    // ==================== PIT FLAT RATE RULES (4) ====================
    // Based on TAX_ENGINE_LOGIC_2025.md Section 3.C
    {
        code: 'PIT_FLAT_0',
        rule_type: 'PIT_DEDUCTION' as TaxRuleType,
        category: 'CASUAL_LABOR',
        action: 'ALLOW' as TaxRuleAction,
        value: 0, // 0% - no withholding
        priority: 10,
        condition: {
            AND: [
                { labor_type_in: ['CASUAL', 'PROBATION'] },
                { amount_lt: 2000000 }
            ]
        },
        description: 'LĐ thời vụ/thử việc thu nhập < 2M: không khấu trừ',
        reference: 'TT111/2013/TT-BTC Điều 25',
        effective_from: new Date('2014-01-01'),
    },
    {
        code: 'PIT_FLAT_10',
        rule_type: 'PIT_DEDUCTION' as TaxRuleType,
        category: 'CASUAL_LABOR',
        action: 'DEDUCT' as TaxRuleAction,
        value: 10, // 10%
        priority: 20,
        condition: {
            AND: [
                { labor_type_in: ['CASUAL', 'PROBATION'] },
                { amount_gte: 2000000 },
                { has_commitment_08: false }
            ]
        },
        description: 'LĐ thời vụ/thử việc thu nhập >= 2M (không cam kết 08): khấu trừ 10%',
        reference: 'TT111/2013/TT-BTC Điều 25',
        effective_from: new Date('2014-01-01'),
    },
    {
        code: 'PIT_COMMITMENT_08',
        rule_type: 'PIT_DEDUCTION' as TaxRuleType,
        category: 'CASUAL_LABOR',
        action: 'ALLOW' as TaxRuleAction,
        value: 0, // 0% - no withholding
        priority: 15,
        condition: {
            AND: [
                { labor_type_in: ['CASUAL', 'PROBATION'] },
                { amount_gte: 2000000 },
                { has_commitment_08: true },
                { estimated_annual_income_lte: 132000000 } // 11M x 12
            ]
        },
        description: 'LĐ có cam kết 08 (ước tính năm < 132M): không khấu trừ',
        reference: 'TT111/2013/TT-BTC Điều 25',
        effective_from: new Date('2014-01-01'),
    },
    {
        code: 'PIT_FLAT_20',
        rule_type: 'PIT_DEDUCTION' as TaxRuleType,
        category: 'NON_RESIDENT',
        action: 'DEDUCT' as TaxRuleAction,
        value: 20, // 20%
        priority: 5,
        condition: {
            is_non_resident: true
        },
        description: 'Lao động không cư trú: khấu trừ 20% toàn phần',
        reference: 'TT111/2013/TT-BTC Điều 18',
        effective_from: new Date('2014-01-01'),
    },
];

const MASTER_VERSION = 20251215;

/**
 * Seed tax rules khi tạo farm mới - Tax Engine 2025
 * Total: 25 rules (3 VAT Rate + 5 VAT Validation + 7 CIT + 10 PIT)
 * @param prisma - Prisma client instance
 * @param farmId - ID của farm vừa tạo
 */
export async function seedTaxRulesForFarm(prisma: PrismaClient, farmId: string) {
    console.log(`🏛️ Seeding tax rules for farm ${farmId}...`);

    for (const rule of TAX_RULES_SEED) {
        await prisma.taxRule.upsert({
            where: {
                farm_id_code: {
                    farm_id: farmId,
                    code: rule.code
                }
            },
            update: {
                rule_type: rule.rule_type,
                category: rule.category,
                action: rule.action,
                value: rule.value,
                limit_value: rule.limit_value,
                condition: rule.condition,
                description: rule.description,
                reference: rule.reference,
                effective_from: rule.effective_from,
                priority: rule.priority,
                original_value: rule.value,
                is_system: true,
                is_overridden: false,
                is_active: true,
                master_version: MASTER_VERSION,
                synced_at: new Date(),
            },
            create: {
                farm_id: farmId,
                code: rule.code,
                rule_type: rule.rule_type,
                category: rule.category,
                action: rule.action,
                value: rule.value,
                limit_value: rule.limit_value,
                condition: rule.condition,
                description: rule.description,
                reference: rule.reference,
                effective_from: rule.effective_from,
                priority: rule.priority ?? 50,
                original_value: rule.value,
                is_system: true,
                is_overridden: false,
                is_active: true,
                master_version: MASTER_VERSION,
                synced_at: new Date(),
            },
        });
    }

    console.log(`   ✅ Seeded ${TAX_RULES_SEED.length} tax rules for farm (Tax Engine 2025)`);
}

export default TAX_RULES_SEED;
