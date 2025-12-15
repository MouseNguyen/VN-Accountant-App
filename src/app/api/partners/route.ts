// src/app/api/partners/route.ts
// Partners API - List & Create

import { NextRequest, NextResponse } from 'next/server';
import { prismaBase } from '@/lib/prisma';
import { withAuth, type AuthUser } from '@/lib/auth';
import { partnerQuerySchema, createPartnerSchema } from '@/lib/validations/partner';
import { createAuditLog } from '@/services/audit-log.service';
import { Prisma } from '@prisma/client';

import { serializeDecimals } from '@/lib/api-utils';
// GET - Danh sách đối tác
export const GET = withAuth(async (request: NextRequest, _context, user: AuthUser) => {
    try {
        const { searchParams } = new URL(request.url);
        const queryParams = Object.fromEntries(searchParams);
        const query = partnerQuerySchema.parse(queryParams);

        const farmId = user.farm_id;
        const { page, limit, search, partner_type, is_active, sort_by, sort_order } = query;
        const skip = (page - 1) * limit;

        // Build WHERE clause
        const where: Prisma.PartnerWhereInput = {
            farm_id: farmId,
            deleted_at: null,
        };

        if (partner_type) where.partner_type = partner_type;
        if (is_active !== undefined) where.is_active = is_active;

        // Search theo tên, mã, SĐT
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search.toUpperCase(), mode: 'insensitive' } },
                { phone: { contains: search } },
                { company_name: { contains: search, mode: 'insensitive' } },
            ];
        }

        // Build ORDER BY
        const orderBy: Prisma.PartnerOrderByWithRelationInput = {
            [sort_by]: sort_order,
        };

        // Query với count
        const [items, total] = await Promise.all([
            prismaBase.partner.findMany({
                where,
                orderBy,
                skip,
                take: limit,
            }),
            prismaBase.partner.count({ where }),
        ]);

        // Serialize Decimal to number
        const serializedItems = items.map((item) => ({
            ...item,
            credit_limit: Number(item.credit_limit),
            balance: Number(item.balance),
        }));

        return NextResponse.json({
            success: true,
            data: {
                items: serializedItems,
                total,
                page,
                limit,
                hasMore: skip + items.length < total,
            },
        });
    } catch (error) {
        console.error('Get partners error:', error);
        return NextResponse.json(
            { success: false, error: { code: 'SERVER_ERROR', message: 'Lỗi server' } },
            { status: 500 }
        );
    }
});

// POST - Tạo đối tác mới
export const POST = withAuth(async (request: NextRequest, _context, user: AuthUser) => {
    try {
        const body = await request.json();
        const validation = createPartnerSchema.safeParse(body);

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

        // Kiểm tra trùng tên
        const existingName = await prismaBase.partner.findFirst({
            where: { farm_id: farmId, name: data.name, deleted_at: null },
        });

        if (existingName) {
            return NextResponse.json(
                {
                    success: false,
                    error: { code: 'DUPLICATE_NAME', message: 'Tên đối tác đã tồn tại' },
                },
                { status: 409 }
            );
        }

        // Kiểm tra trùng SĐT (nếu có)
        if (data.phone) {
            const existingPhone = await prismaBase.partner.findFirst({
                where: { farm_id: farmId, phone: data.phone, deleted_at: null },
            });

            if (existingPhone) {
                return NextResponse.json(
                    {
                        success: false,
                        error: { code: 'DUPLICATE_PHONE', message: 'Số điện thoại đã được sử dụng' },
                    },
                    { status: 409 }
                );
            }
        }

        // Kiểm tra trùng MST (nếu có)
        if (data.tax_code) {
            const existingTax = await prismaBase.partner.findFirst({
                where: { farm_id: farmId, tax_code: data.tax_code, deleted_at: null },
            });

            if (existingTax) {
                return NextResponse.json(
                    {
                        success: false,
                        error: { code: 'DUPLICATE_TAX_CODE', message: 'Mã số thuế đã được sử dụng' },
                    },
                    { status: 409 }
                );
            }
        }

        // Generate code based on type
        const countPartners = await prismaBase.partner.count({
            where: { farm_id: farmId },
        });
        const prefix = data.partner_type === 'CUSTOMER' ? 'KH' : data.partner_type === 'VENDOR' ? 'NCC' : 'DT';
        const code = `${prefix}${String(countPartners + 1).padStart(5, '0')}`;

        // Tạo đối tác
        const partner = await prismaBase.partner.create({
            data: {
                farm_id: farmId,
                code,
                name: data.name,
                partner_type: data.partner_type,
                phone: data.phone || null,
                email: data.email || null,
                address: data.address || null,
                contact_name: data.contact_name || null,
                company_name: data.company_name || null,
                tax_code: data.tax_code || null,
                notes: data.notes || null,
                credit_limit: data.credit_limit || 0,
            },
        });

        // Audit Log
        await createAuditLog({
            action: 'CREATE',
            entityType: 'Partner',
            entityId: partner.id,
            newValues: partner,
            description: `Tạo ${data.partner_type === 'CUSTOMER' ? 'khách hàng' : 'nhà cung cấp'}: ${partner.name} (${partner.code})`,
        });

        // Serialize response
        const serialized = {
            ...partner,
            credit_limit: Number(partner.credit_limit),
            balance: Number(partner.balance),
        };

        return NextResponse.json(
            { success: true, message: 'Tạo đối tác thành công!', data: serializeDecimals(serialized) },
            { status: 201 }
        );
    } catch (error: unknown) {
        // Handle unique constraint violation (race condition fallback)
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
            return NextResponse.json(
                {
                    success: false,
                    error: { code: 'DUPLICATE', message: 'Thông tin bị trùng, vui lòng kiểm tra lại' },
                },
                { status: 409 }
            );
        }

        console.error('Create partner error:', error);
        return NextResponse.json(
            { success: false, error: { code: 'SERVER_ERROR', message: 'Lỗi server' } },
            { status: 500 }
        );
    }
});
