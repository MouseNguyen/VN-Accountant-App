// src/app/api/settings/tax-rules/route.ts
// GET all tax rules for current farm

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { getRulesForFarm } from '@/lib/tax/engine';
import { TaxRuleType } from '@prisma/client';
import { TaxRulesGrouped } from '@/types/tax-engine';

export const GET = withAuth(async (
    req: NextRequest,
    _context,
    user: AuthUser
) => {
    try {
        const url = new URL(req.url);
        const ruleTypeParam = url.searchParams.get('rule_type');

        // Validate rule_type if provided
        const validTypes: TaxRuleType[] = [
            'VAT_RATE', 'VAT_DEDUCTIBLE',
            'CIT_ADD_BACK', 'CIT_DEDUCTION',
            'PIT_DEDUCTION', 'PIT_BRACKET'
        ];

        let ruleType: TaxRuleType | undefined;
        if (ruleTypeParam && validTypes.includes(ruleTypeParam as TaxRuleType)) {
            ruleType = ruleTypeParam as TaxRuleType;
        }

        const rules = await getRulesForFarm(user.farm_id, ruleType);

        // Group by rule_type
        const grouped: TaxRulesGrouped = rules.reduce((acc, rule) => {
            const type = rule.rule_type;
            if (!acc[type]) acc[type] = [];
            acc[type].push(rule);
            return acc;
        }, {} as TaxRulesGrouped);

        return NextResponse.json({
            success: true,
            data: {
                rules,
                grouped,
                total: rules.length,
            }
        });
    } catch (error) {
        console.error('Get tax rules error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'SERVER_ERROR',
                    message: 'Lỗi khi lấy danh sách quy tắc thuế'
                }
            },
            { status: 500 }
        );
    }
});
