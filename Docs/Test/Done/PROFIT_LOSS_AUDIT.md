# 🧪 PROFIT/LOSS CALCULATION AUDIT RESULTS
## LABA ERP - December 17, 2025

---

## 📊 SUMMARY

| Category | Status | Notes |
|----------|--------|-------|
| Revenue calculation | ✅ GOOD | Includes SALE + INCOME |
| COGS - Method 1 (report.service) | ✅ GOOD | Uses TransactionItem.unit_cost |
| COGS - Method 2 (reports.service) | ⚠️ ISSUE | Uses StockMovement.cogs_amount (may be empty!) |
| Operating Expenses | ⚠️ ISSUE | Includes PURCHASE in one implementation |
| Expense classification | ⚠️ PARTIAL | expense_type exists but not fully used |
| Dashboard consistency | ⚠️ NEEDS CHECK | Different implementations |
| **Data sync issue** | ❌ BUG | StockMovement not created from Transaction |

---

## 1. TWO P&L IMPLEMENTATIONS FOUND

### ⚠️ Warning: Có 2 implementations khác nhau!

| File | Function | Method |
|------|----------|--------|
| `report.service.ts:205` | `getProfitLossReport()` | TransactionItem.unit_cost |
| `reports.service.ts:822` | `getProfitLossReport()` | StockMovement.cogs_amount |

**Risk:** Kết quả có thể khác nhau!

---

## 2. REVENUE CALCULATION

### Implementation 1: `report.service.ts:217-226`
```typescript
const salesTransactions = await prisma.transaction.findMany({
    where: {
        farm_id: farmId,
        trans_type: { in: ['INCOME', 'SALE'] },  // ✅ Includes both
        trans_date: { gte: startDate, lte: endDate },
        deleted_at: null,  // ✅ Excludes deleted
    },
    select: { id: true, total_amount: true },
});

const sales = salesTransactions.reduce(
    (sum, t) => sum.plus(toDecimal(t.total_amount)),
    new Decimal(0)
);
```

### Implementation 2: `reports.service.ts:830-840`
```typescript
const incomeData = await prisma.transaction.aggregate({
    where: {
        farm_id: farmId,
        trans_type: { in: ['INCOME', 'SALE'] },  // ✅ Includes both
        trans_date: { gte: fromDate, lte: toDate },
        deleted_at: null,  // ✅ Excludes deleted
    },
    _sum: { total_amount: true },
});
```

### Analysis:
- ✅ Both include `SALE` and `INCOME`
- ✅ Both filter by date range
- ✅ Both exclude deleted transactions
- ✅ Both use `total_amount`

**Revenue calculation: ✅ CORRECT**

---

## 3. COGS CALCULATION

### Implementation 1: `report.service.ts:232-256` (RECOMMENDED)

```typescript
// COGS từ TransactionItem.unit_cost
const soldItems = await prisma.transactionItem.findMany({
    where: {
        transaction: {
            farm_id: farmId,
            trans_type: { in: ['INCOME', 'SALE'] },
            trans_date: { gte: startDate, lte: endDate },
            deleted_at: null,
        },
        product_id: { not: null },  // ✅ Only product items
    },
    select: {
        quantity: true,
        unit_cost: true,  // ✅ Cost at time of sale
        transaction_id: true,
    },
});

soldItems.forEach((item) => {
    const qty = toDecimal(item.quantity);
    const cost = toDecimal(item.unit_cost);
    cogs = cogs.plus(qty.times(cost));  // ✅ COGS = qty × unit_cost
});
```

**Analysis:**
- ✅ Uses `unit_cost` (giá vốn tại thời điểm bán)
- ✅ Only counts items with `product_id`
- ✅ Calculates: `COGS = SUM(quantity × unit_cost)`

### Implementation 2: `reports.service.ts:852-860` (PROBLEMATIC)

```typescript
// COGS từ StockMovement
const cogsData = await prisma.stockMovement.aggregate({
    where: {
        farm_id: farmId,
        type: 'OUT',
        date: { gte: fromDate, lte: toDate },
    },
    _sum: { cogs_amount: true },
});

const cogs = Number(cogsData._sum.cogs_amount || 0);
```

**Analysis:**
- ❌ **PROBLEM**: Relies on `StockMovement.cogs_amount`
- ❌ **BUG**: Transaction SALE không tạo StockMovement (đã phát hiện trước đó)
- ❌ Result: **COGS = 0** cho tất cả sales qua Transaction!

### Verification of unit_cost Storage

**Location:** `transaction.service.ts:235`
```typescript
unit_cost: product ? Number(product.avg_cost) : 0,
// Lưu giá vốn tại thời điểm giao dịch ✅
```

**Conclusion:**
- `TransactionItem.unit_cost` được lưu đúng
- Implementation 1 (report.service.ts) là **ĐÚNG**
- Implementation 2 (reports.service.ts) sẽ **SAI** vì StockMovement không được tạo

---

## 4. OPERATING EXPENSES CALCULATION

### Implementation 1: `report.service.ts:264-277`

```typescript
const opExpenseTransactions = await prisma.transaction.findMany({
    where: {
        farm_id: farmId,
        trans_type: { in: ['EXPENSE'] },  // ✅ Only EXPENSE
        trans_date: { gte: startDate, lte: endDate },
        deleted_at: null,
        items: { none: { product_id: { not: null } } },  // ✅ Pure expense
    },
    select: { id: true, total_amount: true, description: true },
});
```

**Analysis:**
- ✅ Only `EXPENSE` type (not `PURCHASE`)
- ✅ Filters out expenses with products (those are inventory purchases)
- ⚠️ Does NOT group by `expense_type`

### Implementation 2: `reports.service.ts:843-851`

```typescript
const expenseData = await prisma.transaction.aggregate({
    where: {
        farm_id: farmId,
        trans_type: { in: ['EXPENSE', 'PURCHASE'] },  // ❌ INCLUDES PURCHASE!
        trans_date: { gte: fromDate, lte: toDate },
        deleted_at: null,
    },
    _sum: { total_amount: true },
});
```

**Analysis:**
- ❌ **BUG**: Includes `PURCHASE` in Operating Expenses!
- ❌ PURCHASE should be COGS (when sold), not Operating Expense
- ❌ Double counting: PURCHASE counted as expense AND as COGS when sold

### Issues Found:

| Issue | Implementation 1 | Implementation 2 |
|-------|-----------------|------------------|
| PURCHASE in Op Exp | ✅ Excluded | ❌ Included |
| expense_type grouping | ❌ Not used | ❌ Not used |
| Payroll expenses | ⚠️ Included if type=EXPENSE | ⚠️ Included |

---

## 5. 🔴 CRITICAL BUGS

### Bug #1: StockMovement-based COGS Will Be Zero

**Location:** `reports.service.ts:852-860`

**Issue:** 
- COGS calculation relies on `StockMovement.cogs_amount`
- But `Transaction.create` does NOT create `StockMovement` records
- Result: `COGS = 0` for all sales!

**Impact:**
- Gross Profit = Revenue - 0 = Revenue (overstated)
- Báo cáo lãi/lỗ sai hoàn toàn

**Fix:** Use Implementation 1 (TransactionItem.unit_cost) OR fix Transaction to create StockMovement

---

### Bug #2: PURCHASE Counted as Operating Expense

**Location:** `reports.service.ts:843-851`

**Issue:**
- `trans_type: { in: ['EXPENSE', 'PURCHASE'] }` includes PURCHASE
- PURCHASE is inventory acquisition, not operating expense

**Impact:**
- Operating Expenses overstated
- Double counting when goods are sold (COGS + Op Expense)

**Fix:**
```typescript
trans_type: { in: ['EXPENSE'] },  // Remove PURCHASE
// Or use filter like report.service.ts:
items: { none: { product_id: { not: null } } }
```

---

### Bug #3: expense_type Not Used for Grouping

**Issue:**
- Schema has `expense_type` enum with 12 types
- P&L report does NOT group expenses by type
- Cannot analyze expense breakdown

**Impact:**
- Users cannot see expense breakdown by category
- Cannot identify which expenses are growing

**Fix:**
```typescript
// Add expense breakdown
const expensesByType = await prisma.transaction.groupBy({
    by: ['expense_type'],
    where: {
        farm_id: farmId,
        trans_type: 'EXPENSE',
        trans_date: { gte: fromDate, lte: toDate },
        deleted_at: null,
    },
    _sum: { total_amount: true },
});
```

---

## 6. DASHBOARD CONSISTENCY CHECK

**Dashboard:** `dashboard.service.ts:86, 100`
```typescript
trans_type: { in: ['EXPENSE', 'PURCHASE', 'CASH_OUT'] }
```

**P&L (report.service.ts):**
```typescript
trans_type: { in: ['EXPENSE'] }
```

**P&L (reports.service.ts):**
```typescript
trans_type: { in: ['EXPENSE', 'PURCHASE'] }
```

### ⚠️ INCONSISTENCY!

| Source | Expense Types Included |
|--------|------------------------|
| Dashboard | EXPENSE, PURCHASE, CASH_OUT |
| report.service.ts | EXPENSE only |
| reports.service.ts | EXPENSE, PURCHASE |

**Impact:** Dashboard expense ≠ P&L expense!

---

## 7. NET PROFIT CALCULATION

### Implementation 1: `report.service.ts:280-282`
```typescript
const netProfit = grossProfit.minus(opExpenses);
const profitMargin = sales.isZero() ? 0 : netProfit.dividedBy(sales).times(100).toNumber();
```
- ✅ Gross Profit = Revenue - COGS
- ✅ Net Profit = Gross Profit - Operating Expenses
- ✅ Division by zero handled

### Implementation 2: `reports.service.ts:866-868`
```typescript
const grossProfit = sales - cogs;
const netProfit = grossProfit - totalExpense;
```
- ✅ Formula correct
- ❌ But `cogs` is wrong (Bug #1)
- ❌ And `totalExpense` includes PURCHASE (Bug #2)

---

## 8. EXPENSE TYPE USAGE CHECK

### Schema Definition:
```prisma
enum ExpenseType {
  NORMAL            // Chi phí thường
  ADMIN_PENALTY     // Tiền phạt hành chính (CIT add-back 100%)
  WELFARE           // Chi phúc lợi (CIT cap)
  MATERIALS         // Nguyên vật liệu
  SALARY            // Lương thưởng
  UTILITY           // Điện/Nước/Internet
  RENT              // Thuê mặt bằng
  LOAN_REPAYMENT    // Trả nợ vay
  ENTERTAINMENT     // Tiếp khách (CIT limit)
  EQUIPMENT         // Thiết bị
  VEHICLE           // Phương tiện
  INSURANCE         // Bảo hiểm
}
```

### Usage in P&L:
- ❌ `report.service.ts`: Does NOT use expense_type
- ❌ `reports.service.ts`: Does NOT use expense_type

### Usage in CIT (should be):
- ADMIN_PENALTY → 100% add-back
- WELFARE → Check against limit
- ENTERTAINMENT → Check against limit

### ⚠️ Need to verify CIT service uses expense_type correctly

---

## 9. RECOMMENDATIONS

### 🔴 Critical (Must Fix)

1. **Standardize on ONE P&L implementation**
   - Use `report.service.ts` method (TransactionItem.unit_cost)
   - OR fix Transaction to create StockMovement

2. **Remove PURCHASE from Operating Expenses**
   - In `reports.service.ts`: Remove PURCHASE from expense query
   - PURCHASE → Inventory → COGS when sold

3. **Fix Transaction → StockMovement sync**
   - Already identified in previous audit
   - This will fix COGS in reports.service.ts method

### 🟡 High Priority

4. **Add expense_type grouping to P&L**
   - Show breakdown by expense category
   - Essential for expense analysis

5. **Standardize Dashboard expense calculation**
   - Make consistent with P&L
   - Decide: Include CASH_OUT or not?

### 🟢 Medium Priority

6. **Add Payroll to P&L breakdown**
   - Separate line for salary expenses
   - Currently mixed with operating expenses

7. **Add drill-down capability**
   - Click on expense category to see transactions
   - Already partially implemented (transaction_ids)

---

## 10. VERIFICATION SQL

```sql
-- Check P&L consistency
-- Revenue
SELECT SUM(total_amount) as revenue
FROM transactions
WHERE farm_id = 'xxx'
  AND trans_type IN ('SALE', 'INCOME')
  AND trans_date BETWEEN '2024-11-01' AND '2024-11-30'
  AND deleted_at IS NULL;

-- COGS (Method 1 - TransactionItem)
SELECT SUM(ti.quantity * ti.unit_cost) as cogs
FROM transaction_items ti
JOIN transactions t ON ti.transaction_id = t.id
WHERE t.farm_id = 'xxx'
  AND t.trans_type IN ('SALE', 'INCOME')
  AND t.trans_date BETWEEN '2024-11-01' AND '2024-11-30'
  AND t.deleted_at IS NULL
  AND ti.product_id IS NOT NULL;

-- COGS (Method 2 - StockMovement) - LIKELY WRONG
SELECT SUM(cogs_amount) as cogs
FROM stock_movements
WHERE farm_id = 'xxx'
  AND type = 'OUT'
  AND date BETWEEN '2024-11-01' AND '2024-11-30';

-- Operating Expenses (Correct)
SELECT SUM(total_amount) as op_expense
FROM transactions
WHERE farm_id = 'xxx'
  AND trans_type = 'EXPENSE'
  AND trans_date BETWEEN '2024-11-01' AND '2024-11-30'
  AND deleted_at IS NULL;

-- Expense by Type
SELECT expense_type, SUM(total_amount) as amount
FROM transactions
WHERE farm_id = 'xxx'
  AND trans_type = 'EXPENSE'
  AND trans_date BETWEEN '2024-11-01' AND '2024-11-30'
  AND deleted_at IS NULL
GROUP BY expense_type;
```

---

## ✅ CONCLUSION

| Component | report.service.ts | reports.service.ts |
|-----------|-------------------|-------------------|
| Revenue | ✅ Correct | ✅ Correct |
| COGS | ✅ Correct (unit_cost) | ❌ Bug (StockMovement empty) |
| Op Expenses | ✅ Correct (EXPENSE only) | ❌ Bug (includes PURCHASE) |
| expense_type | ❌ Not used | ❌ Not used |
| Net Profit | ✅ Correct | ❌ Wrong (due to above bugs) |

**Use `report.service.ts:getProfitLossReport()` - it's more accurate!**

**But fix these:**
1. Add expense_type grouping
2. Ensure Dashboard uses same logic
3. Fix Transaction → StockMovement sync for future consistency
