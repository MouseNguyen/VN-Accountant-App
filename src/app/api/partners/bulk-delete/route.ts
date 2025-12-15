// src/app/api/partners/bulk-delete/route.ts
// Partners API - Bulk Delete

import { NextRequest, NextResponse } from 'next/server';
import { prismaBase } from '@/lib/prisma';
import { withAuth, type AuthUser } from '@/lib/auth';
import { createAuditLog } from '@/services/audit-log.service';
import { z } from 'zod';

const bulkDeleteSchema = z.object({
    ids: z
        .array(z.string().uuid('ID không hợp lệ'))
        .min(1, 'Chọn ít nhất 1 đối tác')
        .max(100, 'Tối đa 100 đối tác mỗi lần'),
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

        // Lấy danh sách đối tác sẽ xóa (để kiểm tra balance và log)
        const partnersToDelete = await prismaBase.partner.findMany({
            where: {
                id: { in: ids },
                farm_id: farmId,
                deleted_at: null,
            },
            select: { id: true, name: true, code: true, balance: true },
        });

        if (partnersToDelete.length === 0) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy đối tác nào' } },
                { status: 404 }
            );
        }

        // Kiểm tra có đối tác nào còn công nợ không
        const partnersWithBalance = partnersToDelete.filter((p) => Number(p.balance) !== 0);
        if (partnersWithBalance.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'HAS_BALANCE',
                        message: `Không thể xóa. Các đối tác sau còn công nợ: ${partnersWithBalance.map((p) => p.name).join(', ')}`,
                    },
                },
                { status: 400 }
            );
        }

        // Bulk soft delete
        const result = await prismaBase.partner.updateMany({
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
            entityType: 'Partner',
            entityId: ids.join(','),
            oldValues: partnersToDelete,
            description: `Xóa ${result.count} đối tác: ${partnersToDelete.map((p) => p.code).join(', ')}`,
        });

        return NextResponse.json({
            success: true,
            message: `Đã xóa ${result.count} đối tác`,
            data: { deleted: result.count },
        });
    } catch (error) {
        console.error('Bulk delete partners error:', error);
        return NextResponse.json(
            { success: false, error: { code: 'SERVER_ERROR', message: 'Lỗi server' } },
            { status: 500 }
        );
    }
});
