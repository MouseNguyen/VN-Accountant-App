# 📋 PHASE 2 - TASK 9: TAX PACKAGE EXPORT

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P2-T9 |
| **Tên** | Tax Package Export |
| **Thời gian** | 6-8 giờ |
| **Phụ thuộc** | Task 8 (VAT Declaration) |
| **Task tiếp theo** | Task 10 (Security) |

---

## 📋 MỤC TIÊU

- Export XML chuẩn HTKK
- Tờ khai 01/GTGT mẫu XML
- Bảng kê mua vào, bán ra
- Import được vào phần mềm Thuế

---

## 📥 INPUTS

| Input | Từ | Chi tiết |
|-------|-----|----------|
| VAT Declaration | Task 8 | Dữ liệu tờ khai |
| Transactions | Phase 1-2 | Chi tiết giao dịch |
| Partner.tax_code | Phase 1 | MST đối tác |

---

## PHẦN 1: XML SCHEMA

```xml
<!-- Mẫu 01/GTGT - Tờ khai thuế GTGT -->
<HSoThueDTu>
  <HSoKhaiThue>
    <TTinChung>
      <mso>01</mso>
      <ten>TỜ KHAI THUẾ GIÁ TRỊ GIA TĂNG</ten>
      <kyKKThue>
        <kyKKhai>Tháng</kyKKhai>
        <kyKKhaiTuNgay>01/12/2024</kyKKhaiTuNgay>
        <kyKKhaiDenNgay>31/12/2024</kyKKhaiDenNgay>
      </kyKKThue>
    </TTinChung>
    <TTinTKhai>
      <mst>0123456789</mst>
      <tenNNT>NÔNG TRẠI ABC</tenNNT>
      <dchNNT>123 Đường ABC, Quận XYZ</dchNNT>
    </TTinTKhai>
    <CTieuTKhai>
      <ct32>100000000</ct32>  <!-- Hàng hóa bán ra -->
      <ct33>10000000</ct33>   <!-- Thuế GTGT đầu ra -->
      <ct23>50000000</ct23>   <!-- Hàng hóa mua vào -->
      <ct24>5000000</ct24>    <!-- Thuế GTGT đầu vào -->
      <ct40>5000000</ct40>    <!-- Thuế GTGT phải nộp -->
    </CTieuTKhai>
  </HSoKhaiThue>
</HSoThueDTu>
```

---

## PHẦN 2: EXPORT SERVICE

```typescript
// src/services/tax-export.service.ts

import { create } from 'xmlbuilder2';

export async function exportVATDeclarationToXML(
  declaration: VATDeclaration,
  farm: Farm
): Promise<string> {
  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('HSoThueDTu')
      .ele('HSoKhaiThue')
        .ele('TTinChung')
          .ele('mso').txt('01').up()
          .ele('ten').txt('TỜ KHAI THUẾ GIÁ TRỊ GIA TĂNG').up()
          .ele('kyKKThue')
            .ele('kyKKhai').txt('Tháng').up()
            .ele('kyKKhaiTuNgay').txt(formatDate(startOfMonth)).up()
            .ele('kyKKhaiDenNgay').txt(formatDate(endOfMonth)).up()
          .up()
        .up()
        .ele('TTinTKhai')
          .ele('mst').txt(farm.tax_code).up()
          .ele('tenNNT').txt(farm.name).up()
          .ele('dchNNT').txt(farm.address).up()
        .up()
        .ele('CTieuTKhai')
          .ele('ct32').txt(declaration.output_amount.toString()).up()
          .ele('ct33').txt(declaration.output_vat.toString()).up()
          .ele('ct23').txt(declaration.input_amount.toString()).up()
          .ele('ct24').txt(declaration.input_vat.toString()).up()
          .ele('ct40').txt(declaration.vat_payable.toString()).up()
        .up()
      .up()
    .up();
  
  return doc.end({ prettyPrint: true });
}
```

---

## PHẦN 3: API ENDPOINT

```typescript
// GET /api/vat/declaration/:id/export

export async function GET(request: NextRequest, { params }) {
  const declaration = await getDeclaration(params.id);
  const farm = await getFarm(declaration.farm_id);
  
  const xml = await exportVATDeclarationToXML(declaration, farm);
  
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Content-Disposition': `attachment; filename="01GTGT_${declaration.period_year}_${declaration.period_month}.xml"`,
    },
  });
}
```

---

## ✅ CHECKLIST HOÀN THÀNH

### XML Export
- [ ] Tờ khai 01/GTGT
- [ ] Bảng kê hóa đơn đầu vào
- [ ] Bảng kê hóa đơn đầu ra

### Validation
- [ ] XML valid theo schema HTKK
- [ ] Import test vào HTKK thành công

---

## 🔗 KẾT NỐI

### Output → Phase 3 (Tax Engine)
- XML export logic mở rộng cho các loại tờ khai khác

---

**Estimated Time:** 6-8 giờ  
**Next Task:** Task 10 - Security & Audit
