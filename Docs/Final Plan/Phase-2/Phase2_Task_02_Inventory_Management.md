# 📋 PHASE 2 - TASK 2: INVENTORY MANAGEMENT

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P2-T2 |
| **Tên** | Inventory Management - Quản lý Kho |
| **Thời gian** | 10-12 giờ |
| **Phụ thuộc** | Task 1 (Database Schema) |
| **Task tiếp theo** | Task 3 (Stock Reports & Alerts) |

---

## 📋 MỤC TIÊU

- Nhập kho với Moving Average costing
- Xuất kho tự động tính COGS
- Điều chỉnh tồn kho
- Kiểm kê kho
- Auto stock update khi Sale/Purchase

---

## 📥 INPUTS

| Input | Từ | Chi tiết |
|-------|-----|----------|
| Stock, StockMovement models | Task 1 | Schema đã tạo |
| Products | Phase 1 | Sản phẩm cần quản lý tồn |
| Transactions | Phase 1 | Sale/Purchase tự động update |

---

## PHẦN 1: API ENDPOINTS

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /api/stocks | Danh sách tồn kho |
| GET | /api/stocks/:productId | Chi tiết tồn kho SP |
| GET | /api/stock-movements | Lịch sử nhập/xuất |
| POST | /api/stock-movements/in | Nhập kho |
| POST | /api/stock-movements/out | Xuất kho |
| POST | /api/stock-movements/adjust | Điều chỉnh |

---

## PHẦN 2: MOVING AVERAGE LOGIC

### 2.1 Công thức tính giá vốn bình quân

```typescript
// src/services/inventory.service.ts

/**
 * Moving Average Costing
 * 
 * new_avg = (old_qty * old_avg + new_qty * new_price) / (old_qty + new_qty)
 */
export async function stockIn(input: StockInInput) {
  const stock = await getStock(input.farm_id, input.product_id);
  
  const oldQty = stock?.quantity || 0;
  const oldAvg = stock?.avg_cost || 0;
  const newQty = input.quantity;
  const newPrice = input.unit_price;
  
  // Calculate new average
  const totalOld = oldQty * oldAvg;
  const totalNew = newQty * newPrice;
  const newTotal = oldQty + newQty;
  
  const newAvgCost = newTotal > 0 
    ? (totalOld + totalNew) / newTotal 
    : 0;
  
  // Update stock
  await updateStock({
    quantity: newTotal,
    avg_cost: newAvgCost,
    total_value: newTotal * newAvgCost,
  });
  
  // Create movement record
  await createMovement({
    type: 'IN',
    quantity: newQty,
    unit_price: newPrice,
    avg_cost_before: oldAvg,
    avg_cost_after: newAvgCost,
    qty_before: oldQty,
    qty_after: newTotal,
  });
}

/**
 * Stock Out - sử dụng giá vốn bình quân hiện tại
 */
export async function stockOut(input: StockOutInput) {
  const stock = await getStock(input.farm_id, input.product_id);
  
  if (!stock || stock.quantity < input.quantity) {
    throw new Error('Không đủ tồn kho');
  }
  
  const cogsAmount = input.quantity * stock.avg_cost;
  const newQty = stock.quantity - input.quantity;
  
  // Update stock
  await updateStock({
    quantity: newQty,
    total_value: newQty * stock.avg_cost,
    // avg_cost không đổi khi xuất
  });
  
  // Create movement
  await createMovement({
    type: 'OUT',
    quantity: input.quantity,
    unit_price: stock.avg_cost,
    cogs_amount: cogsAmount,
    qty_before: stock.quantity,
    qty_after: newQty,
  });
  
  return { cogs_amount: cogsAmount };
}
```

---

## PHẦN 3: AUTO STOCK UPDATE

### 3.1 Hook sau khi tạo Sale/Purchase

```typescript
// src/hooks/transaction.hooks.ts

export async function afterSaleCreated(transaction: Transaction) {
  for (const item of transaction.items) {
    await stockOut({
      farm_id: transaction.farm_id,
      product_id: item.product_id,
      quantity: item.quantity,
      transaction_id: transaction.id,
      reason: `Bán hàng - ${transaction.code}`,
    });
  }
}

export async function afterPurchaseCreated(transaction: Transaction) {
  for (const item of transaction.items) {
    await stockIn({
      farm_id: transaction.farm_id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      transaction_id: transaction.id,
      partner_id: transaction.partner_id,
      reason: `Mua hàng - ${transaction.code}`,
    });
  }
}
```

---

## ✅ CHECKLIST HOÀN THÀNH

### API
- [ ] GET /api/stocks với pagination
- [ ] POST /api/stock-movements/in
- [ ] POST /api/stock-movements/out
- [ ] POST /api/stock-movements/adjust

### Business Logic
- [ ] Moving Average calculation đúng
- [ ] COGS tính khi xuất kho
- [ ] Auto stock update khi Sale
- [ ] Auto stock update khi Purchase

### Testing
- [ ] Nhập 100kg @ 10,000đ → avg = 10,000đ
- [ ] Nhập 50kg @ 12,000đ → avg = 10,667đ
- [ ] Xuất 80kg → COGS = 853,360đ

---

## 🔗 KẾT NỐI

### Output → Task 3 (Stock Reports)
- Stock data cho báo cáo
- Movement history cho thẻ kho

### Output → Task 6 (Accounting Reports)
- COGS cho báo cáo giá vốn

---

**Estimated Time:** 10-12 giờ  
**Next Task:** Task 3 - Stock Reports & Alerts
