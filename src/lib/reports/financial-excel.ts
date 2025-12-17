// src/lib/reports/financial-excel.ts
// Excel Export for Financial Statements (Balance Sheet & Income Statement)
// Task 11 Phase 3

import ExcelJS from 'exceljs';
import type { BalanceSheet, IncomeStatement } from '@/services/financial-statement.service';

// ==========================================
// STYLE CONSTANTS
// ==========================================

const STYLES = {
    title: {
        font: { bold: true, size: 16, name: 'Arial' },
        alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    },
    subtitle: {
        font: { bold: true, size: 12, name: 'Arial' },
        alignment: { horizontal: 'center' as const },
    },
    header: {
        font: { bold: true, size: 11, name: 'Arial', color: { argb: 'FFFFFFFF' } },
        fill: {
            type: 'pattern' as const,
            pattern: 'solid' as const,
            fgColor: { argb: 'FF2E7D32' }, // Green header
        },
        alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
        border: {
            top: { style: 'thin' as const },
            bottom: { style: 'thin' as const },
            left: { style: 'thin' as const },
            right: { style: 'thin' as const },
        },
    },
    sectionHeader: {
        font: { bold: true, size: 11, name: 'Arial' },
        fill: {
            type: 'pattern' as const,
            pattern: 'solid' as const,
            fgColor: { argb: 'FFE8F5E9' }, // Light green
        },
        border: {
            top: { style: 'thin' as const },
            bottom: { style: 'thin' as const },
            left: { style: 'thin' as const },
            right: { style: 'thin' as const },
        },
    },
    cell: {
        font: { size: 10, name: 'Arial' },
        border: {
            top: { style: 'thin' as const },
            bottom: { style: 'thin' as const },
            left: { style: 'thin' as const },
            right: { style: 'thin' as const },
        },
    },
    totalRow: {
        font: { bold: true, size: 11, name: 'Arial' },
        fill: {
            type: 'pattern' as const,
            pattern: 'solid' as const,
            fgColor: { argb: 'FFC8E6C9' }, // Medium green
        },
        border: {
            top: { style: 'double' as const },
            bottom: { style: 'double' as const },
            left: { style: 'thin' as const },
            right: { style: 'thin' as const },
        },
    },
    money: '#,##0 "đ"',
    percent: '0.00"%"',
};

// ==========================================
// BALANCE SHEET EXCEL EXPORT
// ==========================================

export async function generateBalanceSheetExcel(data: BalanceSheet): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LABA ERP';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Bảng cân đối kế toán', {
        pageSetup: {
            paperSize: 9, // A4
            orientation: 'portrait',
            fitToPage: true,
        },
    });

    // Set column widths
    sheet.columns = [
        { width: 5 },   // STT
        { width: 40 },  // Chỉ tiêu
        { width: 10 },  // Mã số
        { width: 20 },  // Số cuối kỳ
        { width: 20 },  // Số đầu kỳ
    ];

    let rowNum = 1;

    // Title
    sheet.mergeCells(`A${rowNum}:E${rowNum}`);
    const titleCell = sheet.getCell(`A${rowNum}`);
    titleCell.value = 'BẢNG CÂN ĐỐI KẾ TOÁN';
    Object.assign(titleCell, STYLES.title);
    sheet.getRow(rowNum).height = 30;
    rowNum++;

    // Subtitle with date
    sheet.mergeCells(`A${rowNum}:E${rowNum}`);
    const subtitleCell = sheet.getCell(`A${rowNum}`);
    subtitleCell.value = `Tại ngày ${formatDate(data.as_of_date)}`;
    Object.assign(subtitleCell, STYLES.subtitle);
    rowNum++;

    // Farm info
    sheet.mergeCells(`A${rowNum}:E${rowNum}`);
    sheet.getCell(`A${rowNum}`).value = `Đơn vị: ${data.farm_name}`;
    rowNum++;

    if (data.farm_tax_code) {
        sheet.mergeCells(`A${rowNum}:E${rowNum}`);
        sheet.getCell(`A${rowNum}`).value = `Mã số thuế: ${data.farm_tax_code}`;
        rowNum++;
    }

    rowNum++; // Empty row

    // Header row
    const headerRow = sheet.getRow(rowNum);
    headerRow.values = ['STT', 'CHỈ TIÊU', 'Mã số', 'Số cuối kỳ', 'Số đầu kỳ'];
    headerRow.eachCell((cell) => {
        Object.assign(cell, STYLES.header);
    });
    headerRow.height = 25;
    rowNum++;

    // ==========================================
    // ASSETS (TÀI SẢN)
    // ==========================================

    // Section: Tài sản
    rowNum = addSectionHeader(sheet, rowNum, 'A', 'TÀI SẢN', '', data.total_assets);

    // Current Assets
    rowNum = addSectionHeader(sheet, rowNum, 'I', data.assets.current.label, data.assets.current.code || '100', data.assets.current.amount);

    if (data.assets.current.items) {
        let itemNum = 1;
        for (const item of data.assets.current.items) {
            rowNum = addDataRow(sheet, rowNum, itemNum, item.label, item.code || '', item.amount);
            itemNum++;
        }
    }

    // Fixed Assets
    rowNum = addSectionHeader(sheet, rowNum, 'II', data.assets.fixed.label, data.assets.fixed.code || '200', data.assets.fixed.amount);

    if (data.assets.fixed.items) {
        let itemNum = 1;
        for (const item of data.assets.fixed.items) {
            rowNum = addDataRow(sheet, rowNum, itemNum, item.label, item.code || '', item.amount);
            itemNum++;
        }
    }

    // Total Assets
    rowNum = addTotalRow(sheet, rowNum, 'TỔNG CỘNG TÀI SẢN', '270', data.total_assets);

    rowNum++; // Empty row

    // ==========================================
    // LIABILITIES & EQUITY (NGUỒN VỐN)
    // ==========================================

    rowNum = addSectionHeader(sheet, rowNum, 'B', 'NGUỒN VỐN', '', data.total_liabilities_equity);

    // Current Liabilities
    rowNum = addSectionHeader(sheet, rowNum, 'I', data.liabilities.current.label, data.liabilities.current.code || '300', data.liabilities.current.amount);

    if (data.liabilities.current.items) {
        let itemNum = 1;
        for (const item of data.liabilities.current.items) {
            rowNum = addDataRow(sheet, rowNum, itemNum, item.label, item.code || '', item.amount);
            itemNum++;
        }
    }

    // Equity
    rowNum = addSectionHeader(sheet, rowNum, 'II', 'Vốn chủ sở hữu', '400', data.equity.total);
    rowNum = addDataRow(sheet, rowNum, 1, 'Vốn đầu tư của chủ sở hữu', '411', data.equity.capital);
    rowNum = addDataRow(sheet, rowNum, 2, 'Lợi nhuận giữ lại', '421', data.equity.retained_earnings);
    rowNum = addDataRow(sheet, rowNum, 3, 'Lợi nhuận năm nay', '422', data.equity.current_year_profit);

    // Total Liabilities & Equity
    rowNum = addTotalRow(sheet, rowNum, 'TỔNG CỘNG NGUỒN VỐN', '440', data.total_liabilities_equity);

    rowNum++; // Empty row

    // Balance check indicator
    const balanceRow = sheet.getRow(rowNum);
    const balanceStatus = data.is_balanced ? '✅ CÂN ĐỐI' : '❌ KHÔNG CÂN ĐỐI';
    sheet.mergeCells(`A${rowNum}:E${rowNum}`);
    const balanceCell = sheet.getCell(`A${rowNum}`);
    balanceCell.value = `Kiểm tra: ${balanceStatus} (Chênh lệch: ${formatMoney(data.total_assets - data.total_liabilities_equity)})`;
    balanceCell.font = { bold: true, color: { argb: data.is_balanced ? 'FF2E7D32' : 'FFC62828' } };
    rowNum++;

    // Generated timestamp
    rowNum++;
    sheet.getCell(`A${rowNum}`).value = `Ngày lập: ${formatDateTime(data.generated_at)}`;

    // Return buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

// ==========================================
// INCOME STATEMENT EXCEL EXPORT
// ==========================================

export async function generateIncomeStatementExcel(data: IncomeStatement): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LABA ERP';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Báo cáo kết quả kinh doanh', {
        pageSetup: {
            paperSize: 9, // A4
            orientation: 'portrait',
            fitToPage: true,
        },
    });

    // Set column widths
    sheet.columns = [
        { width: 5 },   // STT
        { width: 45 },  // Chỉ tiêu
        { width: 10 },  // Mã số
        { width: 22 },  // Kỳ này
        { width: 22 },  // Kỳ trước
    ];

    let rowNum = 1;

    // Title
    sheet.mergeCells(`A${rowNum}:E${rowNum}`);
    const titleCell = sheet.getCell(`A${rowNum}`);
    titleCell.value = 'BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH';
    Object.assign(titleCell, STYLES.title);
    sheet.getRow(rowNum).height = 30;
    rowNum++;

    // Subtitle with period
    sheet.mergeCells(`A${rowNum}:E${rowNum}`);
    const subtitleCell = sheet.getCell(`A${rowNum}`);
    subtitleCell.value = `Từ ngày ${formatDate(data.period.from)} đến ngày ${formatDate(data.period.to)}`;
    Object.assign(subtitleCell, STYLES.subtitle);
    rowNum++;

    // Farm info
    sheet.mergeCells(`A${rowNum}:E${rowNum}`);
    sheet.getCell(`A${rowNum}`).value = `Đơn vị: ${data.farm_name}`;
    rowNum++;

    if (data.farm_tax_code) {
        sheet.mergeCells(`A${rowNum}:E${rowNum}`);
        sheet.getCell(`A${rowNum}`).value = `Mã số thuế: ${data.farm_tax_code}`;
        rowNum++;
    }

    rowNum++; // Empty row

    // Header row
    const headerRow = sheet.getRow(rowNum);
    headerRow.values = ['STT', 'CHỈ TIÊU', 'Mã số', 'Kỳ này', 'Kỳ trước'];
    headerRow.eachCell((cell) => {
        Object.assign(cell, STYLES.header);
    });
    headerRow.height = 25;
    rowNum++;

    const previousAmount = data.comparison?.previous_net_profit;

    // 1. Revenue
    rowNum = addIncomeRow(sheet, rowNum, 1, 'Doanh thu bán hàng và cung cấp dịch vụ', '01', data.revenue.sales);
    rowNum = addIncomeRow(sheet, rowNum, 2, 'Thu nhập khác', '02', data.revenue.other_income);
    rowNum = addTotalRow(sheet, rowNum, 'Tổng doanh thu', '10', data.revenue.total);

    // 2. COGS
    rowNum = addIncomeRow(sheet, rowNum, 3, 'Giá vốn hàng bán', '11', data.cost_of_goods_sold);

    // 3. Gross Profit
    rowNum = addTotalRow(sheet, rowNum, 'Lợi nhuận gộp về bán hàng và cung cấp dịch vụ', '20', data.gross_profit);

    // 4. Operating Expenses
    rowNum = addIncomeRow(sheet, rowNum, 4, 'Chi phí bán hàng', '24', data.operating_expenses.selling);
    rowNum = addIncomeRow(sheet, rowNum, 5, 'Chi phí quản lý doanh nghiệp', '25', data.operating_expenses.admin);
    rowNum = addIncomeRow(sheet, rowNum, 6, 'Chi phí khấu hao', '26', data.operating_expenses.depreciation);
    rowNum = addIncomeRow(sheet, rowNum, 7, 'Chi phí khác', '27', data.operating_expenses.other);

    // 5. Operating Income
    rowNum = addTotalRow(sheet, rowNum, 'Lợi nhuận thuần từ hoạt động kinh doanh', '30', data.operating_income);

    // 6. Financial
    rowNum = addIncomeRow(sheet, rowNum, 8, 'Thu nhập tài chính', '31', data.financial.income);
    rowNum = addIncomeRow(sheet, rowNum, 9, 'Chi phí tài chính', '32', data.financial.expense);

    // 7. Profit Before Tax
    rowNum = addTotalRow(sheet, rowNum, 'Lợi nhuận trước thuế', '50', data.profit_before_tax);

    // 8. Tax
    rowNum = addIncomeRow(sheet, rowNum, 10, 'Chi phí thuế TNDN hiện hành', '51', data.tax);

    // 9. Net Profit
    rowNum = addTotalRow(sheet, rowNum, 'LỢI NHUẬN SAU THUẾ', '60', data.net_profit);

    rowNum++; // Empty row

    // Ratios section
    rowNum = addSectionHeader(sheet, rowNum, '', 'CÁC TỶ SUẤT TÀI CHÍNH', '', 0);
    rowNum = addRatioRow(sheet, rowNum, 'Tỷ suất lợi nhuận gộp', data.ratios.gross_margin);
    rowNum = addRatioRow(sheet, rowNum, 'Tỷ suất lợi nhuận hoạt động', data.ratios.operating_margin);
    rowNum = addRatioRow(sheet, rowNum, 'Tỷ suất lợi nhuận ròng', data.ratios.net_margin);

    // Comparison section
    if (data.comparison) {
        rowNum++;
        rowNum = addSectionHeader(sheet, rowNum, '', 'SO SÁNH VỚI KỲ TRƯỚC', '', 0);

        const changeInfo = sheet.getRow(rowNum);
        sheet.mergeCells(`A${rowNum}:E${rowNum}`);
        const changeCell = sheet.getCell(`A${rowNum}`);
        const changePercent = data.comparison.change_percent;
        const arrow = changePercent >= 0 ? '▲' : '▼';
        const color = changePercent >= 0 ? 'FF2E7D32' : 'FFC62828';
        changeCell.value = `Thay đổi: ${arrow} ${formatMoney(data.comparison.change_amount)} (${changePercent.toFixed(2)}%)`;
        changeCell.font = { bold: true, color: { argb: color } };
        rowNum++;
    }

    // Generated timestamp
    rowNum++;
    sheet.getCell(`A${rowNum}`).value = `Ngày lập: ${formatDateTime(data.generated_at)}`;

    // Return buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function addSectionHeader(
    sheet: ExcelJS.Worksheet,
    rowNum: number,
    stt: string,
    label: string,
    code: string,
    amount: number
): number {
    const row = sheet.getRow(rowNum);
    row.values = [stt, label, code, amount, ''];
    row.eachCell((cell, colNumber) => {
        Object.assign(cell, STYLES.sectionHeader);
        if (colNumber === 4) {
            cell.numFmt = STYLES.money;
        }
    });
    return rowNum + 1;
}

function addDataRow(
    sheet: ExcelJS.Worksheet,
    rowNum: number,
    stt: number,
    label: string,
    code: string,
    amount: number,
    previousAmount?: number
): number {
    const row = sheet.getRow(rowNum);
    row.values = [stt, `    ${label}`, code, amount, previousAmount ?? ''];
    row.eachCell((cell, colNumber) => {
        Object.assign(cell, STYLES.cell);
        if (colNumber >= 4) {
            cell.numFmt = STYLES.money;
        }
    });
    return rowNum + 1;
}

function addIncomeRow(
    sheet: ExcelJS.Worksheet,
    rowNum: number,
    stt: number,
    label: string,
    code: string,
    amount: number,
    previousAmount?: number
): number {
    const row = sheet.getRow(rowNum);
    row.values = [stt, label, code, amount, previousAmount ?? ''];
    row.eachCell((cell, colNumber) => {
        Object.assign(cell, STYLES.cell);
        if (colNumber >= 4) {
            cell.numFmt = STYLES.money;
        }
    });
    return rowNum + 1;
}

function addTotalRow(
    sheet: ExcelJS.Worksheet,
    rowNum: number,
    label: string,
    code: string,
    amount: number,
    previousAmount?: number
): number {
    const row = sheet.getRow(rowNum);
    row.values = ['', label, code, amount, previousAmount ?? ''];
    row.eachCell((cell, colNumber) => {
        Object.assign(cell, STYLES.totalRow);
        if (colNumber >= 4) {
            cell.numFmt = STYLES.money;
        }
    });
    return rowNum + 1;
}

function addRatioRow(
    sheet: ExcelJS.Worksheet,
    rowNum: number,
    label: string,
    value: number
): number {
    const row = sheet.getRow(rowNum);
    row.values = ['', `    ${label}`, '', `${value.toFixed(2)}%`, ''];
    row.eachCell((cell) => {
        Object.assign(cell, STYLES.cell);
    });
    return rowNum + 1;
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function formatDateTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatMoney(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(amount);
}
