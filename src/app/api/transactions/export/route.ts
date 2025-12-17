// src/app/api/transactions/export/route.ts
// API endpoint to export transactions as Excel

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import * as ExcelJS from 'exceljs';
import prisma from '@/lib/prisma';
import { transactionExportQuerySchema } from '@/lib/validations/transaction';

export const GET = withAuth(async (request: NextRequest, _context, user: AuthUser) => {
    try {
        const { searchParams } = new URL(request.url);
        const query = transactionExportQuerySchema.parse(Object.fromEntries(searchParams));

        const { from, to, trans_type } = query;

        // Build query filters
        const where: any = {
            farm_id: user.farm_id,
            deleted_at: null,
        };

        if (from) {
            where.trans_date = { ...where.trans_date, gte: new Date(from) };
        }
        if (to) {
            where.trans_date = { ...where.trans_date, lte: new Date(to + 'T23:59:59.999Z') };
        }
        if (trans_type && trans_type !== 'all') {
            where.trans_type = trans_type;
        }

        // Fetch transactions
        const transactions = await prisma.transaction.findMany({
            where,
            include: {
                partner: { select: { code: true, name: true } },
            },
            orderBy: { trans_date: 'desc' },
            take: 1000, // Limit for performance
        });

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'LABA ERP';
        workbook.created = new Date();

        const sheet = workbook.addWorksheet('Giao dịch');

        // Header
        sheet.mergeCells('A1:G1');
        const titleCell = sheet.getCell('A1');
        titleCell.value = 'DANH SÁCH GIAO DỊCH';
        titleCell.font = { bold: true, size: 16 };
        titleCell.alignment = { horizontal: 'center' };

        sheet.addRow([]);

        // Column headers
        const headerRow = sheet.addRow([
            'Ngày', 'Mã', 'Loại', 'Đối tác', 'Mô tả', 'Số tiền', 'Trạng thái'
        ]);
        headerRow.font = { bold: true };
        headerRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' },
            };
            cell.border = {
                bottom: { style: 'thin' },
            };
        });

        // Data rows
        transactions.forEach((t) => {
            sheet.addRow([
                t.trans_date.toISOString().split('T')[0],
                t.code || t.trans_number,
                ['SALE', 'INCOME', 'CASH_IN'].includes(t.trans_type) ? 'Thu' : 'Chi',
                t.partner?.name || t.partner_name || '',
                t.description || '',
                Number(t.total_amount),
                t.payment_status === 'PAID' ? 'Đã TT' :
                    t.payment_status === 'PARTIAL' ? 'Một phần' : 'Chưa TT',
            ]);
        });

        // Set column widths
        sheet.getColumn(1).width = 12;
        sheet.getColumn(2).width = 18;
        sheet.getColumn(3).width = 8;
        sheet.getColumn(4).width = 25;
        sheet.getColumn(5).width = 30;
        sheet.getColumn(6).width = 15;
        sheet.getColumn(7).width = 12;

        // Format currency column
        sheet.getColumn(6).numFmt = '#,##0';

        // Add summary at bottom
        sheet.addRow([]);
        const totalIncome = transactions
            .filter(t => ['SALE', 'INCOME', 'CASH_IN'].includes(t.trans_type))
            .reduce((sum, t) => sum + Number(t.total_amount), 0);
        const totalExpense = transactions
            .filter(t => ['PURCHASE', 'EXPENSE', 'CASH_OUT'].includes(t.trans_type))
            .reduce((sum, t) => sum + Number(t.total_amount), 0);

        sheet.addRow(['', '', '', '', 'Tổng thu:', totalIncome, '']);
        sheet.addRow(['', '', '', '', 'Tổng chi:', totalExpense, '']);
        sheet.addRow(['', '', '', '', 'Chênh lệch:', totalIncome - totalExpense, '']);

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();

        const filename = `GiaoDich_${new Date().toISOString().split('T')[0]}.xlsx`;

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('Export transactions error:', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message } },
            { status: 500 }
        );
    }
});
