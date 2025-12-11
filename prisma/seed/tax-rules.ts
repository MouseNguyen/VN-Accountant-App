// prisma/seed/tax-rules.ts
// Quy tắc thuế theo quy định Việt Nam
// Seed khi tạo Farm mới - có thể override từng farm

import { PrismaClient } from '@prisma/client';

export const TAX_RULES_SEED = [
    // ==================== VAT Rules ====================
    {
        code: "VAT_RATE_NONGSAN",
        category: "VAT",
        value: 0,
        value_type: "PERCENTAGE",
        name: "VAT nông sản sơ chế",
        description: "Nông sản chưa qua chế biến hoặc chỉ sơ chế thông thường",
        reference: "Điều 5 Luật Thuế GTGT 2008"
    },
    {
        code: "VAT_RATE_DEFAULT",
        category: "VAT",
        value: 10,
        value_type: "PERCENTAGE",
        name: "VAT mặc định",
        description: "Thuế suất VAT thông thường",
        reference: "Điều 8 Luật Thuế GTGT 2008"
    },
    {
        code: "VAT_BANK_THRESHOLD",
        category: "VAT",
        value: 20000000,
        value_type: "THRESHOLD",
        name: "Ngưỡng thanh toán qua ngân hàng",
        description: "Hóa đơn >= 20 triệu phải thanh toán qua NH để được khấu trừ VAT",
        reference: "Thông tư 219/2013/TT-BTC"
    },

    // ==================== PIT Rules (Thuế TNCN) ====================
    {
        code: "PIT_CASUAL_THRESHOLD",
        category: "PIT",
        value: 2000000,
        value_type: "THRESHOLD",
        name: "Ngưỡng khấu trừ thuế TNCN thời vụ",
        description: "Thu nhập từ 2 triệu/lần trở lên phải khấu trừ 10% thuế TNCN",
        reference: "Điều 25 Thông tư 111/2013/TT-BTC"
    },
    {
        code: "PIT_CASUAL_RATE",
        category: "PIT",
        value: 10,
        value_type: "PERCENTAGE",
        name: "Thuế suất TNCN lao động thời vụ",
        description: "Khấu trừ 10% trên tổng thu nhập >= 2 triệu",
        reference: "Điều 25 Thông tư 111/2013/TT-BTC"
    },
    {
        code: "PIT_DEDUCTION_SELF",
        category: "PIT",
        value: 11000000,
        value_type: "AMOUNT",
        name: "Giảm trừ gia cảnh - Bản thân",
        description: "Giảm trừ 11 triệu/tháng cho bản thân người nộp thuế",
        reference: "Điều 19 Luật Thuế TNCN (sửa đổi 2020)"
    },
    {
        code: "PIT_DEDUCTION_DEPENDENT",
        category: "PIT",
        value: 4400000,
        value_type: "AMOUNT",
        name: "Giảm trừ gia cảnh - Người phụ thuộc",
        description: "Giảm trừ 4.4 triệu/tháng cho mỗi người phụ thuộc",
        reference: "Điều 19 Luật Thuế TNCN (sửa đổi 2020)"
    },

    // ==================== CIT Rules (Thuế TNDN) ====================
    {
        code: "CIT_RATE_DEFAULT",
        category: "CIT",
        value: 20,
        value_type: "PERCENTAGE",
        name: "Thuế suất TNDN",
        description: "Thuế suất thuế thu nhập doanh nghiệp",
        reference: "Điều 10 Luật Thuế TNDN 2008"
    },
    {
        code: "CIT_ENTERTAINMENT_LIMIT",
        category: "CIT",
        value: 15,
        value_type: "PERCENTAGE",
        name: "Giới hạn chi tiếp khách",
        description: "Chi tiếp khách không quá 15% tổng chi phí được trừ",
        reference: "Thông tư 96/2015/TT-BTC"
    },
];

/**
 * Seed tax rules khi tạo farm mới
 * @param prisma - Prisma client instance
 * @param farmId - ID của farm vừa tạo
 */
export async function seedTaxRulesForFarm(prisma: PrismaClient, farmId: string) {
    const taxRules = TAX_RULES_SEED.map(rule => ({
        farm_id: farmId,
        code: rule.code,
        category: rule.category,
        value: rule.value,
        value_type: rule.value_type,
        name: rule.name,
        description: rule.description || null,
        reference: rule.reference || null,
        original_value: rule.value,
        is_overridden: false,
    }));

    await prisma.taxRule.createMany({
        data: taxRules,
        skipDuplicates: true,
    });

    console.log(`✅ Seeded ${taxRules.length} tax rules for farm ${farmId}`);
}

export default TAX_RULES_SEED;
