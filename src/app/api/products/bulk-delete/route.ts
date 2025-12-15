// src/app/api/products/bulk-delete/route.ts
// Products API - Bulk Delete

import { NextRequest, NextResponse } from 'next/server';
import { prismaBase } from '@/lib/prisma';
import { withAuth, type AuthUser } from '@/lib/auth';
import { createAuditLog } from '@/services/audit-log.service';
import { z } from 'zod';

const bulkDeleteSchema = z.object({
    ids: z
        .array(z.string().uuid('ID không hợp lệ'))
        .min(1, 'Chọn ít nhất 1 sản phẩm')
        .max(100, 'Tối đa 100 sản phẩm mỗi lần'),
});

export const POST = withAuth(async (request: NextRequest, _context, user: AuthUser) => {
    try {
        const body = await request.json();
        const validation = bulkDeleteSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: validation.error.issues[0]?.message || 'Dữ liệu không hợp lệ',
                    },
                },
                { status: 400 }
            );
        }

        const { ids } = validation.data;
        const farmId = user.farm_id;

        // Lấy danh sách sản phẩm sẽ xóa (để log)
        const productsToDelete = await prismaBase.product.findMany({
            where: {
                id: { in: ids },
                farm_id: farmId,
                deleted_at: null,
            },
            select: { id: true, name: true, code: true },
        });

        if (productsToDelete.length === 0) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy sản phẩm nào' } },
                { status: 404 }
            );
        }

        // Bulk soft delete
        const result = await prismaBase.product.updateMany({
            where: {
                id: { in: ids },
                farm_id: farmId,
                deleted_at: null,
            },
            data: { deleted_at: new Date() },
        });

        // Audit Log
        await createAuditLog({
            action: 'DELETE',
            entityType: 'Product',
            entityId: ids.join(','),
            oldValues: productsToDelete,
            description: `Xóa ${result.count} sản phẩm: ${productsToDelete.map((p) => p.code).join(', ')}`,
        });

        return NextResponse.json({
            success: true,
            message: `Đã xóa ${result.count} sản phẩm`,
            data: { deleted: result.count },
        });
    } catch (error) {
        console.error('Bulk delete error:', error);
        return NextResponse.json(
            { success: false, error: { code: 'SERVER_ERROR', message: 'Lỗi server' } },
            { status: 500 }
        );
    }
});
