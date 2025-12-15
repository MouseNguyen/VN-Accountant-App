// src/app/api/products/export/route.ts
// Products API - Export to CSV

import { NextRequest, NextResponse } from 'next/server';
import { prismaBase } from '@/lib/prisma';
import { withAuth, type AuthUser } from '@/lib/auth';

// Category labels for Vietnamese export
const CATEGORY_LABELS: Record<string, string> = {
    NONG_SAN: 'Nông sản',
    VAT_TU: 'Vật tư',
    MENU: 'Menu',
    NGUYEN_LIEU: 'Nguyên liệu',
    OTHER: 'Khác',
};

export const GET = withAuth(async (request: NextRequest, _context, user: AuthUser) => {
    try {
        const farmId = user.farm_id;

        const products = await prismaBase.product.findMany({
            where: { farm_id: farmId, deleted_at: null },
            orderBy: { code: 'asc' },
        });

        // Generate CSV headers
        const headers = [
            'Mã',
            'Tên sản phẩm',
            'Danh mục',
            'Đơn vị',
            'Giá bán',
            'Giá nhập',
            'Tồn kho',
            'Tồn tối thiểu',
            'Trạng thái',
            'Mô tả',
        ];

        // Generate CSV rows
        const rows = products.map((p) => [
            p.code,
            p.name,
            CATEGORY_LABELS[p.category] || p.category,
            p.unit,
            Number(p.selling_price),
            Number(p.purchase_price),
            Number(p.stock_qty),
            Number(p.min_stock),
            p.is_active ? 'Đang kinh doanh' : 'Ngừng kinh doanh',
            p.description || '',
        ]);

        // Escape CSV values (handle commas and quotes)
        const escapeCSV = (value: string | number): string => {
            const str = String(value);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        // Build CSV content
        const csv = [
            headers.map(escapeCSV).join(','),
            ...rows.map((row) => row.map(escapeCSV).join(',')),
        ].join('\n');

        // Add BOM for Excel UTF-8 compatibility
        const bom = '\uFEFF';

        // Generate filename with date
        const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const filename = `san-pham-${dateStr}.csv`;

        return new NextResponse(bom + csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('Export products error:', error);
        return NextResponse.json(
            { success: false, error: { code: 'SERVER_ERROR', message: 'Lỗi xuất file' } },
            { status: 500 }
        );
    }
});
