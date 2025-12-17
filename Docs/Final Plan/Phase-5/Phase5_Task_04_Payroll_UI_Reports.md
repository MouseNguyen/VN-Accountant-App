# 📋 PHASE 5 - TASK 4: PAYROLL UI & REPORTS

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P5-T4 |
| **Tên** | Payroll UI & Reports |
| **Thời gian** | 8-10 giờ |
| **Phụ thuộc** | Task 3 (Calculate) |
| **Task tiếp theo** | Task 5 (CCDC) |

---

## 📋 MỤC TIÊU

- UI tính lương, duyệt, thanh toán
- Payslip PDF export
- Bank transfer file (Vietcombank format)
- Báo cáo lương tổng hợp

---

## PHẦN 1: PAGES

| Page | Route | Description |
|------|-------|-------------|
| Payroll List | /payroll | Danh sách các kỳ lương |
| Payroll Detail | /payroll/[period] | Chi tiết 1 kỳ |
| Run Payroll | /payroll/new | Tính lương mới |
| Payslip | /payroll/[period]/[empId]/payslip | Phiếu lương |

---

## PHẦN 2: PAYSLIP PDF

```typescript
// src/services/payslip.service.ts

import PDFDocument from 'pdfkit';

export async function generatePayslip(payrollLine: PayrollLine): Promise<Buffer> {
  const doc = new PDFDocument();
  
  // Header
  doc.fontSize(16).text('PHIẾU LƯƠNG', { align: 'center' });
  doc.fontSize(10).text(`Kỳ: ${payrollLine.payroll.period}`);
  
  // Employee info
  doc.text(`Nhân viên: ${payrollLine.employee.name}`);
  doc.text(`Mã NV: ${payrollLine.employee.code}`);
  
  // Earnings
  doc.moveDown().fontSize(12).text('THU NHẬP');
  doc.fontSize(10);
  doc.text(`Lương cơ bản: ${formatCurrency(payrollLine.base_salary)}`);
  doc.text(`Phụ cấp: ${formatCurrency(payrollLine.allowances)}`);
  doc.text(`Tổng: ${formatCurrency(payrollLine.gross_salary)}`);
  
  // Deductions
  doc.moveDown().fontSize(12).text('KHẤU TRỪ');
  doc.fontSize(10);
  doc.text(`BHXH (8%): ${formatCurrency(payrollLine.bhxh_employee)}`);
  doc.text(`BHYT (1.5%): ${formatCurrency(payrollLine.bhyt_employee)}`);
  doc.text(`BHTN (1%): ${formatCurrency(payrollLine.bhtn_employee)}`);
  doc.text(`Thuế TNCN: ${formatCurrency(payrollLine.pit_amount)}`);
  
  // Net
  doc.moveDown().fontSize(14).text(`THỰC LÃNH: ${formatCurrency(payrollLine.net_salary)}`);
  
  return doc;
}
```

---

## PHẦN 3: BANK TRANSFER FILE

```typescript
// VCB format for batch payment
export function generateBankFile(payroll: Payroll): string {
  let content = '';
  
  for (const line of payroll.lines) {
    if (line.employee.bank_account) {
      content += [
        line.employee.bank_account,
        line.employee.name,
        line.net_salary.toString(),
        `Luong thang ${payroll.period}`,
      ].join(',') + '\n';
    }
  }
  
  return content;
}
```

---

## ✅ CHECKLIST

- [ ] Payroll list page
- [ ] Payroll detail page
- [ ] Approve workflow
- [ ] Payslip PDF
- [ ] Bank transfer file
- [ ] Summary report

---

**Estimated Time:** 8-10 giờ  
**Next Task:** Task 5 - CCDC CRUD
