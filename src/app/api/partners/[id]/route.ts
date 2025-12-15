// src/app/api/partners/[id]/route.ts
// Partners API - Detail, Update, Delete

import { NextRequest, NextResponse } from 'next/server';
import { prismaBase } from '@/lib/prisma';
import { withAuth, type AuthUser } from '@/lib/auth';
import { updatePartnerSchema } from '@/lib/validations/partner';
import { createAuditLog } from '@/services/audit-log.service';

import { serializeDecimals } from '@/lib/api-utils';
// GET - Chi tiết đối tác
export const GET = withAuth(async (request: NextRequest, context, user: AuthUser) => {
    try {
        const params = await context.params;
        const id = params.id as string;
        const farmId = user.farm_id;

        const partner = await prismaBase.partner.findFirst({
            where: { id, farm_id: farmId, deleted_at: null },
        });

        if (!partner) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy đối tác' } },
                { status: 404 }
            );
        }

        // Serialize
        const serialized = {
            ...partner,
            credit_limit: Number(partner.credit_limit),
            balance: Number(partner.balance),
        };

        return NextResponse.json({ success: true, data: serializeDecimals(serialized) });
    } catch (error) {
        console.error('Get partner error:', error);
        return NextResponse.json(
            { success: false, error: { code: 'SERVER_ERROR', message: 'Lỗi server' } },
            { status: 500 }
        );
    }
});

// PUT - Cập nhật đối tác
export const PUT = withAuth(async (request: NextRequest, context, user: AuthUser) => {
    try {
        const params = await context.params;
        const id = params.id as string;
        const body = await request.json();
        const validation = updatePartnerSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: validation.error.issues[0]?.message || 'Dữ liệu không hợp lệ',
                        details: validation.error.flatten().fieldErrors,
                    },
                },
                { status: 400 }
            );
        }

        const data = validation.data;
        const farmId = user.farm_id;

        // Tìm đối tác hiện tại
        const existing = await prismaBase.partner.findFirst({
            where: { id, farm_id: farmId, deleted_at: null },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy đối tác' } },
                { status: 404 }
            );
        }

        // Optimistic Locking - kiểm tra version
        if (existing.version !== data.version) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'CONFLICT',
                        message: 'Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang.',
                    },
                },
                { status: 409 }
            );
        }

        // Kiểm tra trùng tên (nếu đổi tên)
        if (data.name && data.name !== existing.name) {
            const duplicateName = await prismaBase.partner.findFirst({
                where: { farm_id: farmId, name: data.name, id: { not: id }, deleted_at: null },
            });

            if (duplicateName) {
                return NextResponse.json(
                    { success: false, error: { code: 'DUPLICATE_NAME', message: 'Tên đối tác đã tồn tại' } },
                    { status: 409 }
                );
            }
        }

        // Kiểm tra trùng SĐT (nếu đổi)
        if (data.phone && data.phone !== existing.phone) {
            const duplicatePhone = await prismaBase.partner.findFirst({
                where: { farm_id: farmId, phone: data.phone, id: { not: id }, deleted_at: null },
            });

            if (duplicatePhone) {
                return NextResponse.json(
                    { success: false, error: { code: 'DUPLICATE_PHONE', message: 'Số điện thoại đã được sử dụng' } },
                    { status: 409 }
                );
            }
        }

        // Kiểm tra trùng MST (nếu đổi)
        if (data.tax_code && data.tax_code !== existing.tax_code) {
            const duplicateTax = await prismaBase.partner.findFirst({
                where: { farm_id: farmId, tax_code: data.tax_code, id: { not: id }, deleted_at: null },
            });

            if (duplicateTax) {
                return NextResponse.json(
                    { success: false, error: { code: 'DUPLICATE_TAX_CODE', message: 'Mã số thuế đã được sử dụng' } },
                    { status: 409 }
                );
            }
        }

        // Cập nhật với version mới
        const { version, ...updateData } = data;
        const updated = await prismaBase.partner.update({
            where: { id },
            data: {
                ...updateData,
                version: existing.version + 1,
            },
        });

        // Audit Log
        await createAuditLog({
            action: 'UPDATE',
            entityType: 'Partner',
            entityId: updated.id,
            oldValues: existing,
            newValues: updated,
            description: `Cập nhật đối tác: ${updated.name}`,
        });

        // Serialize
        const serialized = {
            ...updated,
            credit_limit: Number(updated.credit_limit),
            balance: Number(updated.balance),
        };

        return NextResponse.json({
            success: true,
            message: 'Cập nhật thành công!',
            data: serializeDecimals(serialized),
        });
    } catch (error) {
        console.error('Update partner error:', error);
        return NextResponse.json(
            { success: false, error: { code: 'SERVER_ERROR', message: 'Lỗi server' } },
            { status: 500 }
        );
    }
});

// DELETE - Soft delete đối tác
export const DELETE = withAuth(async (request: NextRequest, context, user: AuthUser) => {
    try {
        const params = await context.params;
        const id = params.id as string;
        const farmId = user.farm_id;

        const existing = await prismaBase.partner.findFirst({
            where: { id, farm_id: farmId, deleted_at: null },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy đối tác' } },
                { status: 404 }
            );
        }

        // Kiểm tra còn công nợ không
        if (Number(existing.balance) !== 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: { code: 'HAS_BALANCE', message: 'Không thể xóa đối tác còn công nợ' },
                },
                { status: 400 }
            );
        }

        // Soft delete
        await prismaBase.partner.update({
            where: { id },
            data: { deleted_at: new Date() },
        });

        // Audit Log
        await createAuditLog({
            action: 'DELETE',
            entityType: 'Partner',
            entityId: id,
            oldValues: existing,
            description: `Xóa đối tác: ${existing.name} (${existing.code})`,
        });

        // 204 No Content
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Delete partner error:', error);
        return NextResponse.json(
            { success: false, error: { code: 'SERVER_ERROR', message: 'Lỗi server' } },
            { status: 500 }
        );
    }
});
