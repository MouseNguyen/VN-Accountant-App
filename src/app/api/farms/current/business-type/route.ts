// src/app/api/farms/current/business-type/route.ts
// API: Change business type (OWNER only, requires confirmation)

import { NextRequest, NextResponse } from 'next/server';
import { prismaBase } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { changeBusinessTypeSchema } from '@/lib/validations/farm';
import { createAuditLog } from '@/services/audit-log.service';

/**
 * PUT /api/farms/current/business-type
 * Đổi loại hình kinh doanh (FARM <-> RETAIL_FNB)
 * Yêu cầu confirm vì thao tác này ảnh hưởng đến toàn bộ giao diện
 */
export const PUT = withAuth(async (request: NextRequest, ctx, user) => {
    // RBAC: Chỉ OWNER
    if (user.role !== 'OWNER') {
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Chỉ chủ sở hữu mới được thay đổi loại hình kinh doanh',
                },
            },
            { status: 403 }
        );
    }

    try {
        const body = await request.json();
        const validation = changeBusinessTypeSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Dữ liệu không hợp lệ',
                        details: validation.error.flatten().fieldErrors,
                    },
                },
                { status: 400 }
            );
        }

        const { business_type } = validation.data;

        // Không cho đổi nếu giống cũ
        if (business_type === user.farm.business_type) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'NO_CHANGE',
                        message: 'Loại hình kinh doanh không thay đổi',
                    },
                },
                { status: 400 }
            );
        }

        const oldType = user.farm.business_type;

        // Cập nhật
        const updatedFarm = await prismaBase.farm.update({
            where: { id: user.farm.id },
            data: { business_type },
        });

        // Audit Log
        await createAuditLog({
            action: 'UPDATE',
            entityType: 'Farm',
            entityId: updatedFarm.id,
            oldValues: { business_type: oldType },
            newValues: { business_type },
            description: `Đổi loại hình kinh doanh từ ${oldType} sang ${business_type}`,
        });

        return NextResponse.json({
            success: true,
            message: 'Đã thay đổi loại hình kinh doanh. Trang sẽ được tải lại.',
            data: {
                business_type: updatedFarm.business_type,
            },
            requireReload: true, // Flag để frontend biết cần reload
        });
    } catch (error) {
        console.error('Change business type error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'SERVER_ERROR',
                    message: 'Có lỗi xảy ra',
                },
            },
            { status: 500 }
        );
    }
});
