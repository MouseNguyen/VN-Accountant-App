// src/app/api/reports/export/route.ts
// API endpoint to export reports as Excel/PDF

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/auth';
import * as ExcelJS from 'exceljs';
import { getIncomeExpenseReport, getInventoryReport, getPayableReport } from '@/services/report.service';

export const GET = withAuth(async (request: NextRequest, _context, user: AuthUser) => {
    try {
        const { searchParams } = new URL(request.url);
        const reportType = searchParams.get('report_type') || 'income_expense';
        const exportFormat = searchParams.get('format') || 'excel';
        const from = searchParams.get('from') || searchParams.get('start_date');
        const to = searchParams.get('to') || searchParams.get('end_date');

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'LABA ERP';
        workbook.created = new Date();

        let filename: string;

        switch (reportType) {
            case 'income_expense': {
                if (!from || !to) {
                    return NextResponse.json(
                        { success: false, error: { message: 'Missing from/to dates' } },
                        { status: 400 }
                    );
                }
                const data = await getIncomeExpenseReport({ from, to });
                filename = `BaoCaoThuChi_${from}_${to}.xlsx`;

                const sheet = workbook.addWorksheet('Báo cáo Thu Chi');

                // Header
                sheet.mergeCells('A1:E1');
                const titleCell = sheet.getCell('A1');
                titleCell.value = 'BÁO CÁO THU CHI';
                titleCell.font = { bold: true, size: 16 };
                titleCell.alignment = { horizontal: 'center' };

                sheet.mergeCells('A2:E2');
                sheet.getCell('A2').value = `Từ ${from} đến ${to}`;
                sheet.getCell('A2').alignment = { horizontal: 'center' };

                // Summary section
                sheet.addRow([]);
                sheet.addRow(['Tổng Thu', data.total_income || 0]);
                sheet.addRow(['Tổng Chi', data.total_expense || 0]);
                sheet.addRow(['Chênh lệch', (data.total_income || 0) - (data.total_expense || 0)]);

                // Set column widths
                sheet.getColumn(1).width = 15;
                sheet.getColumn(2).width = 15;
                sheet.getColumn(5).numFmt = '#,##0';
                break;
            }

            case 'inventory': {
                const data = await getInventoryReport({});
                filename = `BaoCaoTonKho_${new Date().toISOString().split('T')[0]}.xlsx`;

                const sheet = workbook.addWorksheet('Báo cáo Tồn kho');

                // Header
                sheet.mergeCells('A1:E1');
                const titleCell = sheet.getCell('A1');
                titleCell.value = 'BÁO CÁO TỒN KHO';
                titleCell.font = { bold: true, size: 16 };
                titleCell.alignment = { horizontal: 'center' };

                sheet.mergeCells('A2:E2');
                sheet.getCell('A2').value = `Ngày: ${new Date().toLocaleDateString('vi-VN')}`;
                sheet.getCell('A2').alignment = { horizontal: 'center' };

                // Summary
                sheet.addRow([]);
                sheet.addRow(['Tổng giá trị tồn kho', data.total_value || 0]);
                sheet.addRow(['Số sản phẩm', data.total_products || 0]);
                sheet.addRow(['Sản phẩm tồn thấp', data.low_stock_count || 0]);

                // Table header
                sheet.addRow([]);
                const headerRow = sheet.addRow(['Mã SP', 'Tên sản phẩm', 'Tồn kho', 'Đơn vị', 'Giá vốn TB', 'Giá trị']);
                headerRow.font = { bold: true };
                headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

                // Data rows
                const items = data.items || [];
                items.forEach((item: any) => {
                    sheet.addRow([
                        item.product_code,
                        item.product_name,
                        item.current_stock,
                        item.base_unit,
                        item.avg_cost,
                        item.value,
                    ]);
                });

                // Set column widths
                sheet.getColumn(1).width = 12;
                sheet.getColumn(2).width = 30;
                sheet.getColumn(3).width = 12;
                sheet.getColumn(4).width = 10;
                sheet.getColumn(5).width = 15;
                sheet.getColumn(6).width = 15;
                sheet.getColumn(5).numFmt = '#,##0';
                sheet.getColumn(6).numFmt = '#,##0';
                break;
            }

            case 'payable': {
                const data = await getPayableReport();
                filename = `BaoCaoCongNo_${new Date().toISOString().split('T')[0]}.xlsx`;

                const sheet = workbook.addWorksheet('Báo cáo Công nợ');

                // Header
                sheet.mergeCells('A1:E1');
                const titleCell = sheet.getCell('A1');
                titleCell.value = 'BÁO CÁO CÔNG NỢ';
                titleCell.font = { bold: true, size: 16 };
                titleCell.alignment = { horizontal: 'center' };

                sheet.mergeCells('A2:E2');
                sheet.getCell('A2').value = `Ngày: ${new Date().toLocaleDateString('vi-VN')}`;
                sheet.getCell('A2').alignment = { horizontal: 'center' };

                // Summary
                sheet.addRow([]);
                sheet.addRow(['Tổng phải thu', data.total_receivable || 0]);
                sheet.addRow(['Tổng phải trả', data.total_payable || 0]);
                sheet.addRow(['Tổng quá hạn', data.total_overdue || 0]);

                // Table header
                sheet.addRow([]);
                const headerRow = sheet.addRow(['Đối tác', 'Loại', 'Số dư nợ', 'Quá hạn', 'Ngày quá hạn']);
                headerRow.font = { bold: true };
                headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

                // Data rows
                const partners = data.partners || [];
                partners.forEach((p: any) => {
                    sheet.addRow([
                        p.partner_name,
                        p.partner_type === 'CUSTOMER' ? 'Khách hàng' : 'Nhà cung cấp',
                        p.balance,
                        p.overdue_balance,
                        p.overdue_days > 0 ? `${p.overdue_days} ngày` : 'Trong hạn',
                    ]);
                });

                // Set column widths
                sheet.getColumn(1).width = 30;
                sheet.getColumn(2).width = 15;
                sheet.getColumn(3).width = 15;
                sheet.getColumn(4).width = 15;
                sheet.getColumn(5).width = 12;
                sheet.getColumn(3).numFmt = '#,##0';
                sheet.getColumn(4).numFmt = '#,##0';
                break;
            }

            default:
                return NextResponse.json(
                    { success: false, error: { message: `Report type ${reportType} not supported yet` } },
                    { status: 400 }
                );
        }

        if (exportFormat === 'excel') {
            // Generate buffer
            const buffer = await workbook.xlsx.writeBuffer();

            return new NextResponse(buffer, {
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="${filename}"`,
                },
            });
        }

        // Default: return JSON
        return NextResponse.json({ success: true, filename });
    } catch (error) {
        console.error('Export error:', error);
        return NextResponse.json(
            { success: false, error: { message: (error as Error).message } },
            { status: 500 }
        );
    }
});
