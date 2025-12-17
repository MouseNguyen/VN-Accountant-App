# 📋 PHASE 3 - TASK 5-6: CIT XML EXPORT & UI

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P3-T5, P3-T6 |
| **Tên** | CIT XML Export & UI |
| **Thời gian** | 6-8 giờ |
| **Phụ thuộc** | Task 4 (CIT Calculation) |
| **Task tiếp theo** | Task 7 (PIT Calculation) |

---

## 📋 MỤC TIÊU

- Export tờ khai 03/TNDN sang XML
- Phụ lục 03-1A (Điều chỉnh)
- UI cho CIT management

---

## PHẦN 1: CIT XML EXPORT

```typescript
// src/services/cit-export.service.ts

export async function exportCITToXML(calculation: CITCalculation) {
  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('HSoThueDTu')
      .ele('HSoKhaiThue')
        .ele('TTinChung')
          .ele('mso').txt('03').up()
          .ele('ten').txt('TỜ KHAI THUẾ THU NHẬP DOANH NGHIỆP').up()
        .up()
        .ele('CTieuTKhai')
          .ele('ct21').txt(calculation.total_revenue.toString()).up()
          .ele('ct22').txt(calculation.total_expenses.toString()).up()
          .ele('ct23').txt(calculation.accounting_profit.toString()).up()
          .ele('ctB1').txt(calculation.add_backs.toString()).up()
          .ele('ctB2').txt(calculation.deductions.toString()).up()
          .ele('ct30').txt(calculation.taxable_income.toString()).up()
          .ele('ct31').txt(calculation.cit_amount.toString()).up()
        .up()
      .up()
    .up();
  
  return doc.end({ prettyPrint: true });
}
```

---

## PHẦN 2: CIT UI PAGES

### Pages
- `/tax/cit` - List CIT calculations
- `/tax/cit/[period]` - Detail view
- `/tax/cit/new` - Calculate new period

### Components
- CITSummaryCard
- AdjustmentsTable
- CITExportButton

---

## ✅ CHECKLIST

- [ ] CIT XML export (03/TNDN)
- [ ] Phụ lục 03-1A
- [ ] CIT list page
- [ ] CIT detail page
- [ ] Export buttons

---

**Estimated Time:** 6-8 giờ  
**Next Task:** Task 7 - PIT Calculation
