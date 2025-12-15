// src/app/api/products/route.ts
// Products API - List & Create

import { NextRequest, NextResponse } from 'next/server';
import { prismaBase } from '@/lib/prisma';
import { withAuth, type AuthUser } from '@/lib/auth';
import { productQuerySchema, createProductSchema } from '@/lib/validations/product';
import { createAuditLog } from '@/services/audit-log.service';
import { Prisma } from '@prisma/client';

import { serializeDecimals } from '@/lib/api-utils';
// GET - Danh sách sản phẩm
export const GET = withAuth(async (request: NextRequest, _context, user: AuthUser) => {
    try {
        const { searchParams } = new URL(request.url);
        const queryParams = Object.fromEntries(searchParams);
        const query = productQuerySchema.parse(queryParams);

        const farmId = user.farm_id;
        const { page, limit, search, category, is_active, sort_by, sort_order } = query;
        const skip = (page - 1) * limit;

        // Build WHERE clause
        const where: Prisma.ProductWhereInput = {
            farm_id: farmId,
            deleted_at: null,
        };

        if (category) where.category = category;
        if (is_active !== undefined) where.is_active = is_active;

        // Search theo tên hoặc mã
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search.toUpperCase(), mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        // Build ORDER BY
        const orderBy: Prisma.ProductOrderByWithRelationInput = {
            [sort_by]: sort_order,
        };

        // Query với count
        const [items, total] = await Promise.all([
            prismaBase.product.findMany({
                where,
                orderBy,
                skip,
                take: limit,
            }),
            prismaBase.product.count({ where }),
        ]);

        // Serialize Decimal to number
        const serializedItems = items.map((item) => ({
            ...item,
            selling_price: Number(item.selling_price),
            purchase_price: Number(item.purchase_price),
            stock_qty: Number(item.stock_qty),
            min_stock: Number(item.min_stock),
            avg_cost: Number(item.avg_cost),
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
        console.error('Get products error:', error);
        return NextResponse.json(
            { success: false, error: { code: 'SERVER_ERROR', message: 'Lỗi server' } },
            { status: 500 }
        );
    }
});

// POST - Tạo sản phẩm mới
export const POST = withAuth(async (request: NextRequest, _context, user: AuthUser) => {
    try {
        const body = await request.json();
        const validation = createProductSchema.safeParse(body);

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

        // Kiểm tra trùng tên (trong cùng farm, chưa xóa)
        const existingName = await prismaBase.product.findFirst({
            where: { farm_id: farmId, name: data.name, deleted_at: null },
        });

        if (existingName) {
            return NextResponse.json(
                {
                    success: false,
                    error: { code: 'DUPLICATE_NAME', message: 'Tên sản phẩm đã tồn tại' },
                },
                { status: 409 }
            );
        }

        // Generate code - dùng count + 1 (đơn giản hơn sequence cho giai đoạn dev)
        const countProducts = await prismaBase.product.count({
            where: { farm_id: farmId },
        });
        const code = `SP${String(countProducts + 1).padStart(5, '0')}`;

        // Tạo sản phẩm
        const product = await prismaBase.product.create({
            data: {
                farm_id: farmId,
                code,
                name: data.name,
                category: data.category,
                unit: data.unit || 'kg',
                selling_price: data.selling_price || 0,
                purchase_price: data.purchase_price || 0,
                stock_qty: data.stock_qty || 0,
                min_stock: data.min_stock || 0,
                image_url: data.image_url || null,
                description: data.description || null,
            },
        });

        // Audit Log
        await createAuditLog({
            action: 'CREATE',
            entityType: 'Product',
            entityId: product.id,
            newValues: product,
            description: `Tạo sản phẩm: ${product.name} (${product.code})`,
        });

        // Serialize response
        const serialized = {
            ...product,
            selling_price: Number(product.selling_price),
            purchase_price: Number(product.purchase_price),
            stock_qty: Number(product.stock_qty),
            min_stock: Number(product.min_stock),
        };

        return NextResponse.json(
            { success: true, message: 'Tạo sản phẩm thành công!', data: serializeDecimals(serialized) },
            { status: 201 }
        );
    } catch (error: unknown) {
        // Handle unique constraint violation (race condition fallback)
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
            return NextResponse.json(
                {
                    success: false,
                    error: { code: 'DUPLICATE', message: 'Mã sản phẩm bị trùng, vui lòng thử lại' },
                },
                { status: 409 }
            );
        }

        console.error('Create product error:', error);
        return NextResponse.json(
            { success: false, error: { code: 'SERVER_ERROR', message: 'Lỗi server' } },
            { status: 500 }
        );
    }
});
