# 📋 PHASE 2 - TASK 7: EXPORT EXCEL

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P2-T7 |
| **Tên** | Export Excel |
| **Thời gian** | 6-8 giờ |
| **Phụ thuộc** | Task 6 (Accounting Reports) |
| **Task tiếp theo** | Task 8 (VAT Declaration) |

---

## 📋 MỤC TIÊU

- Export báo cáo sang Excel (.xlsx)
- Format chuẩn Việt Nam (số, ngày)
- Template với merged cells, borders
- Download file từ API

---

## 📥 INPUTS

| Input | Từ | Chi tiết |
|-------|-----|----------|
| Report data | Task 6 | Dữ liệu các báo cáo |

---

## PHẦN 1: LIBRARY SETUP

```bash
npm install exceljs
```

---

## PHẦN 2: EXPORT SERVICE

```typescript
// src/services/excel-export.service.ts

import ExcelJS from 'exceljs';

export async function exportCashBookToExcel(data: CashBookResponse): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sổ Quỹ');
  
  // Header
  sheet.mergeCells('A1:H1');
  sheet.getCell('A1').value = 'SỔ QUỸ TIỀN MẶT';
  sheet.getCell('A1').font = { bold: true, size: 14 };
  sheet.getCell('A1').alignment = { horizontal: 'center' };
  
  sheet.mergeCells('A2:H2');
  sheet.getCell('A2').value = `Từ ngày ${formatDate(data.period.from)} đến ${formatDate(data.period.to)}`;
  sheet.getCell('A2').alignment = { horizontal: 'center' };
  
  // Table headers
  const headerRow = sheet.addRow([
    'Ngày', 'Số CT', 'Diễn giải', 'Thu', 'Chi', 'Tồn', 'Đối tác', 'Số HĐ'
  ]);
  headerRow.font = { bold: true };
  headerRow.eachCell(cell => {
    cell.border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCCCCC' } };
  });
  
  // Opening balance row
  sheet.addRow(['', '', 'Số dư đầu kỳ', '', '', data.opening_balance, '', '']);
  
  // Data rows
  for (const entry of data.entries) {
    sheet.addRow([
      formatDate(entry.date),
      entry.code,
      entry.description,
      entry.receipt > 0 ? entry.receipt : '',
      entry.payment > 0 ? entry.payment : '',
      entry.balance,
      entry.partner_name || '',
      entry.ref_number || '',
    ]);
  }
  
  // Totals row
  const totalRow = sheet.addRow([
    '', '', 'TỔNG CỘNG',
    data.total_receipt,
    data.total_payment,
    data.closing_balance,
    '', ''
  ]);
  totalRow.font = { bold: true };
  
  // Format number columns
  sheet.getColumn(4).numFmt = '#,##0';
  sheet.getColumn(5).numFmt = '#,##0';
  sheet.getColumn(6).numFmt = '#,##0';
  
  // Column widths
  sheet.getColumn(1).width = 12;
  sheet.getColumn(2).width = 15;
  sheet.getColumn(3).width = 35;
  sheet.getColumn(4).width = 15;
  sheet.getColumn(5).width = 15;
  sheet.getColumn(6).width = 18;
  
  return workbook.xlsx.writeBuffer() as Promise<Buffer>;
}
```

---

## PHẦN 3: API ENDPOINT

```typescript
// src/app/api/reports/[type]/export/route.ts

export async function GET(request: NextRequest, { params }: { params: { type: string } }) {
  const { type } = params;
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  
  let buffer: Buffer;
  let filename: string;
  
  switch (type) {
    case 'cash-book':
      const cashData = await getCashBook(farmId, new Date(from), new Date(to));
      buffer = await exportCashBookToExcel(cashData);
      filename = `so-quy-${from}-${to}.xlsx`;
      break;
    // ... other reports
  }
  
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
```

---

## ✅ CHECKLIST HOÀN THÀNH

### Export Functions
- [ ] Sổ quỹ tiền mặt
- [ ] Sổ ngân hàng
- [ ] Sổ chi tiết 131/331
- [ ] Bảng cân đối TK
- [ ] Nhật ký chung

### Features
- [ ] Number format VN (#,##0)
- [ ] Date format (dd/mm/yyyy)
- [ ] Merged cells cho headers
- [ ] Borders và colors

---

## 🔗 KẾT NỐI

### Output → Task 9 (Tax Package Export)
- Excel export logic reuse

---

**Estimated Time:** 6-8 giờ  
**Next Task:** Task 8 - VAT Declaration
