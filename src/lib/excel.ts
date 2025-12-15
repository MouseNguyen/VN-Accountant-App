// src/lib/excel.ts
// Excel export utilities using exceljs

import ExcelJS from 'exceljs';

// ==========================================
// TYPES
// ==========================================

export interface ExcelColumn {
    header: string;
    key: string;
    width?: number;
    style?: Partial<ExcelJS.Style>;
}

export interface ExcelSheetData {
    name: string;
    columns: ExcelColumn[];
    rows: Record<string, unknown>[];
    title?: string;
}

// ==========================================
// STYLES
// ==========================================

const HEADER_STYLE: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
    },
};

const TITLE_STYLE: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 16, color: { argb: 'FF1B5E20' } },
    alignment: { vertical: 'middle', horizontal: 'center' },
};

const MONEY_FORMAT = '#,##0 "đ"';

// ==========================================
// MAIN EXPORT FUNCTION
// ==========================================

export async function createExcelWorkbook(sheets: ExcelSheetData[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LABA ERP';
    workbook.created = new Date();

    for (const sheetData of sheets) {
        const sheet = workbook.addWorksheet(sheetData.name);

        // Add title row if provided
        if (sheetData.title) {
            const titleRow = sheet.addRow([sheetData.title]);
            titleRow.height = 30;
            titleRow.getCell(1).style = TITLE_STYLE;
            sheet.mergeCells(1, 1, 1, sheetData.columns.length);
            sheet.addRow([]); // Empty row after title
        }

        // Setup columns
        sheet.columns = sheetData.columns.map((col) => ({
            header: col.header,
            key: col.key,
            width: col.width || 15,
            style: col.style,
        }));

        // Style header row
        const headerRowIndex = sheetData.title ? 3 : 1;
        const headerRow = sheet.getRow(headerRowIndex);
        headerRow.eachCell((cell) => {
            Object.assign(cell.style, HEADER_STYLE);
        });
        headerRow.height = 25;

        // Add data rows
        for (const row of sheetData.rows) {
            sheet.addRow(row);
        }

        // Apply borders to all data cells
        const lastRow = sheet.rowCount;
        for (let rowNum = headerRowIndex; rowNum <= lastRow; rowNum++) {
            const row = sheet.getRow(rowNum);
            row.eachCell((cell) => {
                if (!cell.style.border) {
                    cell.style.border = {
                        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                    };
                }
            });
        }

        // Auto-filter
        if (sheetData.rows.length > 0) {
            sheet.autoFilter = {
                from: { row: headerRowIndex, column: 1 },
                to: { row: lastRow, column: sheetData.columns.length },
            };
        }
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

// ==========================================
// REPORT SPECIFIC EXPORTS
// ==========================================

export async function exportIncomeExpenseReport(data: {
    transactions: Array<{
        date: string;
        type: string;
        description: string;
        amount: number;
    }>;
    summary: { total_income: number; total_expense: number; net: number };
    period: { from: string; to: string };
}): Promise<Buffer> {
    const columns: ExcelColumn[] = [
        { header: 'Ngày', key: 'date', width: 15 },
        { header: 'Loại', key: 'type', width: 12 },
        { header: 'Mô tả', key: 'description', width: 40 },
        { header: 'Số tiền', key: 'amount', width: 18, style: { numFmt: MONEY_FORMAT } },
    ];

    const rows = data.transactions.map((t) => ({
        date: t.date,
        type: t.type === 'INCOME' ? 'Thu' : 'Chi',
        description: t.description,
        amount: t.amount,
    }));

    // Add summary rows
    rows.push(
        { date: '', type: '', description: '', amount: 0 },
        { date: '', type: '', description: 'TỔNG THU', amount: data.summary.total_income },
        { date: '', type: '', description: 'TỔNG CHI', amount: data.summary.total_expense },
        { date: '', type: '', description: 'LỢI NHUẬN', amount: data.summary.net }
    );

    return createExcelWorkbook([
        {
            name: 'Thu Chi',
            title: `BÁO CÁO THU CHI (${data.period.from} - ${data.period.to})`,
            columns,
            rows,
        },
    ]);
}

export async function exportInventoryReport(data: {
    products: Array<{
        code: string;
        name: string;
        category: string;
        unit: string;
        quantity: number;
        avg_cost: number;
        value: number;
    }>;
    summary: { total_products: number; total_value: number };
}): Promise<Buffer> {
    const columns: ExcelColumn[] = [
        { header: 'Mã SP', key: 'code', width: 12 },
        { header: 'Tên sản phẩm', key: 'name', width: 30 },
        { header: 'Danh mục', key: 'category', width: 15 },
        { header: 'ĐVT', key: 'unit', width: 10 },
        { header: 'Tồn kho', key: 'quantity', width: 12, style: { numFmt: '#,##0.00' } },
        { header: 'Giá vốn TB', key: 'avg_cost', width: 15, style: { numFmt: MONEY_FORMAT } },
        { header: 'Giá trị', key: 'value', width: 18, style: { numFmt: MONEY_FORMAT } },
    ];

    const rows = [...data.products];
    rows.push(
        { code: '', name: '', category: '', unit: '', quantity: 0, avg_cost: 0, value: 0 },
        {
            code: '',
            name: `TỔNG (${data.summary.total_products} sản phẩm)`,
            category: '',
            unit: '',
            quantity: 0,
            avg_cost: 0,
            value: data.summary.total_value,
        }
    );

    return createExcelWorkbook([
        {
            name: 'Tồn Kho',
            title: `BÁO CÁO TỒN KHO (${new Date().toLocaleDateString('vi-VN')})`,
            columns,
            rows,
        },
    ]);
}

export async function exportPayableReport(data: {
    partners: Array<{
        code: string;
        name: string;
        type: string;
        balance: number;
        credit_limit: number;
    }>;
    summary: { total_receivable: number; total_payable: number };
}): Promise<Buffer> {
    const receivables = data.partners.filter((p) => p.type === 'CUSTOMER' && p.balance > 0);
    const payables = data.partners.filter((p) => p.type === 'VENDOR' && p.balance < 0);

    const arColumns: ExcelColumn[] = [
        { header: 'Mã KH', key: 'code', width: 12 },
        { header: 'Tên khách hàng', key: 'name', width: 30 },
        { header: 'Công nợ', key: 'balance', width: 18, style: { numFmt: MONEY_FORMAT } },
        { header: 'Hạn mức', key: 'credit_limit', width: 18, style: { numFmt: MONEY_FORMAT } },
    ];

    const apColumns: ExcelColumn[] = [
        { header: 'Mã NCC', key: 'code', width: 12 },
        { header: 'Tên nhà cung cấp', key: 'name', width: 30 },
        { header: 'Công nợ', key: 'balance', width: 18, style: { numFmt: MONEY_FORMAT } },
    ];

    return createExcelWorkbook([
        {
            name: 'Phải Thu',
            title: `CÔNG NỢ PHẢI THU (${new Date().toLocaleDateString('vi-VN')})`,
            columns: arColumns,
            rows: [
                ...receivables.map((p) => ({
                    code: p.code,
                    name: p.name,
                    balance: p.balance,
                    credit_limit: p.credit_limit,
                })),
                { code: '', name: 'TỔNG PHẢI THU', balance: data.summary.total_receivable, credit_limit: 0 },
            ],
        },
        {
            name: 'Phải Trả',
            title: `CÔNG NỢ PHẢI TRẢ (${new Date().toLocaleDateString('vi-VN')})`,
            columns: apColumns,
            rows: [
                ...payables.map((p) => ({
                    code: p.code,
                    name: p.name,
                    balance: Math.abs(p.balance),
                })),
                { code: '', name: 'TỔNG PHẢI TRẢ', balance: Math.abs(data.summary.total_payable) },
            ],
        },
    ]);
}

export async function exportProfitLossReport(data: {
    revenue: number;
    cost_of_goods: number;
    gross_profit: number;
    operating_expenses: number;
    net_profit: number;
    period: { from: string; to: string };
}): Promise<Buffer> {
    const columns: ExcelColumn[] = [
        { header: 'Chỉ tiêu', key: 'label', width: 35 },
        { header: 'Số tiền', key: 'amount', width: 20, style: { numFmt: MONEY_FORMAT } },
    ];

    const rows = [
        { label: 'Doanh thu', amount: data.revenue },
        { label: 'Giá vốn hàng bán', amount: -data.cost_of_goods },
        { label: 'LỢI NHUẬN GỘP', amount: data.gross_profit },
        { label: '', amount: 0 },
        { label: 'Chi phí hoạt động', amount: -data.operating_expenses },
        { label: '', amount: 0 },
        { label: 'LỢI NHUẬN RÒNG', amount: data.net_profit },
    ];

    return createExcelWorkbook([
        {
            name: 'Lãi Lỗ',
            title: `BÁO CÁO LÃI LỖ (${data.period.from} - ${data.period.to})`,
            columns,
            rows,
        },
    ]);
}
