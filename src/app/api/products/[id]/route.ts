// src/app/api/products/[id]/route.ts
// Products API - Detail, Update, Delete

import { NextRequest, NextResponse } from 'next/server';
import { prismaBase } from '@/lib/prisma';
import { withAuth, type AuthUser } from '@/lib/auth';
import { updateProductSchema } from '@/lib/validations/product';
import { createAuditLog } from '@/services/audit-log.service';

import { serializeDecimals } from '@/lib/api-utils';
// GET - Chi tiết sản phẩm
export const GET = withAuth(async (request: NextRequest, context, user: AuthUser) => {
    try {
        const params = await context.params;
        const id = params.id as string;
        const farmId = user.farm_id;

        const product = await prismaBase.product.findFirst({
            where: { id, farm_id: farmId, deleted_at: null },
        });

        if (!product) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy sản phẩm' } },
                { status: 404 }
            );
        }

        // Serialize
        const serialized = {
            ...product,
            selling_price: Number(product.selling_price),
            purchase_price: Number(product.purchase_price),
            stock_qty: Number(product.stock_qty),
            min_stock: Number(product.min_stock),
        };

        return NextResponse.json({ success: true, data: serializeDecimals(serialized) });
    } catch (error) {
        console.error('Get product error:', error);
        return NextResponse.json(
            { success: false, error: { code: 'SERVER_ERROR', message: 'Lỗi server' } },
            { status: 500 }
        );
    }
});

// PUT - Cập nhật sản phẩm
export const PUT = withAuth(async (request: NextRequest, context, user: AuthUser) => {
    try {
        const params = await context.params;
        const id = params.id as string;
        const body = await request.json();
        const validation = updateProductSchema.safeParse(body);

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

        // Tìm sản phẩm hiện tại
        const existing = await prismaBase.product.findFirst({
            where: { id, farm_id: farmId, deleted_at: null },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy sản phẩm' } },
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
            const duplicateName = await prismaBase.product.findFirst({
                where: { farm_id: farmId, name: data.name, id: { not: id }, deleted_at: null },
            });

            if (duplicateName) {
                return NextResponse.json(
                    { success: false, error: { code: 'DUPLICATE_NAME', message: 'Tên sản phẩm đã tồn tại' } },
                    { status: 409 }
                );
            }
        }

        // Cập nhật với version mới
        const { version, ...updateData } = data;
        const updated = await prismaBase.product.update({
            where: { id },
            data: {
                ...updateData,
                version: existing.version + 1,
            },
        });

        // Audit Log
        await createAuditLog({
            action: 'UPDATE',
            entityType: 'Product',
            entityId: updated.id,
            oldValues: existing,
            newValues: updated,
            description: `Cập nhật sản phẩm: ${updated.name}`,
        });

        // Serialize
        const serialized = {
            ...updated,
            selling_price: Number(updated.selling_price),
            purchase_price: Number(updated.purchase_price),
            stock_qty: Number(updated.stock_qty),
            min_stock: Number(updated.min_stock),
        };

        return NextResponse.json({
            success: true,
            message: 'Cập nhật thành công!',
            data: serializeDecimals(serialized),
        });
    } catch (error) {
        console.error('Update product error:', error);
        return NextResponse.json(
            { success: false, error: { code: 'SERVER_ERROR', message: 'Lỗi server' } },
            { status: 500 }
        );
    }
});

// DELETE - Soft delete sản phẩm
export const DELETE = withAuth(async (request: NextRequest, context, user: AuthUser) => {
    try {
        const params = await context.params;
        const id = params.id as string;
        const farmId = user.farm_id;

        const existing = await prismaBase.product.findFirst({
            where: { id, farm_id: farmId, deleted_at: null },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy sản phẩm' } },
                { status: 404 }
            );
        }

        // TODO: Kiểm tra sản phẩm đã có trong giao dịch chưa
        // Nếu có thì không cho xóa hoặc chỉ cho inactive

        // Soft delete
        await prismaBase.product.update({
            where: { id },
            data: { deleted_at: new Date() },
        });

        // Audit Log
        await createAuditLog({
            action: 'DELETE',
            entityType: 'Product',
            entityId: id,
            oldValues: existing,
            description: `Xóa sản phẩm: ${existing.name} (${existing.code})`,
        });

        // 204 No Content
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Delete product error:', error);
        return NextResponse.json(
            { success: false, error: { code: 'SERVER_ERROR', message: 'Lỗi server' } },
            { status: 500 }
        );
    }
});
