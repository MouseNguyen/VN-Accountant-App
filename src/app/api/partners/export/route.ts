// src/app/api/partners/export/route.ts
// Partners API - Export to CSV

import { NextRequest, NextResponse } from 'next/server';
import { prismaBase } from '@/lib/prisma';
import { withAuth, type AuthUser } from '@/lib/auth';

// Partner type labels for Vietnamese export
const TYPE_LABELS: Record<string, string> = {
    CUSTOMER: 'Khách hàng',
    VENDOR: 'Nhà cung cấp',
    BOTH: 'Cả hai',
};

export const GET = withAuth(async (request: NextRequest, _context, user: AuthUser) => {
    try {
        const farmId = user.farm_id;

        const partners = await prismaBase.partner.findMany({
            where: { farm_id: farmId, deleted_at: null },
            orderBy: { code: 'asc' },
        });

        // Generate CSV headers
        const headers = [
            'Mã',
            'Tên đối tác',
            'Loại',
            'Số điện thoại',
            'Email',
            'Địa chỉ',
            'Công ty',
            'Mã số thuế',
            'Người liên hệ',
            'Hạn mức',
            'Công nợ',
            'Trạng thái',
            'Ghi chú',
        ];

        // Generate CSV rows
        const rows = partners.map((p) => [
            p.code,
            p.name,
            TYPE_LABELS[p.partner_type] || p.partner_type,
            p.phone || '',
            p.email || '',
            p.address || '',
            p.company_name || '',
            p.tax_code || '',
            p.contact_name || '',
            Number(p.credit_limit),
            Number(p.balance),
            p.is_active ? 'Đang hoạt động' : 'Ngừng hoạt động',
            p.notes || '',
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
        const filename = `doi-tac-${dateStr}.csv`;

        return new NextResponse(bom + csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('Export partners error:', error);
        return NextResponse.json(
            { success: false, error: { code: 'SERVER_ERROR', message: 'Lỗi xuất file' } },
            { status: 500 }
        );
    }
});
