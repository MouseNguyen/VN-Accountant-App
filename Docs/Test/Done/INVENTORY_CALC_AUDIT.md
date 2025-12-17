# 🧪 INVENTORY CALCULATION AUDIT RESULTS
## LABA ERP - December 17, 2025

---

## 📊 SUMMARY

| Category | Status | Notes |
|----------|--------|-------|
| Moving Average Cost | ✅ GOOD | Formula đúng trong decimal.ts |
| COGS Calculation | ✅ GOOD | Dùng avg_cost đúng |
| Stock IN | ✅ GOOD | Update Stock + Product |
| Stock OUT | ✅ GOOD | Update Stock + Product + COGS |
| StockMovement | ✅ GOOD | Tạo đầy đủ records |
| **Transaction → Stock sync** | ❌ BUG | Chỉ update Product, không update Stock |
| **Transaction → StockMovement** | ❌ BUG | Không tạo StockMovement |

---

## 1. MOVING AVERAGE COST IMPLEMENTATION

### Location: `src/lib/decimal.ts:106-118`

```typescript
export function calculateMovingAverageCost(
    oldQty: number | string | Decimal,
    oldAvgCost: number | string | Decimal,
    newQty: number | string | Decimal,
    newCost: number | string | Decimal
): number {
    const oldTotal = multiply(oldQty, oldAvgCost);
    const newTotal = multiply(newQty, newCost);
    const totalQty = sum(oldQty, newQty);

    if (totalQty.isZero()) return 0;
    return roundMoney(divide(sum(oldTotal, newTotal), totalQty));
}
```

### Formula Check:
- ✅ Numerator: `(old_qty × old_avg) + (new_qty × new_price)`
- ✅ Denominator: `old_qty + new_qty`
- ✅ Division by zero: Handled (`if (totalQty.isZero()) return 0`)
- ✅ Uses Decimal.js for precision
- ⚠️ Rounding: 2 decimal places (same issue as Transaction)

### Verification:
```
Example: oldQty=100, oldAvg=50,000, newQty=50, newPrice=60,000
Expected: (100×50,000 + 50×60,000) / 150 = 8,000,000 / 150 = 53,333.33
Code: ✅ CORRECT
```

---

## 2. STOCK IN IMPLEMENTATION

### Location: `src/services/inventory.service.ts:340-435`

### Flow:
```
1. Get/Create Stock record
2. Calculate new moving average
3. Calculate new quantity and total value
4. Upsert Stock table
5. Create StockMovement record
6. Update Product.stock_qty
```

### Analysis:
- ✅ Moving average calculated correctly
- ✅ Stock table updated
- ✅ StockMovement created with full audit trail
- ✅ Product.stock_qty synced

### Code Snippet:
```typescript
const newAvgCost = calculateMovingAverageCost(oldQty, oldAvgCost, qtyIn, priceIn);
const newQty = roundQuantity(sum(oldQty, qtyIn).toNumber());
const newTotalValue = roundMoney(multiply(newQty, newAvgCost));

// Update Stock
await tx.stock.upsert({...});

// Create movement with audit trail
await tx.stockMovement.create({
    data: {
        avg_cost_before: oldAvgCost,
        avg_cost_after: newAvgCost,
        qty_before: oldQty,
        qty_after: newQty,
        cogs_amount: 0,  // No COGS for IN
    }
});

// Sync Product
await tx.product.update({
    data: { stock_qty: newQty }
});
```

✅ **CORRECT IMPLEMENTATION**

---

## 3. STOCK OUT IMPLEMENTATION

### Location: `src/services/inventory.service.ts:440-545`

### Flow:
```
1. Get Stock record (must exist)
2. Check stock availability
3. Calculate COGS = qty × avg_cost
4. Calculate new quantity and total value
5. Update Stock table
6. Create StockMovement record with COGS
7. Update Product.stock_qty
```

### Analysis:
- ✅ COGS = `out_qty × avg_cost` (correct)
- ✅ avg_cost NOT changed on OUT (correct)
- ✅ Stock availability checked
- ✅ StockMovement created with COGS
- ✅ Product.stock_qty synced

### Code Snippet:
```typescript
const avgCost = Number(stock.avg_cost);
const cogsAmount = roundMoney(multiply(qtyOut, avgCost));

// Movement record
await tx.stockMovement.create({
    data: {
        avg_cost_before: avgCost,
        avg_cost_after: avgCost,  // Unchanged on OUT ✅
        cogs_amount: cogsAmount,  // COGS recorded ✅
    }
});
```

✅ **CORRECT IMPLEMENTATION**

---

## 4. 🔴 CRITICAL BUG: Transaction → Stock Sync

### Location: `src/services/transaction.service.ts:295-315`

### Current Code:
```typescript
// 9. Cập nhật tồn kho & giá vốn
for (const item of itemsWithTotals) {
    if (!item.product_id) continue;

    if (input.trans_type === 'INCOME') {
        // BÁN -> Giảm tồn kho
        await tx.product.update({
            where: { id: item.product_id },
            data: { stock_qty: { decrement: item.quantity } },
        });
    } else {
        // MUA -> Tăng tồn kho
        await tx.product.update({
            where: { id: item.product_id },
            data: { stock_qty: { increment: item.quantity } },
        });

        // Cập nhật Moving Average Cost
        await updateMovingAverageCost(tx, item.product_id, item.quantity, item.unit_price);
    }
}
```

### Issues Found:

| Issue | Description | Impact |
|-------|-------------|--------|
| ❌ #1 | Chỉ update `Product.stock_qty` | `Stock.quantity` không được update |
| ❌ #2 | Không tạo `StockMovement` | Mất lịch sử xuất/nhập |
| ❌ #3 | COGS không được tính | Giá vốn hàng bán không có |
| ❌ #4 | `Stock.avg_cost` có thể không update | Moving average sai |
| ⚠️ #5 | Dùng `INCOME` cho SALE | Nên dùng `SALE` |

### Expected Behavior:
```
Transaction SALE created
    │
    ├── ✅ Update Product.stock_qty (decrement)
    ├── ❌ Update Stock.quantity (decrement) - MISSING
    ├── ❌ Calculate COGS - MISSING
    └── ❌ Create StockMovement - MISSING

Transaction PURCHASE created
    │
    ├── ✅ Update Product.stock_qty (increment)
    ├── ❌ Update Stock.quantity (increment) - MISSING
    ├── ❌ Update Stock.avg_cost - PARTIALLY (updateMovingAverageCost)
    └── ❌ Create StockMovement - MISSING
```

### Recommended Fix:

```typescript
// 9. Cập nhật tồn kho & giá vốn
for (const item of itemsWithTotals) {
    if (!item.product_id) continue;

    const locationCode = 'DEFAULT';
    
    // Get or create stock record
    let stock = await tx.stock.findUnique({
        where: {
            farm_id_product_id_location_code: {
                farm_id: farmId,
                product_id: item.product_id,
                location_code: locationCode,
            }
        }
    });

    const oldQty = stock ? Number(stock.quantity) : 0;
    const oldAvgCost = stock ? Number(stock.avg_cost) : 0;

    if (['SALE', 'INCOME'].includes(input.trans_type)) {
        // SALE/INCOME → Stock OUT
        const newQty = oldQty - item.quantity;
        const cogsAmount = item.quantity * oldAvgCost;

        // Update or create Stock
        await tx.stock.upsert({
            where: {
                farm_id_product_id_location_code: {
                    farm_id: farmId,
                    product_id: item.product_id,
                    location_code: locationCode,
                }
            },
            update: {
                quantity: newQty,
                total_value: newQty * oldAvgCost,
                last_movement_at: new Date(),
            },
            create: {
                farm_id: farmId,
                product_id: item.product_id,
                location_code: locationCode,
                quantity: newQty,
                avg_cost: item.unit_price,
                total_value: 0,
            },
        });

        // Create StockMovement
        await tx.stockMovement.create({
            data: {
                farm_id: farmId,
                type: 'OUT',
                code: `${transaction.code}-OUT-${item.product_id.slice(-4)}`,
                date: transDate,
                product_id: item.product_id,
                quantity: item.quantity,
                unit: product.unit,
                unit_price: oldAvgCost,
                avg_cost_before: oldAvgCost,
                avg_cost_after: oldAvgCost,
                cogs_amount: cogsAmount,
                qty_before: oldQty,
                qty_after: newQty,
                from_location: locationCode,
                transaction_id: transaction.id,
                reason: 'Xuất bán hàng',
                created_by: userId,
            }
        });

        // Update Product
        await tx.product.update({
            where: { id: item.product_id },
            data: { stock_qty: newQty },
        });

    } else if (['PURCHASE', 'EXPENSE'].includes(input.trans_type)) {
        // PURCHASE/EXPENSE → Stock IN
        const newAvgCost = calculateMovingAverageCost(
            oldQty, oldAvgCost, item.quantity, item.unit_price
        );
        const newQty = oldQty + item.quantity;

        // Update or create Stock
        await tx.stock.upsert({
            where: {
                farm_id_product_id_location_code: {
                    farm_id: farmId,
                    product_id: item.product_id,
                    location_code: locationCode,
                }
            },
            update: {
                quantity: newQty,
                avg_cost: newAvgCost,
                total_value: newQty * newAvgCost,
                last_movement_at: new Date(),
            },
            create: {
                farm_id: farmId,
                product_id: item.product_id,
                location_code: locationCode,
                quantity: newQty,
                avg_cost: newAvgCost,
                total_value: newQty * newAvgCost,
            },
        });

        // Create StockMovement
        await tx.stockMovement.create({
            data: {
                farm_id: farmId,
                type: 'IN',
                code: `${transaction.code}-IN-${item.product_id.slice(-4)}`,
                date: transDate,
                product_id: item.product_id,
                quantity: item.quantity,
                unit: product.unit,
                unit_price: item.unit_price,
                avg_cost_before: oldAvgCost,
                avg_cost_after: newAvgCost,
                cogs_amount: 0,
                qty_before: oldQty,
                qty_after: newQty,
                to_location: locationCode,
                transaction_id: transaction.id,
                reason: 'Nhập mua hàng',
                created_by: userId,
            }
        });

        // Update Product
        await tx.product.update({
            where: { id: item.product_id },
            data: { stock_qty: newQty },
        });
    }
}
```

---

## 5. DATA SYNC CHECK SUMMARY

| Source | Target | Synced? | Notes |
|--------|--------|---------|-------|
| inventory.stockIn | Stock.quantity | ✅ Yes | |
| inventory.stockIn | Stock.avg_cost | ✅ Yes | |
| inventory.stockIn | StockMovement | ✅ Yes | |
| inventory.stockIn | Product.stock_qty | ✅ Yes | |
| inventory.stockOut | Stock.quantity | ✅ Yes | |
| inventory.stockOut | StockMovement | ✅ Yes | |
| inventory.stockOut | Product.stock_qty | ✅ Yes | |
| **transaction.create SALE** | Stock.quantity | ❌ No | **BUG** |
| **transaction.create SALE** | StockMovement | ❌ No | **BUG** |
| **transaction.create PURCHASE** | Stock.quantity | ❌ No | **BUG** |
| **transaction.create PURCHASE** | StockMovement | ❌ No | **BUG** |

---

## 6. EDGE CASES

| Case | inventory.service | transaction.service |
|------|-------------------|---------------------|
| First stock in (qty=0) | ✅ Handled | N/A |
| Stock out > available | ✅ Error if not allowed | ⚠️ Only checks Product.stock_qty |
| Negative stock | ✅ Config-based | ⚠️ Uses wrong field |
| qty = 0 | ⚠️ Not validated | ⚠️ Not validated |

---

## 7. RECOMMENDATIONS

### 🔴 Critical (Must Fix)

1. **Fix Transaction → Stock sync**
   - Update `Stock.quantity` not just `Product.stock_qty`
   - Create `StockMovement` records for audit trail
   - Calculate and store COGS for sales

2. **Fix trans_type check**
   - Current: Uses `INCOME` for sales
   - Should use: `['SALE', 'INCOME']` for revenue types

### 🟡 High Priority

3. **Add validation for qty > 0**
   - Reject movements with zero or negative quantities

4. **Fix rounding to 0 decimal places**
   - VND should not have decimal places

### 🟢 Medium Priority

5. **Consider using inventory service from transaction**
   - Instead of duplicating logic, call `stockIn`/`stockOut` functions
   - This ensures consistent behavior

6. **Add stock reconciliation check**
   - Periodically verify `Product.stock_qty == Stock.quantity`

---

## 8. VERIFICATION QUERIES

```sql
-- Check Stock vs Product sync
SELECT 
    p.id, p.code, p.name,
    p.stock_qty as product_qty,
    COALESCE(s.quantity, 0) as stock_qty,
    CASE WHEN p.stock_qty != COALESCE(s.quantity, 0) THEN 'MISMATCH' ELSE 'OK' END as status
FROM products p
LEFT JOIN stocks s ON p.id = s.product_id
WHERE p.farm_id = 'test-farm-001';

-- Check StockMovements balance
SELECT 
    product_id,
    SUM(CASE WHEN type = 'IN' THEN quantity ELSE 0 END) as total_in,
    SUM(CASE WHEN type = 'OUT' THEN quantity ELSE 0 END) as total_out,
    SUM(CASE WHEN type = 'IN' THEN quantity ELSE -quantity END) as balance
FROM stock_movements
WHERE farm_id = 'test-farm-001'
GROUP BY product_id;
```

---

## ✅ CONCLUSION

| Component | Status | Action |
|-----------|--------|--------|
| inventory.service.ts | ✅ Good | No changes needed |
| decimal.ts (MA calc) | ✅ Good | No changes needed |
| **transaction.service.ts** | ❌ Bug | **MUST FIX** - Add Stock sync |

**Overall Inventory logic: 70% working**
- Direct inventory operations (stockIn, stockOut): ✅ Working
- Transaction-based inventory: ❌ Broken (data not synced)
