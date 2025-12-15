// src/app/api/farms/current/route.ts
// API: Get and Update current farm

import { NextRequest, NextResponse } from 'next/server';
import { prismaBase } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { updateFarmSchema } from '@/lib/validations/farm';
import { createAuditLog } from '@/services/audit-log.service';

import { serializeDecimals } from '@/lib/api-utils';
/**
 * GET /api/farms/current
 * Lấy thông tin farm của user hiện tại
 */
export const GET = withAuth(async (request: NextRequest, ctx, user) => {
    return NextResponse.json({
        success: true,
        data: {
            id: user.farm.id,
            name: user.farm.name,
            owner_name: user.farm.owner_name,
            phone: user.farm.phone,
            email: user.farm.email,
            address: user.farm.address,
            tax_code: user.farm.tax_code,
            business_type: user.farm.business_type,
            fiscal_year_start: user.farm.fiscal_year_start,
            currency: user.farm.currency,
            locale: user.farm.locale,
            created_at: user.farm.created_at,
        },
    });
});

/**
 * PUT /api/farms/current
 * Cập nhật thông tin farm (chỉ OWNER)
 */
export const PUT = withAuth(async (request: NextRequest, ctx, user) => {
    // RBAC: Chỉ OWNER được sửa Farm
    if (user.role !== 'OWNER') {
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Chỉ chủ sở hữu mới được chỉnh sửa thông tin',
                },
            },
            { status: 403 }
        );
    }

    try {
        const body = await request.json();
        const validation = updateFarmSchema.safeParse(body);

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

        const data = validation.data;
        const oldFarm = {
            name: user.farm.name,
            owner_name: user.farm.owner_name,
            phone: user.farm.phone,
            email: user.farm.email,
            address: user.farm.address,
            tax_code: user.farm.tax_code,
            fiscal_year_start: user.farm.fiscal_year_start,
        };

        // Cập nhật Farm
        const updatedFarm = await prismaBase.farm.update({
            where: { id: user.farm.id },
            data: {
                name: data.name,
                owner_name: data.owner_name,
                phone: data.phone || null,
                email: data.email || null,
                address: data.address || null,
                tax_code: data.tax_code || null,
                fiscal_year_start: data.fiscal_year_start,
            },
        });

        // Audit Log
        await createAuditLog({
            action: 'UPDATE',
            entityType: 'Farm',
            entityId: updatedFarm.id,
            oldValues: oldFarm,
            newValues: {
                name: updatedFarm.name,
                owner_name: updatedFarm.owner_name,
                phone: updatedFarm.phone,
                email: updatedFarm.email,
                address: updatedFarm.address,
                tax_code: updatedFarm.tax_code,
                fiscal_year_start: updatedFarm.fiscal_year_start,
            },
            description: 'Cập nhật thông tin nông trại',
        });

        return NextResponse.json({
            success: true,
            message: 'Cập nhật thành công!',
            data: {
                id: updatedFarm.id,
                name: updatedFarm.name,
                owner_name: updatedFarm.owner_name,
                phone: updatedFarm.phone,
                email: updatedFarm.email,
                address: updatedFarm.address,
                tax_code: updatedFarm.tax_code,
                business_type: updatedFarm.business_type,
                fiscal_year_start: updatedFarm.fiscal_year_start,
            },
        });
    } catch (error) {
        console.error('Update farm error:', error);
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
