// src/app/api/settings/tax-rules/[id]/route.ts
// GET, PUT for individual tax rule

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateRuleValue, getRuleHistory } from '@/lib/tax/engine';
import { z } from 'zod';

const updateSchema = z.object({
    value: z.number().min(0, 'Giá trị phải >= 0'),
});

// GET single rule details
export const GET = withAuth(async (
    _req: NextRequest,
    context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const params = await context.params;
        const ruleId = params.id;

        const rule = await prisma.taxRule.findFirst({
            where: {
                id: ruleId,
                farm_id: user.farm_id
            },
        });

        if (!rule) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Quy tắc không tồn tại' } },
                { status: 404 }
            );
        }

        // Get history
        const history = await getRuleHistory(ruleId, 10);

        return NextResponse.json({
            success: true,
            data: {
                rule: {
                    id: rule.id,
                    code: rule.code,
                    name: rule.name,
                    description: rule.description,
                    rule_type: rule.rule_type,
                    category: rule.category,
                    action: rule.action,
                    value: Number(rule.value),
                    original_value: rule.original_value ? Number(rule.original_value) : null,
                    is_overridden: rule.is_overridden,
                    is_system: rule.is_system,
                    is_active: rule.is_active,
                    reference: rule.reference,
                    effective_from: rule.effective_from?.toISOString().split('T')[0],
                    priority: rule.priority,
                },
                history,
            }
        });
    } catch (error) {
        console.error('Get tax rule error:', error);
        return NextResponse.json(
            { success: false, error: { code: 'SERVER_ERROR', message: 'Lỗi khi lấy quy tắc' } },
            { status: 500 }
        );
    }
});

// PUT update rule value
export const PUT = withAuth(async (
    req: NextRequest,
    context: { params: Promise<Record<string, string>> },
    user: AuthUser
) => {
    try {
        const params = await context.params;
        const ruleId = params.id;

        const body = await req.json();
        const validation = updateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Dữ liệu không hợp lệ',
                        details: validation.error.flatten().fieldErrors
                    }
                },
                { status: 400 }
            );
        }

        const { value } = validation.data;

        const rule = await updateRuleValue(user.farm_id, ruleId, value, user.id);

        return NextResponse.json({
            success: true,
            message: 'Đã cập nhật. Giá trị này sẽ không bị ghi đè khi cập nhật luật mới.',
            data: rule,
        });
    } catch (error) {
        console.error('Update tax rule error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'UPDATE_FAILED',
                    message: error instanceof Error ? error.message : 'Lỗi khi cập nhật'
                }
            },
            { status: 400 }
        );
    }
});
