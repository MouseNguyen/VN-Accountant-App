// src/lib/export/excel.ts

import ExcelJS from 'exceljs';
import type {
    CashBookReport,
    BankBookReport,
    PurchaseInvoiceReport,
    SalesInvoiceReport,
    AR131Report,
    AP331Report,
    TrialBalanceReport,
    ProfitLossReport,
} from '@/types/reports';

// ==========================================
// STYLE CONSTANTS
// ==========================================

const STYLES = {
    title: {
        font: { bold: true, size: 16, name: 'Arial' },
        alignment: { horizontal: 'center' as const },
    },
    subtitle: {
        font: { bold: true, size: 12, name: 'Arial' },
        alignment: { horizontal: 'center' as const },
    },
    header: {
        font: { bold: true, size: 11, name: 'Arial', color: { argb: 'FFFFFF' } },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: '4472C4' } },
        alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
        border: {
            top: { style: 'thin' as const },
            bottom: { style: 'thin' as const },
            left: { style: 'thin' as const },
            right: { style: 'thin' as const },
        },
    },
    cell: {
        font: { size: 11, name: 'Arial' },
        border: {
            top: { style: 'thin' as const },
            bottom: { style: 'thin' as const },
            left: { style: 'thin' as const },
            right: { style: 'thin' as const },
        },
    },
    totalRow: {
        font: { bold: true, size: 11, name: 'Arial' },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'E2EFDA' } },
        border: {
            top: { style: 'thin' as const },
            bottom: { style: 'double' as const },
            left: { style: 'thin' as const },
            right: { style: 'thin' as const },
        },
    },
    money: {
        numFmt: '#,##0',
    },
};

// ==========================================
// 1. SỔ QUỸ TIỀN MẶT (CASH BOOK)
// ==========================================

export async function exportCashBook(report: CashBookReport): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LABA ERP';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Sổ quỹ tiền mặt', {
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
    });

    // Title
    sheet.mergeCells('A1:G1');
    sheet.getCell('A1').value = report.meta?.farm_name || 'LABA ERP';
    sheet.getCell('A1').style = STYLES.subtitle;

    sheet.mergeCells('A2:G2');
    sheet.getCell('A2').value = 'SỔ QUỸ TIỀN MẶT';
    sheet.getCell('A2').style = STYLES.title;

    sheet.mergeCells('A3:G3');
    sheet.getCell('A3').value = `Từ ngày ${report.meta?.period?.from_date || ''} đến ${report.meta?.period?.to_date || ''}`;
    sheet.getCell('A3').style = STYLES.subtitle;

    sheet.mergeCells('A4:G4');
    sheet.getCell('A4').value = `Tài khoản: ${report.account?.code || '111'} - ${report.account?.name || 'Tiền mặt'}`;

    // Headers
    const headerRow = 6;
    const headers = ['Ngày', 'Chứng từ', 'Diễn giải', 'Đối tượng', 'Thu', 'Chi', 'Tồn'];
    headers.forEach((h, i) => {
        const cell = sheet.getCell(headerRow, i + 1);
        cell.value = h;
        cell.font = STYLES.header.font;
        cell.fill = STYLES.header.fill;
        cell.alignment = STYLES.header.alignment;
        cell.border = STYLES.header.border;
    });

    // Column widths
    sheet.getColumn(1).width = 12;  // Ngày
    sheet.getColumn(2).width = 15;  // Chứng từ
    sheet.getColumn(3).width = 35;  // Diễn giải
    sheet.getColumn(4).width = 25;  // Đối tượng
    sheet.getColumn(5).width = 15;  // Thu
    sheet.getColumn(6).width = 15;  // Chi
    sheet.getColumn(7).width = 18;  // Tồn

    // Opening balance row
    let row = headerRow + 1;
    sheet.getCell(row, 1).value = '';
    sheet.getCell(row, 2).value = '';
    sheet.getCell(row, 3).value = 'Số dư đầu kỳ';
    sheet.getCell(row, 3).font = { bold: true, italic: true };
    sheet.getCell(row, 7).value = report.opening_balance || 0;
    sheet.getCell(row, 7).numFmt = '#,##0';
    row++;

    // Data rows
    const entries = report.entries || [];
    for (const entry of entries) {
        sheet.getCell(row, 1).value = entry.date;
        sheet.getCell(row, 2).value = entry.code;
        sheet.getCell(row, 3).value = entry.description;
        sheet.getCell(row, 4).value = entry.partner_name || '';
        sheet.getCell(row, 5).value = entry.debit || '';
        sheet.getCell(row, 5).numFmt = '#,##0';
        sheet.getCell(row, 6).value = entry.credit || '';
        sheet.getCell(row, 6).numFmt = '#,##0';
        sheet.getCell(row, 7).value = entry.balance;
        sheet.getCell(row, 7).numFmt = '#,##0';

        // Apply cell borders
        for (let col = 1; col <= 7; col++) {
            sheet.getCell(row, col).border = STYLES.cell.border;
        }
        row++;
    }

    // Total row
    sheet.getCell(row, 3).value = 'Cộng phát sinh';
    sheet.getCell(row, 3).font = { bold: true };
    sheet.getCell(row, 5).value = report.totals?.total_debit || 0;
    sheet.getCell(row, 5).numFmt = '#,##0';
    sheet.getCell(row, 5).font = { bold: true };
    sheet.getCell(row, 6).value = report.totals?.total_credit || 0;
    sheet.getCell(row, 6).numFmt = '#,##0';
    sheet.getCell(row, 6).font = { bold: true };
    row++;

    // Closing balance
    sheet.getCell(row, 3).value = 'Số dư cuối kỳ';
    sheet.getCell(row, 3).font = { bold: true };
    sheet.getCell(row, 7).value = report.closing_balance || 0;
    sheet.getCell(row, 7).numFmt = '#,##0';
    sheet.getCell(row, 7).font = { bold: true };

    // Footer
    row += 3;
    sheet.getCell(row, 5).value = `Ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`;
    sheet.mergeCells(row, 5, row, 7);
    sheet.getCell(row, 5).alignment = { horizontal: 'center' };

    row++;
    sheet.getCell(row, 1).value = 'Người lập';
    sheet.getCell(row, 1).font = { bold: true };
    sheet.getCell(row, 1).alignment = { horizontal: 'center' };

    sheet.getCell(row, 5).value = 'Kế toán trưởng';
    sheet.mergeCells(row, 5, row, 7);
    sheet.getCell(row, 5).font = { bold: true };
    sheet.getCell(row, 5).alignment = { horizontal: 'center' };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

// ==========================================
// 2. SỔ TIỀN GỬI NGÂN HÀNG (BANK BOOK)
// ==========================================

export async function exportBankBook(report: BankBookReport): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LABA ERP';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Sổ tiền gửi NH');

    // Title
    sheet.mergeCells('A1:H1');
    sheet.getCell('A1').value = report.meta?.farm_name || 'LABA ERP';
    sheet.getCell('A1').style = STYLES.subtitle;

    sheet.mergeCells('A2:H2');
    sheet.getCell('A2').value = 'SỔ TIỀN GỬI NGÂN HÀNG';
    sheet.getCell('A2').style = STYLES.title;

    sheet.mergeCells('A3:H3');
    sheet.getCell('A3').value = `Tài khoản: ${report.account?.name || ''}`;

    sheet.mergeCells('A4:H4');
    sheet.getCell('A4').value = `Ngân hàng: ${report.account?.bank_name || ''} - STK: ${report.account?.bank_account || ''}`;

    // Headers
    const headers = ['Ngày', 'Chứng từ', 'Số CT NH', 'Diễn giải', 'Đối tượng', 'Thu', 'Chi', 'Tồn'];
    const headerRow = 6;
    headers.forEach((h, i) => {
        const cell = sheet.getCell(headerRow, i + 1);
        cell.value = h;
        cell.font = STYLES.header.font;
        cell.fill = STYLES.header.fill;
        cell.alignment = STYLES.header.alignment;
        cell.border = STYLES.header.border;
    });

    // Column widths
    sheet.getColumn(1).width = 12;
    sheet.getColumn(2).width = 15;
    sheet.getColumn(3).width = 15;
    sheet.getColumn(4).width = 30;
    sheet.getColumn(5).width = 20;
    sheet.getColumn(6).width = 15;
    sheet.getColumn(7).width = 15;
    sheet.getColumn(8).width = 18;

    // Data
    let row = headerRow + 1;

    // Opening
    sheet.getCell(row, 4).value = 'Số dư đầu kỳ';
    sheet.getCell(row, 4).font = { bold: true, italic: true };
    sheet.getCell(row, 8).value = report.opening_balance || 0;
    sheet.getCell(row, 8).numFmt = '#,##0';
    row++;

    const entries = report.entries || [];
    for (const entry of entries) {
        sheet.getCell(row, 1).value = entry.date;
        sheet.getCell(row, 2).value = entry.code;
        sheet.getCell(row, 3).value = entry.reference || '';
        sheet.getCell(row, 4).value = entry.description;
        sheet.getCell(row, 5).value = entry.partner_name || '';
        sheet.getCell(row, 6).value = entry.debit || '';
        sheet.getCell(row, 6).numFmt = '#,##0';
        sheet.getCell(row, 7).value = entry.credit || '';
        sheet.getCell(row, 7).numFmt = '#,##0';
        sheet.getCell(row, 8).value = entry.balance;
        sheet.getCell(row, 8).numFmt = '#,##0';
        row++;
    }

    // Totals
    sheet.getCell(row, 4).value = 'Cộng phát sinh';
    sheet.getCell(row, 4).font = { bold: true };
    sheet.getCell(row, 6).value = report.totals?.total_debit || 0;
    sheet.getCell(row, 6).numFmt = '#,##0';
    sheet.getCell(row, 7).value = report.totals?.total_credit || 0;
    sheet.getCell(row, 7).numFmt = '#,##0';
    row++;

    sheet.getCell(row, 4).value = 'Số dư cuối kỳ';
    sheet.getCell(row, 4).font = { bold: true };
    sheet.getCell(row, 8).value = report.closing_balance || 0;
    sheet.getCell(row, 8).numFmt = '#,##0';
    sheet.getCell(row, 8).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

// ==========================================
// 3. BẢNG KÊ HÓA ĐƠN MUA VÀO (PURCHASE INVOICES)
// ==========================================

export async function exportPurchaseInvoices(report: PurchaseInvoiceReport): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LABA ERP';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Bảng kê HĐ mua vào');

    sheet.mergeCells('A1:I1');
    sheet.getCell('A1').value = 'BẢNG KÊ HÓA ĐƠN, CHỨNG TỪ HÀNG HÓA, DỊCH VỤ MUA VÀO';
    sheet.getCell('A1').style = STYLES.title;

    sheet.mergeCells('A2:I2');
    sheet.getCell('A2').value = `Kỳ tính thuế: Từ ${report.meta?.period?.from_date || ''} đến ${report.meta?.period?.to_date || ''}`;

    const headers = ['STT', 'Số HĐ', 'Ngày', 'MST NCC', 'Tên NCC', 'Giá trị HH', 'Thuế suất', 'Tiền thuế', 'Tổng TT'];
    const headerRow = 4;

    headers.forEach((h, i) => {
        const cell = sheet.getCell(headerRow, i + 1);
        cell.value = h;
        cell.font = STYLES.header.font;
        cell.fill = STYLES.header.fill;
        cell.alignment = STYLES.header.alignment;
        cell.border = STYLES.header.border;
    });

    sheet.getColumn(1).width = 5;
    sheet.getColumn(2).width = 15;
    sheet.getColumn(3).width = 12;
    sheet.getColumn(4).width = 15;
    sheet.getColumn(5).width = 30;
    sheet.getColumn(6).width = 15;
    sheet.getColumn(7).width = 10;
    sheet.getColumn(8).width = 15;
    sheet.getColumn(9).width = 15;

    let row = headerRow + 1;
    const entries = report.entries || [];
    for (const entry of entries) {
        sheet.getCell(row, 1).value = entry.stt;
        sheet.getCell(row, 2).value = entry.invoice_number;
        sheet.getCell(row, 3).value = entry.invoice_date;
        sheet.getCell(row, 4).value = entry.vendor_tax_code || '';
        sheet.getCell(row, 5).value = entry.vendor_name;
        sheet.getCell(row, 6).value = entry.goods_value;
        sheet.getCell(row, 6).numFmt = '#,##0';
        sheet.getCell(row, 7).value = `${entry.vat_rate || 0}%`;
        sheet.getCell(row, 8).value = entry.vat_amount || 0;
        sheet.getCell(row, 8).numFmt = '#,##0';
        sheet.getCell(row, 9).value = entry.total_amount;
        sheet.getCell(row, 9).numFmt = '#,##0';
        row++;
    }

    // Totals
    row++;
    sheet.getCell(row, 5).value = 'TỔNG CỘNG';
    sheet.getCell(row, 5).font = { bold: true };
    sheet.getCell(row, 6).value = report.summary?.total_goods_value || 0;
    sheet.getCell(row, 6).font = { bold: true };
    sheet.getCell(row, 6).numFmt = '#,##0';
    sheet.getCell(row, 8).value = report.summary?.total_vat_amount || 0;
    sheet.getCell(row, 8).font = { bold: true };
    sheet.getCell(row, 8).numFmt = '#,##0';
    sheet.getCell(row, 9).value = report.summary?.total_amount || 0;
    sheet.getCell(row, 9).font = { bold: true };
    sheet.getCell(row, 9).numFmt = '#,##0';

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

// ==========================================
// 4. BẢNG KÊ HÓA ĐƠN BÁN RA (SALES INVOICES)
// ==========================================

export async function exportSalesInvoices(report: SalesInvoiceReport): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LABA ERP';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Bảng kê HĐ bán ra');

    sheet.mergeCells('A1:J1');
    sheet.getCell('A1').value = 'BẢNG KÊ HÓA ĐƠN, CHỨNG TỪ HÀNG HÓA, DỊCH VỤ BÁN RA';
    sheet.getCell('A1').style = STYLES.title;

    sheet.mergeCells('A2:J2');
    sheet.getCell('A2').value = `Kỳ tính thuế: Từ ${report.meta?.period?.from_date || ''} đến ${report.meta?.period?.to_date || ''}`;

    const headers = ['STT', 'Số HĐ', 'Ngày', 'MST KH', 'Tên KH', 'Giá trị HH', 'TS', 'Tiền thuế', 'Tổng TT', 'Trạng thái'];
    const headerRow = 4;

    headers.forEach((h, i) => {
        const cell = sheet.getCell(headerRow, i + 1);
        cell.value = h;
        cell.font = STYLES.header.font;
        cell.fill = STYLES.header.fill;
        cell.alignment = STYLES.header.alignment;
        cell.border = STYLES.header.border;
    });

    sheet.getColumn(1).width = 5;
    sheet.getColumn(2).width = 15;
    sheet.getColumn(3).width = 12;
    sheet.getColumn(4).width = 15;
    sheet.getColumn(5).width = 25;
    sheet.getColumn(6).width = 15;
    sheet.getColumn(7).width = 8;
    sheet.getColumn(8).width = 12;
    sheet.getColumn(9).width = 15;
    sheet.getColumn(10).width = 12;

    let row = headerRow + 1;
    const entries = report.entries || [];
    for (const entry of entries) {
        sheet.getCell(row, 1).value = entry.stt;
        sheet.getCell(row, 2).value = entry.invoice_number;
        sheet.getCell(row, 3).value = entry.invoice_date;
        sheet.getCell(row, 4).value = entry.customer_tax_code || '';
        sheet.getCell(row, 5).value = entry.customer_name;
        sheet.getCell(row, 6).value = entry.goods_value;
        sheet.getCell(row, 6).numFmt = '#,##0';
        sheet.getCell(row, 7).value = `${entry.vat_rate || 0}%`;
        sheet.getCell(row, 8).value = entry.vat_amount || 0;
        sheet.getCell(row, 8).numFmt = '#,##0';
        sheet.getCell(row, 9).value = entry.total_amount;
        sheet.getCell(row, 9).numFmt = '#,##0';

        const statusLabel: Record<string, string> = { PAID: 'Đã thu', UNPAID: 'Chưa thu', PARTIAL: 'Thu 1 phần', PENDING: 'Chưa thu' };
        sheet.getCell(row, 10).value = statusLabel[entry.payment_status] || entry.payment_status;
        row++;
    }

    // Totals
    row++;
    sheet.getCell(row, 5).value = 'TỔNG CỘNG';
    sheet.getCell(row, 5).font = { bold: true };
    sheet.getCell(row, 6).value = report.summary?.total_goods_value || 0;
    sheet.getCell(row, 6).numFmt = '#,##0';
    sheet.getCell(row, 8).value = report.summary?.total_vat_amount || 0;
    sheet.getCell(row, 8).numFmt = '#,##0';
    sheet.getCell(row, 9).value = report.summary?.total_amount || 0;
    sheet.getCell(row, 9).numFmt = '#,##0';

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

// ==========================================
// 5. SỔ CHI TIẾT CÔNG NỢ 131 (AR)
// ==========================================

export async function exportAR131(report: AR131Report): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LABA ERP';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Sổ CT công nợ 131');

    sheet.mergeCells('A1:F1');
    sheet.getCell('A1').value = 'SỔ CHI TIẾT CÔNG NỢ TÀI KHOẢN 131 - PHẢI THU KHÁCH HÀNG';
    sheet.getCell('A1').style = STYLES.title;

    sheet.mergeCells('A2:F2');
    sheet.getCell('A2').value = `Từ ${report.meta?.period?.from_date || ''} đến ${report.meta?.period?.to_date || ''}`;

    // Summary
    let row = 4;
    sheet.getCell(row, 1).value = 'TỔNG HỢP';
    sheet.getCell(row, 1).font = { bold: true, size: 12 };
    row++;

    sheet.getCell(row, 1).value = 'Số dư đầu kỳ:';
    sheet.getCell(row, 3).value = report.summary_opening || 0;
    sheet.getCell(row, 3).numFmt = '#,##0';
    row++;

    sheet.getCell(row, 1).value = 'Phát sinh Nợ:';
    sheet.getCell(row, 3).value = report.summary_debit || 0;
    sheet.getCell(row, 3).numFmt = '#,##0';
    row++;

    sheet.getCell(row, 1).value = 'Phát sinh Có:';
    sheet.getCell(row, 3).value = report.summary_credit || 0;
    sheet.getCell(row, 3).numFmt = '#,##0';
    row++;

    sheet.getCell(row, 1).value = 'Số dư cuối kỳ:';
    sheet.getCell(row, 1).font = { bold: true };
    sheet.getCell(row, 3).value = report.summary_closing || 0;
    sheet.getCell(row, 3).numFmt = '#,##0';
    sheet.getCell(row, 3).font = { bold: true };
    row += 2;

    // Column widths
    sheet.getColumn(1).width = 12;
    sheet.getColumn(2).width = 15;
    sheet.getColumn(3).width = 35;
    sheet.getColumn(4).width = 15;
    sheet.getColumn(5).width = 15;
    sheet.getColumn(6).width = 18;

    // Detail by customer
    const customers = report.customers || [];
    for (const customer of customers) {
        // Customer header
        sheet.getCell(row, 1).value = `${customer.customer_code || ''} - ${customer.customer_name || ''}`;
        sheet.getCell(row, 1).font = { bold: true };
        sheet.mergeCells(row, 1, row, 6);
        row++;

        // Column headers
        const headers = ['Ngày', 'Chứng từ', 'Diễn giải', 'Nợ', 'Có', 'Dư'];
        headers.forEach((h, i) => {
            sheet.getCell(row, i + 1).value = h;
            sheet.getCell(row, i + 1).font = { bold: true };
        });
        row++;

        // Opening
        sheet.getCell(row, 3).value = 'Số dư đầu kỳ';
        sheet.getCell(row, 3).font = { italic: true };
        sheet.getCell(row, 6).value = customer.opening_balance || 0;
        sheet.getCell(row, 6).numFmt = '#,##0';
        row++;

        // Entries
        const entries = customer.entries || [];
        for (const entry of entries) {
            sheet.getCell(row, 1).value = entry.date;
            sheet.getCell(row, 2).value = entry.code;
            sheet.getCell(row, 3).value = entry.description;
            sheet.getCell(row, 4).value = entry.debit || '';
            sheet.getCell(row, 4).numFmt = '#,##0';
            sheet.getCell(row, 5).value = entry.credit || '';
            sheet.getCell(row, 5).numFmt = '#,##0';
            sheet.getCell(row, 6).value = entry.balance;
            sheet.getCell(row, 6).numFmt = '#,##0';
            row++;
        }

        // Customer total
        sheet.getCell(row, 3).value = 'Cộng:';
        sheet.getCell(row, 3).font = { bold: true };
        sheet.getCell(row, 4).value = customer.total_debit || 0;
        sheet.getCell(row, 4).numFmt = '#,##0';
        sheet.getCell(row, 5).value = customer.total_credit || 0;
        sheet.getCell(row, 5).numFmt = '#,##0';
        sheet.getCell(row, 6).value = customer.closing_balance || 0;
        sheet.getCell(row, 6).numFmt = '#,##0';
        sheet.getCell(row, 6).font = { bold: true };
        row += 2;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

// ==========================================
// 6. SỔ CHI TIẾT CÔNG NỢ 331 (AP)
// ==========================================

export async function exportAP331(report: AP331Report): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LABA ERP';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Sổ CT công nợ 331');

    sheet.mergeCells('A1:F1');
    sheet.getCell('A1').value = 'SỔ CHI TIẾT CÔNG NỢ TÀI KHOẢN 331 - PHẢI TRẢ NHÀ CUNG CẤP';
    sheet.getCell('A1').style = STYLES.title;

    sheet.mergeCells('A2:F2');
    sheet.getCell('A2').value = `Từ ${report.meta?.period?.from_date || ''} đến ${report.meta?.period?.to_date || ''}`;

    // Summary
    let row = 4;
    sheet.getCell(row, 1).value = 'TỔNG HỢP';
    sheet.getCell(row, 1).font = { bold: true, size: 12 };
    row++;

    sheet.getCell(row, 1).value = 'Số dư đầu kỳ:';
    sheet.getCell(row, 3).value = report.summary_opening || 0;
    sheet.getCell(row, 3).numFmt = '#,##0';
    row++;

    sheet.getCell(row, 1).value = 'Phát sinh Nợ:';
    sheet.getCell(row, 3).value = report.summary_debit || 0;
    sheet.getCell(row, 3).numFmt = '#,##0';
    row++;

    sheet.getCell(row, 1).value = 'Phát sinh Có:';
    sheet.getCell(row, 3).value = report.summary_credit || 0;
    sheet.getCell(row, 3).numFmt = '#,##0';
    row++;

    sheet.getCell(row, 1).value = 'Số dư cuối kỳ:';
    sheet.getCell(row, 1).font = { bold: true };
    sheet.getCell(row, 3).value = report.summary_closing || 0;
    sheet.getCell(row, 3).numFmt = '#,##0';
    sheet.getCell(row, 3).font = { bold: true };
    row += 2;

    // Column widths
    sheet.getColumn(1).width = 12;
    sheet.getColumn(2).width = 15;
    sheet.getColumn(3).width = 35;
    sheet.getColumn(4).width = 15;
    sheet.getColumn(5).width = 15;
    sheet.getColumn(6).width = 18;

    // Detail by vendor
    const vendors = report.vendors || [];
    for (const vendor of vendors) {
        // Vendor header
        sheet.getCell(row, 1).value = `${vendor.vendor_code || ''} - ${vendor.vendor_name || ''}`;
        sheet.getCell(row, 1).font = { bold: true };
        sheet.mergeCells(row, 1, row, 6);
        row++;

        // Column headers
        const headers = ['Ngày', 'Chứng từ', 'Diễn giải', 'Nợ', 'Có', 'Dư'];
        headers.forEach((h, i) => {
            sheet.getCell(row, i + 1).value = h;
            sheet.getCell(row, i + 1).font = { bold: true };
        });
        row++;

        // Opening
        sheet.getCell(row, 3).value = 'Số dư đầu kỳ';
        sheet.getCell(row, 3).font = { italic: true };
        sheet.getCell(row, 6).value = vendor.opening_balance || 0;
        sheet.getCell(row, 6).numFmt = '#,##0';
        row++;

        // Entries
        const entries = vendor.entries || [];
        for (const entry of entries) {
            sheet.getCell(row, 1).value = entry.date;
            sheet.getCell(row, 2).value = entry.code;
            sheet.getCell(row, 3).value = entry.description;
            sheet.getCell(row, 4).value = entry.debit || '';
            sheet.getCell(row, 4).numFmt = '#,##0';
            sheet.getCell(row, 5).value = entry.credit || '';
            sheet.getCell(row, 5).numFmt = '#,##0';
            sheet.getCell(row, 6).value = entry.balance;
            sheet.getCell(row, 6).numFmt = '#,##0';
            row++;
        }

        // Vendor total
        sheet.getCell(row, 3).value = 'Cộng:';
        sheet.getCell(row, 3).font = { bold: true };
        sheet.getCell(row, 4).value = vendor.total_debit || 0;
        sheet.getCell(row, 4).numFmt = '#,##0';
        sheet.getCell(row, 5).value = vendor.total_credit || 0;
        sheet.getCell(row, 5).numFmt = '#,##0';
        sheet.getCell(row, 6).value = vendor.closing_balance || 0;
        sheet.getCell(row, 6).numFmt = '#,##0';
        sheet.getCell(row, 6).font = { bold: true };
        row += 2;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

// ==========================================
// 7. BẢNG CÂN ĐỐI SỐ PHÁT SINH (TRIAL BALANCE)
// ==========================================

export async function exportTrialBalance(report: TrialBalanceReport): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LABA ERP';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Bảng CĐSPS');

    sheet.mergeCells('A1:H1');
    sheet.getCell('A1').value = 'BẢNG CÂN ĐỐI SỐ PHÁT SINH';
    sheet.getCell('A1').style = STYLES.title;

    sheet.mergeCells('A2:H2');
    sheet.getCell('A2').value = `Từ ${report.meta?.period?.from_date || ''} đến ${report.meta?.period?.to_date || ''}`;

    // Headers - Row 4 and 5 (merged headers)
    const headerRow = 4;

    sheet.mergeCells(headerRow, 1, headerRow + 1, 1);
    sheet.getCell(headerRow, 1).value = 'TK';
    sheet.getCell(headerRow, 1).font = STYLES.header.font;
    sheet.getCell(headerRow, 1).fill = STYLES.header.fill;
    sheet.getCell(headerRow, 1).alignment = STYLES.header.alignment;

    sheet.mergeCells(headerRow, 2, headerRow + 1, 2);
    sheet.getCell(headerRow, 2).value = 'Tên tài khoản';
    sheet.getCell(headerRow, 2).font = STYLES.header.font;
    sheet.getCell(headerRow, 2).fill = STYLES.header.fill;
    sheet.getCell(headerRow, 2).alignment = STYLES.header.alignment;

    sheet.mergeCells(headerRow, 3, headerRow, 4);
    sheet.getCell(headerRow, 3).value = 'Số dư đầu kỳ';
    sheet.getCell(headerRow, 3).font = STYLES.header.font;
    sheet.getCell(headerRow, 3).fill = STYLES.header.fill;
    sheet.getCell(headerRow, 3).alignment = STYLES.header.alignment;
    sheet.getCell(headerRow + 1, 3).value = 'Nợ';
    sheet.getCell(headerRow + 1, 3).font = STYLES.header.font;
    sheet.getCell(headerRow + 1, 3).fill = STYLES.header.fill;
    sheet.getCell(headerRow + 1, 4).value = 'Có';
    sheet.getCell(headerRow + 1, 4).font = STYLES.header.font;
    sheet.getCell(headerRow + 1, 4).fill = STYLES.header.fill;

    sheet.mergeCells(headerRow, 5, headerRow, 6);
    sheet.getCell(headerRow, 5).value = 'Phát sinh';
    sheet.getCell(headerRow, 5).font = STYLES.header.font;
    sheet.getCell(headerRow, 5).fill = STYLES.header.fill;
    sheet.getCell(headerRow, 5).alignment = STYLES.header.alignment;
    sheet.getCell(headerRow + 1, 5).value = 'Nợ';
    sheet.getCell(headerRow + 1, 5).font = STYLES.header.font;
    sheet.getCell(headerRow + 1, 5).fill = STYLES.header.fill;
    sheet.getCell(headerRow + 1, 6).value = 'Có';
    sheet.getCell(headerRow + 1, 6).font = STYLES.header.font;
    sheet.getCell(headerRow + 1, 6).fill = STYLES.header.fill;

    sheet.mergeCells(headerRow, 7, headerRow, 8);
    sheet.getCell(headerRow, 7).value = 'Số dư cuối kỳ';
    sheet.getCell(headerRow, 7).font = STYLES.header.font;
    sheet.getCell(headerRow, 7).fill = STYLES.header.fill;
    sheet.getCell(headerRow, 7).alignment = STYLES.header.alignment;
    sheet.getCell(headerRow + 1, 7).value = 'Nợ';
    sheet.getCell(headerRow + 1, 7).font = STYLES.header.font;
    sheet.getCell(headerRow + 1, 7).fill = STYLES.header.fill;
    sheet.getCell(headerRow + 1, 8).value = 'Có';
    sheet.getCell(headerRow + 1, 8).font = STYLES.header.font;
    sheet.getCell(headerRow + 1, 8).fill = STYLES.header.fill;

    // Column widths
    sheet.getColumn(1).width = 10;
    sheet.getColumn(2).width = 30;
    sheet.getColumn(3).width = 15;
    sheet.getColumn(4).width = 15;
    sheet.getColumn(5).width = 15;
    sheet.getColumn(6).width = 15;
    sheet.getColumn(7).width = 15;
    sheet.getColumn(8).width = 15;

    // Data rows
    let row = headerRow + 2;
    const accounts = report.accounts || [];
    for (const acc of accounts) {
        sheet.getCell(row, 1).value = acc.account_code;
        sheet.getCell(row, 2).value = acc.account_name;
        sheet.getCell(row, 3).value = acc.opening_debit || '';
        sheet.getCell(row, 4).value = acc.opening_credit || '';
        sheet.getCell(row, 5).value = acc.period_debit || '';
        sheet.getCell(row, 6).value = acc.period_credit || '';
        sheet.getCell(row, 7).value = acc.closing_debit || '';
        sheet.getCell(row, 8).value = acc.closing_credit || '';

        for (let c = 3; c <= 8; c++) {
            sheet.getCell(row, c).numFmt = '#,##0';
        }
        row++;
    }

    // Totals
    sheet.getCell(row, 2).value = 'TỔNG CỘNG';
    sheet.getCell(row, 2).font = { bold: true };
    sheet.getCell(row, 3).value = report.totals?.opening_debit || 0;
    sheet.getCell(row, 4).value = report.totals?.opening_credit || 0;
    sheet.getCell(row, 5).value = report.totals?.period_debit || 0;
    sheet.getCell(row, 6).value = report.totals?.period_credit || 0;
    sheet.getCell(row, 7).value = report.totals?.closing_debit || 0;
    sheet.getCell(row, 8).value = report.totals?.closing_credit || 0;

    for (let c = 3; c <= 8; c++) {
        sheet.getCell(row, c).numFmt = '#,##0';
        sheet.getCell(row, c).font = { bold: true };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

// ==========================================
// 8. BÁO CÁO LÃI LỖ (PROFIT/LOSS)
// ==========================================

export async function exportProfitLoss(report: ProfitLossReport): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LABA ERP';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Báo cáo lãi lỗ');

    sheet.mergeCells('A1:C1');
    sheet.getCell('A1').value = 'BÁO CÁO KẾT QUẢ KINH DOANH';
    sheet.getCell('A1').style = STYLES.title;

    sheet.mergeCells('A2:C2');
    sheet.getCell('A2').value = `Từ ${report.meta?.period?.from_date || ''} đến ${report.meta?.period?.to_date || ''}`;

    sheet.getColumn(1).width = 5;
    sheet.getColumn(2).width = 40;
    sheet.getColumn(3).width = 20;

    let row = 4;

    // Revenue
    sheet.getCell(row, 1).value = 'I';
    sheet.getCell(row, 2).value = 'Doanh thu bán hàng';
    sheet.getCell(row, 3).value = report.revenue?.sales || 0;
    sheet.getCell(row, 3).numFmt = '#,##0';
    row++;

    sheet.getCell(row, 1).value = '';
    sheet.getCell(row, 2).value = 'Thu nhập khác';
    sheet.getCell(row, 3).value = report.revenue?.other_income || 0;
    sheet.getCell(row, 3).numFmt = '#,##0';
    row++;

    sheet.getCell(row, 2).value = 'Tổng doanh thu';
    sheet.getCell(row, 2).font = { bold: true };
    sheet.getCell(row, 3).value = report.revenue?.total || (report.revenue?.sales || 0) + (report.revenue?.other_income || 0);
    sheet.getCell(row, 3).numFmt = '#,##0';
    sheet.getCell(row, 3).font = { bold: true };
    row += 2;

    // COGS
    sheet.getCell(row, 1).value = 'II';
    sheet.getCell(row, 2).value = 'Giá vốn hàng bán';
    sheet.getCell(row, 3).value = report.cost_of_goods_sold || 0;
    sheet.getCell(row, 3).numFmt = '#,##0';
    row += 2;

    // Gross profit
    sheet.getCell(row, 1).value = 'III';
    sheet.getCell(row, 2).value = 'Lợi nhuận gộp (I - II)';
    sheet.getCell(row, 2).font = { bold: true };
    sheet.getCell(row, 3).value = report.gross_profit || 0;
    sheet.getCell(row, 3).numFmt = '#,##0';
    sheet.getCell(row, 3).font = { bold: true };
    if ((report.gross_profit || 0) < 0) {
        sheet.getCell(row, 3).font = { bold: true, color: { argb: 'FF0000' } };
    }
    row += 2;

    // Expenses
    sheet.getCell(row, 1).value = 'IV';
    sheet.getCell(row, 2).value = 'Chi phí hoạt động';
    sheet.getCell(row, 3).value = report.expenses?.operating || 0;
    sheet.getCell(row, 3).numFmt = '#,##0';
    row++;

    if (report.expenses?.payroll) {
        sheet.getCell(row, 2).value = 'Chi phí nhân công';
        sheet.getCell(row, 3).value = report.expenses.payroll;
        sheet.getCell(row, 3).numFmt = '#,##0';
        row++;
    }

    sheet.getCell(row, 2).value = 'Tổng chi phí';
    sheet.getCell(row, 2).font = { bold: true };
    sheet.getCell(row, 3).value = report.expenses?.total || 0;
    sheet.getCell(row, 3).numFmt = '#,##0';
    sheet.getCell(row, 3).font = { bold: true };
    row += 2;

    // Net profit
    sheet.getCell(row, 1).value = 'V';
    sheet.getCell(row, 2).value = 'LỢI NHUẬN RÒNG (III - IV)';
    sheet.getCell(row, 2).font = { bold: true, size: 12 };
    sheet.getCell(row, 3).value = report.net_profit || 0;
    sheet.getCell(row, 3).numFmt = '#,##0';
    if ((report.net_profit || 0) < 0) {
        sheet.getCell(row, 3).font = { bold: true, size: 12, color: { argb: 'FF0000' } };
    } else {
        sheet.getCell(row, 3).font = { bold: true, size: 12, color: { argb: '00AA00' } };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

// ==========================================
// EXPORT DISPATCHER
// ==========================================

export async function exportReport(
    reportType: string,
    reportData: any
): Promise<Buffer> {
    switch (reportType) {
        case 'cash-book':
            return exportCashBook(reportData);
        case 'bank-book':
            return exportBankBook(reportData);
        case 'purchase-invoices':
            return exportPurchaseInvoices(reportData);
        case 'sales-invoices':
            return exportSalesInvoices(reportData);
        case 'ar-131':
            return exportAR131(reportData);
        case 'ap-331':
            return exportAP331(reportData);
        case 'trial-balance':
            return exportTrialBalance(reportData);
        case 'profit-loss':
            return exportProfitLoss(reportData);
        default:
            throw new Error(`Không hỗ trợ xuất báo cáo: ${reportType}`);
    }
}
