// src/lib/reports/financial-notes.ts
// Notes to Financial Statements Generator - Thuyết minh BCTC
// Standard Vietnamese accounting format per TT200/2014/TT-BTC

import { prisma } from '@/lib/prisma';

export interface FinancialNotesInput {
    farmId: string;
    year: number;
}

export interface FinancialNotes {
    report_title: string;
    period: string;
    generated_at: string;
    sections: FinancialNotesSection[];
}

export interface FinancialNotesSection {
    number: string;
    title: string;
    content: string | string[];
    subsections?: FinancialNotesSection[];
}

/**
 * Generate Thuyết minh BCTC (Notes to Financial Statements)
 * Format: Standard VN accounting per Circular 200
 */
export async function generateFinancialNotes(input: FinancialNotesInput): Promise<FinancialNotes> {
    const { farmId, year } = input;

    // Fetch farm info
    const farm = await prisma.farm.findUnique({
        where: { id: farmId },
        select: { name: true, tax_code: true, address: true },
    });

    if (!farm) throw new Error('Farm not found');

    // Fetch summary data
    const [assets, workers, transactions] = await Promise.all([
        prisma.asset.count({ where: { farm_id: farmId, status: 'ACTIVE' } }),
        prisma.worker.count({ where: { farm_id: farmId, status: 'ACTIVE' } }),
        prisma.transaction.findMany({
            where: {
                farm_id: farmId,
                trans_date: {
                    gte: new Date(`${year}-01-01`),
                    lte: new Date(`${year}-12-31`),
                },
                deleted_at: null,
            },
            select: { trans_type: true, total_amount: true },
        }),
    ]);

    // Calculate totals
    const revenue = transactions
        .filter(t => ['SALE', 'INCOME'].includes(t.trans_type))
        .reduce((sum, t) => sum + Number(t.total_amount), 0);

    const expenses = transactions
        .filter(t => ['PURCHASE', 'EXPENSE'].includes(t.trans_type))
        .reduce((sum, t) => sum + Number(t.total_amount), 0);

    // Build notes sections
    const sections: FinancialNotesSection[] = [
        {
            number: 'I',
            title: 'ĐẶC ĐIỂM HOẠT ĐỘNG CỦA DOANH NGHIỆP',
            content: [
                `1. Tên doanh nghiệp: ${farm.name}`,
                `2. Mã số thuế: ${farm.tax_code || 'Chưa đăng ký'}`,
                `3. Địa chỉ: ${farm.address || 'Chưa cập nhật'}`,
                `4. Lĩnh vực kinh doanh: Nông nghiệp`,
                `5. Năm tài chính: Từ 01/01/${year} đến 31/12/${year}`,
            ],
        },
        {
            number: 'II',
            title: 'CHÍNH SÁCH KẾ TOÁN ÁP DỤNG',
            content: [
                '1. Chế độ kế toán: Thông tư 200/2014/TT-BTC',
                '2. Đơn vị tiền tệ: Đồng Việt Nam (VND)',
                '3. Phương pháp khấu hao TSCĐ: Đường thẳng',
                '4. Phương pháp tính giá vốn hàng xuất kho: Bình quân gia quyền',
                '5. Phương pháp tính thuế GTGT: Khấu trừ',
            ],
        },
        {
            number: 'III',
            title: 'THÔNG TIN BỔ SUNG',
            content: [
                `1. Số lượng tài sản cố định: ${assets} tài sản`,
                `2. Số lượng nhân viên: ${workers} người`,
                `3. Tổng doanh thu năm ${year}: ${revenue.toLocaleString('vi-VN')}đ`,
                `4. Tổng chi phí năm ${year}: ${expenses.toLocaleString('vi-VN')}đ`,
                `5. Lợi nhuận gộp: ${(revenue - expenses).toLocaleString('vi-VN')}đ`,
            ],
        },
        {
            number: 'IV',
            title: 'CÁC SỰ KIỆN SAU NGÀY KẾT THÚC NIÊN ĐỘ KẾ TOÁN',
            content: 'Không có sự kiện trọng yếu nào phát sinh sau ngày kết thúc niên độ kế toán.',
        },
    ];

    return {
        report_title: 'THUYẾT MINH BÁO CÁO TÀI CHÍNH',
        period: `Năm tài chính ${year}`,
        generated_at: new Date().toISOString(),
        sections,
    };
}
