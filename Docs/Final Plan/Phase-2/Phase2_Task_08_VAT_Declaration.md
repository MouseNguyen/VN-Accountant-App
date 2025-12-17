# 📋 PHASE 2 - TASK 8: VAT DECLARATION

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P2-T8 |
| **Tên** | VAT Declaration - Tờ Khai GTGT |
| **Thời gian** | 8-10 giờ |
| **Phụ thuộc** | Task 2 (Inventory - VAT transactions) |
| **Task tiếp theo** | Task 9 (Tax Package Export) |

---

## 📋 MỤC TIÊU

- Tổng hợp VAT đầu ra/đầu vào theo kỳ
- Tạo tờ khai 01/GTGT
- Validate MST nhà cung cấp
- Chuẩn bị data cho HTKK

---

## 📥 INPUTS

| Input | Từ | Chi tiết |
|-------|-----|----------|
| VATDeclaration model | Task 1 | Schema |
| Transactions với VAT | Phase 1-2 | VAT amounts |
| Partner.tax_code | Phase 1 | MST đối tác |

---

## PHẦN 1: API ENDPOINTS

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /api/vat/summary | Tổng hợp VAT |
| POST | /api/vat/declaration | Tạo tờ khai |
| GET | /api/vat/declaration/:id | Xem tờ khai |
| PUT | /api/vat/declaration/:id | Cập nhật |
| POST | /api/vat/declaration/:id/submit | Nộp tờ khai |

---

## PHẦN 2: VAT CALCULATION

```typescript
// src/services/vat.service.ts

interface VATSummary {
  period: { year: number; month: number };
  
  // Đầu ra (Bán hàng)
  output_transactions: number;
  output_amount: number;      // Tổng tiền hàng
  output_vat: number;         // VAT đầu ra
  
  // Đầu vào (Mua hàng)
  input_transactions: number;
  input_amount: number;
  input_vat: number;          // VAT đầu vào
  
  // Kết quả
  vat_payable: number;        // = output_vat - input_vat
}

export async function getVATSummary(
  farmId: string, 
  year: number, 
  month: number
): Promise<VATSummary> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  // Output VAT (Sales)
  const sales = await prisma.transaction.aggregate({
    where: {
      farm_id: farmId,
      type: 'SALE',
      trans_date: { gte: startDate, lte: endDate },
    },
    _count: true,
    _sum: { amount: true, vat_amount: true },
  });
  
  // Input VAT (Purchases)
  const purchases = await prisma.transaction.aggregate({
    where: {
      farm_id: farmId,
      type: 'PURCHASE',
      trans_date: { gte: startDate, lte: endDate },
    },
    _count: true,
    _sum: { amount: true, vat_amount: true },
  });
  
  const outputVat = Number(sales._sum.vat_amount) || 0;
  const inputVat = Number(purchases._sum.vat_amount) || 0;
  
  return {
    period: { year, month },
    output_transactions: sales._count || 0,
    output_amount: Number(sales._sum.amount) || 0,
    output_vat: outputVat,
    input_transactions: purchases._count || 0,
    input_amount: Number(purchases._sum.amount) || 0,
    input_vat: inputVat,
    vat_payable: outputVat - inputVat,
  };
}
```

---

## PHẦN 3: CREATE DECLARATION

```typescript
export async function createVATDeclaration(
  farmId: string,
  year: number,
  month: number
) {
  // Check if exists
  const existing = await prisma.vATDeclaration.findUnique({
    where: { farm_id_period_year_period_month: { farm_id: farmId, period_year: year, period_month: month } },
  });
  
  if (existing) {
    throw new Error('Tờ khai kỳ này đã tồn tại');
  }
  
  // Get summary
  const summary = await getVATSummary(farmId, year, month);
  
  // Create declaration
  return prisma.vATDeclaration.create({
    data: {
      farm_id: farmId,
      period_year: year,
      period_month: month,
      output_vat: summary.output_vat,
      input_vat: summary.input_vat,
      vat_payable: summary.vat_payable,
      status: 'DRAFT',
    },
  });
}
```

---

## ✅ CHECKLIST HOÀN THÀNH

### API
- [ ] GET /api/vat/summary
- [ ] POST /api/vat/declaration
- [ ] GET /api/vat/declaration/:id
- [ ] PUT (edit draft)
- [ ] POST submit

### Business Logic
- [ ] VAT output từ SALE
- [ ] VAT input từ PURCHASE
- [ ] Status flow: DRAFT → SUBMITTED

### UI
- [ ] VAT summary view
- [ ] Declaration form
- [ ] Submit confirmation

---

## 🔗 KẾT NỐI

### Output → Task 9 (Tax Package Export)
- Declaration data cho XML export

### Output → Phase 3 (Tax Engine)
- VAT data cho advanced tax calculation

---

**Estimated Time:** 8-10 giờ  
**Next Task:** Task 9 - Tax Package Export
