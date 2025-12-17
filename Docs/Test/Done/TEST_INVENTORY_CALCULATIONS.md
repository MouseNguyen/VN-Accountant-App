# 🧪 AI PROMPT: Test Inventory Calculations
## LABA ERP - Moving Average Cost & COGS Testing

---

## PROMPT START

```
Bạn là QA Engineer đang test module Inventory của LABA ERP.
Hãy kiểm tra toàn bộ flow tính toán Tồn kho, Giá vốn trung bình, và COGS.

## 📁 FILES CẦN KIỂM TRA

1. Service: `src/services/inventory.service.ts`
2. Decimal utils: `src/lib/decimal.ts`
3. API Routes:
   - `src/app/api/stock/route.ts`
   - `src/app/api/stock/in/route.ts`
   - `src/app/api/stock/out/route.ts`
   - `src/app/api/stock-movements/route.ts`
4. Pages:
   - `src/app/(dashboard)/kho/page.tsx`
   - `src/app/(dashboard)/kho/nhap/page.tsx`
   - `src/app/(dashboard)/kho/xuat/page.tsx`
5. Prisma Schema: Check Stock, StockMovement, Product models

## 📊 CALCULATION FORMULAS TO VERIFY

### 1. Moving Average Cost (Giá vốn bình quân gia quyền)

Khi NHẬP KHO (Stock IN):
```
new_avg_cost = (old_qty × old_avg_cost + in_qty × in_price) / (old_qty + in_qty)

Ví dụ:
- Tồn kho hiện tại: 100 units @ 10,000 VND = 1,000,000 VND
- Nhập thêm: 50 units @ 12,000 VND = 600,000 VND
- Tổng: 150 units, tổng giá trị = 1,600,000 VND
- new_avg_cost = 1,600,000 / 150 = 10,667 VND
```

### 2. Stock Quantity Update

```
NHẬP KHO (IN):
  new_qty = old_qty + in_qty
  new_total_value = new_qty × new_avg_cost

XUẤT KHO (OUT):
  new_qty = old_qty - out_qty
  new_total_value = new_qty × avg_cost  (avg_cost không đổi khi xuất)
```

### 3. COGS (Cost of Goods Sold - Giá vốn hàng bán)

```
Khi XUẤT KHO hoặc BÁN HÀNG:
  COGS = out_qty × avg_cost_at_time_of_sale

Ví dụ:
- avg_cost = 10,667 VND
- Xuất bán: 30 units
- COGS = 30 × 10,667 = 320,010 VND
```

### 4. Total Value Calculation

```
total_value = quantity × avg_cost
```

### 5. Stock Count Adjustment

```
Khi kiểm kê phát hiện chênh lệch:
  variance = actual_count - system_qty
  
  if (variance > 0):
    // Thừa hàng - nhập điều chỉnh
    adjustment_type = 'IN'
    
  if (variance < 0):
    // Thiếu hàng - xuất điều chỉnh
    adjustment_type = 'OUT'
    COGS = |variance| × avg_cost
```

## ✅ CHECKLIST KIỂM TRA

### A. STOCK IN (NHẬP KHO)

#### A1. Moving Average Calculation
- [ ] Tìm function tính moving average cost
- [ ] Verify formula: (old_qty × old_avg + new_qty × new_price) / total_qty
- [ ] Check division by zero handling (khi old_qty = 0)
- [ ] Check rounding (VND không có decimal)

#### A2. Quantity Update
- [ ] new_qty = old_qty + in_qty
- [ ] Không cho phép in_qty <= 0

#### A3. Total Value Update
- [ ] total_value = new_qty × new_avg_cost
- [ ] Tính sau khi update avg_cost

#### A4. Stock Movement Record
- [ ] Tạo StockMovement với type = 'IN'
- [ ] Lưu avg_cost_before và avg_cost_after
- [ ] Lưu qty_before và qty_after

#### A5. Product.stock_qty Sync
- [ ] Product.stock_qty được update
- [ ] Product.stock_qty = Stock.quantity

### B. STOCK OUT (XUẤT KHO)

#### B1. COGS Calculation
- [ ] COGS = out_qty × current_avg_cost
- [ ] avg_cost KHÔNG thay đổi khi xuất

#### B2. Quantity Update
- [ ] new_qty = old_qty - out_qty
- [ ] Check đủ tồn kho (nếu không cho âm)
- [ ] Không cho phép out_qty <= 0
- [ ] Không cho phép out_qty > current_qty (tùy config)

#### B3. Total Value Update
- [ ] total_value = new_qty × avg_cost

#### B4. Stock Movement Record
- [ ] Tạo StockMovement với type = 'OUT'
- [ ] Lưu cogs_amount = out_qty × avg_cost
- [ ] Lưu qty_before và qty_after

#### B5. Product.stock_qty Sync
- [ ] Product.stock_qty được update

### C. TRANSACTION → STOCK SYNC

#### C1. SALE Transaction
- [ ] Tạo SALE → Xuất kho tự động?
- [ ] COGS được tính đúng?
- [ ] Stock giảm đúng số lượng?
- [ ] StockMovement được tạo?

#### C2. PURCHASE Transaction
- [ ] Tạo PURCHASE → Nhập kho tự động?
- [ ] Moving average được cập nhật?
- [ ] Stock tăng đúng số lượng?
- [ ] StockMovement được tạo?

### D. STOCK COUNT (KIỂM KÊ)

#### D1. Variance Calculation
- [ ] variance = actual - system
- [ ] Positive variance → IN adjustment
- [ ] Negative variance → OUT adjustment

#### D2. Adjustment Processing
- [ ] Create StockMovement for adjustment
- [ ] Update Stock quantity
- [ ] COGS for negative variance

### E. DATA CONSISTENCY

#### E1. Stock vs Product
- [ ] Stock.quantity = Product.stock_qty (cho mỗi product)

#### E2. Stock vs Movements
- [ ] Stock.quantity = Initial + SUM(IN) - SUM(OUT)

#### E3. Multi-location (nếu có)
- [ ] SUM(Stock by location) = Product.stock_qty

## 🔍 CỤ THỂ CẦN TÌM TRONG CODE

### Tìm Moving Average function:
```typescript
// Tìm patterns như:
function calculateMovingAverage(oldQty, oldAvg, newQty, newPrice)
function updateAvgCost(...)
movingAverageCost(...)

// Hoặc inline calculation:
(oldQty * oldAvg + newQty * newPrice) / (oldQty + newQty)
```

### Tìm COGS calculation:
```typescript
// Tìm patterns như:
cogs = quantity * avgCost
cogs_amount = ...
cost_of_goods_sold = ...
```

### Tìm Stock update logic:
```typescript
// Tìm patterns như:
await prisma.stock.update({
  data: {
    quantity: newQty,
    avg_cost: newAvgCost,
    total_value: ...
  }
})
```

### Tìm sync với Product:
```typescript
// Tìm patterns như:
await prisma.product.update({
  data: { stock_qty: ... }
})
```

## 📝 OUTPUT YÊU CẦU

Sau khi kiểm tra, trả lời theo format:

---

## INVENTORY CALCULATION AUDIT RESULTS

### 1. MOVING AVERAGE IMPLEMENTATION

**Location:** [file:line]

**Current Implementation:**
```typescript
[paste actual code]
```

**Formula Check:**
- [ ] Numerator: (old_qty × old_avg) + (new_qty × new_price)
- [ ] Denominator: old_qty + new_qty
- [ ] Division by zero: [handled/not handled]
- [ ] Rounding: [method used]

**Analysis:**
- ✅ Correct: [what's correct]
- ❌ Issue: [what's wrong]

### 2. COGS IMPLEMENTATION

**Location:** [file:line]

**Current Implementation:**
```typescript
[paste actual code]
```

**Analysis:**
- COGS = quantity × avg_cost: [Yes/No]
- Uses avg_cost at time of sale: [Yes/No]

### 3. DATA SYNC CHECK

| Source | Target | Synced? | Location |
|--------|--------|---------|----------|
| Stock.quantity | Product.stock_qty | Yes/No | [file:line] |
| Stock IN | StockMovement | Yes/No | [file:line] |
| Stock OUT | StockMovement | Yes/No | [file:line] |
| Transaction SALE | Stock OUT | Yes/No | [file:line] |
| Transaction PURCHASE | Stock IN | Yes/No | [file:line] |

### 4. BUGS FOUND

**Bug #1: [Title]**
- File: [path]
- Line: [number]
- Issue: [description]
- Impact: [what goes wrong]
- Fix:
```typescript
[proposed fix]
```

### 5. EDGE CASES

| Case | Current Behavior | Should Be |
|------|-----------------|-----------|
| First stock in (qty=0) | [behavior] | avg = in_price |
| Stock out > available | [behavior] | Error or negative |
| in_qty = 0 | [behavior] | Reject |
| in_price = 0 | [behavior] | Warning/Allow |

### 6. RECOMMENDATIONS

1. [High Priority] ...
2. [Medium Priority] ...
3. [Low Priority] ...

---

## 🧪 TEST CASES TO RUN

### Test Case 1: First Stock In (Initial)
```json
{
  "product_id": "xxx",
  "type": "IN",
  "quantity": 100,
  "unit_price": 10000
}
```
**Initial State:** qty=0, avg_cost=0
**Expected After:**
- qty = 100
- avg_cost = 10,000
- total_value = 1,000,000

### Test Case 2: Second Stock In (Moving Average)
```json
{
  "product_id": "xxx",
  "type": "IN",
  "quantity": 50,
  "unit_price": 12000
}
```
**Before:** qty=100, avg_cost=10,000, total=1,000,000
**Expected After:**
- qty = 150
- avg_cost = (100×10,000 + 50×12,000) / 150 = 1,600,000 / 150 = 10,667
- total_value = 150 × 10,667 = 1,600,050 (rounding)

### Test Case 3: Stock Out (COGS)
```json
{
  "product_id": "xxx",
  "type": "OUT",
  "quantity": 30
}
```
**Before:** qty=150, avg_cost=10,667
**Expected After:**
- qty = 120
- avg_cost = 10,667 (unchanged)
- total_value = 120 × 10,667 = 1,280,040
- COGS = 30 × 10,667 = 320,010

### Test Case 4: Stock Out All
```json
{
  "product_id": "xxx",
  "type": "OUT",
  "quantity": 120
}
```
**Before:** qty=120, avg_cost=10,667
**Expected After:**
- qty = 0
- avg_cost = 10,667 (preserved for next IN, or reset to 0?)
- total_value = 0
- COGS = 120 × 10,667 = 1,280,040

### Test Case 5: Stock In After Zero (Preserve or Reset avg?)
```json
{
  "product_id": "xxx",
  "type": "IN",
  "quantity": 50,
  "unit_price": 15000
}
```
**Before:** qty=0, avg_cost=10,667 (from previous)
**Expected After:**
- Option A (Reset): avg_cost = 15,000
- Option B (Keep): avg_cost = (0×10,667 + 50×15,000) / 50 = 15,000
- Both should result in avg = 15,000

### Test Case 6: Different VAT scenarios
```json
{
  "type": "IN",
  "quantity": 100,
  "unit_price": 100000,
  "vat_rate": 10
}
```
**Question:** 
- avg_cost includes VAT or excludes VAT?
- Vietnamese standard: avg_cost = price BEFORE VAT (if VAT deductible)

### Test Case 7: Multiple Locations
```json
{
  "product_id": "xxx",
  "location_code": "WH-01",
  "type": "IN",
  "quantity": 100
}
```
**Check:**
- Stock per location correct
- Product.stock_qty = SUM of all locations

### Test Case 8: Negative Stock (if allowed)
```json
{
  "type": "OUT",
  "quantity": 200
}
```
**Before:** qty=100
**Expected:**
- If allow_negative_stock = true: qty = -100
- If allow_negative_stock = false: Error

### Test Case 9: Fractional Quantities
```json
{
  "type": "IN",
  "quantity": 2.5,
  "unit_price": 10000
}
```
**Check:**
- Quantity rounded correctly (3 decimals)
- Calculations handle decimals

### Test Case 10: Large Numbers
```json
{
  "type": "IN",
  "quantity": 1000000,
  "unit_price": 999999
}
```
**Check:**
- No overflow
- total_value = 999,999,000,000 (gần 1 trillion VND)

---

## 📋 STOCK MOVEMENT RECORD VERIFICATION

Mỗi stock movement phải có đầy đủ thông tin:

```typescript
{
  id: string,
  farm_id: string,
  product_id: string,
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER',
  code: string,
  date: Date,
  quantity: number,           // Số lượng thay đổi
  unit: string,
  unit_price: number,         // Giá nhập (với IN) hoặc 0 (với OUT)
  avg_cost_before: number,    // Giá vốn trước
  avg_cost_after: number,     // Giá vốn sau
  cogs_amount: number,        // COGS (với OUT) hoặc 0 (với IN)
  qty_before: number,         // Tồn trước
  qty_after: number,          // Tồn sau
  from_location: string | null,
  to_location: string | null,
  transaction_id: string | null,  // Linked transaction
  reason: string,
  notes: string,
  created_by: string,
}
```

---

## 🔄 DATA FLOW DIAGRAM

```
PURCHASE Transaction
       │
       ▼
┌─────────────────┐
│ Stock IN        │
│ - qty += amount │
│ - recalc avg    │
│ - total_value   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ Stock Table     │◄───►│ Product Table   │
│ - quantity      │     │ - stock_qty     │
│ - avg_cost      │     │                 │
│ - total_value   │     │                 │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│ StockMovement   │
│ - type: IN      │
│ - qty_before    │
│ - qty_after     │
│ - avg_before    │
│ - avg_after     │
└─────────────────┘

SALE Transaction
       │
       ▼
┌─────────────────┐
│ Stock OUT       │
│ - qty -= amount │
│ - avg unchanged │
│ - calc COGS     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ StockMovement   │
│ - type: OUT     │
│ - cogs_amount   │
└─────────────────┘
```

```

## PROMPT END

---

## 📋 QUICK REFERENCE

### Vietnamese Inventory Terms:
- Giá vốn bình quân gia quyền = Moving Average Cost
- Giá vốn hàng bán = COGS (Cost of Goods Sold)
- Nhập kho = Stock In
- Xuất kho = Stock Out
- Kiểm kê = Stock Count
- Điều chỉnh = Adjustment
- Chênh lệch = Variance

### Common Inventory Bugs:
1. avg_cost không update khi nhập
2. COGS tính sai (dùng giá nhập thay vì giá vốn)
3. Stock và Product không sync
4. StockMovement không được tạo
5. Division by zero khi qty = 0
6. Rounding errors accumulate

### Key Business Rules:
- COGS dùng giá vốn tại thời điểm xuất
- Moving average tính khi nhập, không đổi khi xuất
- Negative stock tùy thuộc farm config
- Multi-location: mỗi location có avg_cost riêng
