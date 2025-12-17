# 📋 PHASE 2 - TASK 3: STOCK REPORTS & ALERTS

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P2-T3 |
| **Tên** | Stock Reports & Alerts |
| **Thời gian** | 6-8 giờ |
| **Phụ thuộc** | Task 2 (Inventory Management) |
| **Task tiếp theo** | Task 4 (AR) |

---

## 📋 MỤC TIÊU

- Thẻ kho (Stock Card) theo sản phẩm
- Báo cáo tồn kho tổng hợp
- Cảnh báo tồn kho thấp/cao
- Lịch sử biến động

---

## 📥 INPUTS

| Input | Từ | Chi tiết |
|-------|-----|----------|
| stocks | Task 2 | Số lượng tồn, giá vốn |
| stock_movements | Task 2 | Lịch sử nhập/xuất |
| min/max_quantity | Task 2 | Ngưỡng cảnh báo |

---

## PHẦN 1: API ENDPOINTS

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /api/reports/stock-card/:productId | Thẻ kho sản phẩm |
| GET | /api/reports/stock-summary | Tổng hợp tồn kho |
| GET | /api/alerts/low-stock | Danh sách tồn thấp |
| GET | /api/alerts/over-stock | Danh sách tồn cao |

---

## PHẦN 2: STOCK CARD (THẺ KHO)

```typescript
// GET /api/reports/stock-card/:productId

interface StockCardEntry {
  date: string;
  code: string;
  type: 'IN' | 'OUT' | 'ADJUST';
  description: string;
  
  // Nhập
  in_qty: number;
  in_price: number;
  in_value: number;
  
  // Xuất
  out_qty: number;
  out_price: number;  // avg_cost at time
  out_value: number;
  
  // Tồn
  balance_qty: number;
  balance_value: number;
}

interface StockCardResponse {
  product: { code, name, unit };
  period: { from, to };
  opening: { qty, avg_cost, value };
  entries: StockCardEntry[];
  closing: { qty, avg_cost, value };
}
```

---

## PHẦN 3: ALERTS

```typescript
// src/services/stock-alert.service.ts

interface StockAlert {
  product_id: string;
  product_code: string;
  product_name: string;
  current_qty: number;
  threshold_qty: number;
  alert_type: 'LOW' | 'OUT' | 'OVER';
}

export async function getLowStockAlerts(farmId: string): Promise<StockAlert[]> {
  const stocks = await prisma.stock.findMany({
    where: {
      farm_id: farmId,
      min_quantity: { not: null },
      quantity: { lte: prisma.stock.fields.min_quantity },
    },
    include: { product: true },
  });
  
  return stocks.map(s => ({
    product_id: s.product_id,
    product_code: s.product.code,
    product_name: s.product.name,
    current_qty: s.quantity,
    threshold_qty: s.min_quantity,
    alert_type: s.quantity <= 0 ? 'OUT' : 'LOW',
  }));
}
```

---

## ✅ CHECKLIST HOÀN THÀNH

### Reports
- [ ] Stock Card API
- [ ] Stock Summary API
- [ ] Movement history

### Alerts
- [ ] Low stock detection
- [ ] Out of stock detection  
- [ ] Over stock detection

### UI
- [ ] Stock Card page
- [ ] Alert badges on dashboard

---

## 🔗 KẾT NỐI

### Output → Task 6 (Accounting Reports)
- Stock data cho balance sheet

### Output → Task 8 (Dashboard)
- Alert counts cho dashboard

---

**Estimated Time:** 6-8 giờ  
**Next Task:** Task 4 - AR (Accounts Receivable)
