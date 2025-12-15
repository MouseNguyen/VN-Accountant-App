// src/app/api/settings/tax-rules/[id]/reset/route.ts
// POST reset rule to default value

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { resetRuleToDefault } from '@/lib/tax/engine';

export const POST = withAuth(async (
    _req: NextRequest,
    context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const params = await context.params;
        const ruleId = params.id;

        const rule = await resetRuleToDefault(user.farm_id, ruleId, user.id);

        return NextResponse.json({
            success: true,
            message: 'Đã khôi phục về giá trị mặc định.',
            data: rule,
        });
    } catch (error) {
        console.error('Reset tax rule error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'RESET_FAILED',
                    message: error instanceof Error ? error.message : 'Lỗi khi khôi phục'
                }
            },
            { status: 400 }
        );
    }
});
