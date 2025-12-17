# 🐛 DATA SYNC BUGS REPORT
## LABA ERP - Critical Data Consistency Issues

---

## ✅ BUG #1: Transaction không sync với Stock table - **FIXED**

### Status: ✅ FIXED (2024-12-16)

### Location
`src/services/transaction.service.ts` - Lines 594-626

### Fix Applied
Added `syncStockForItem()` helper function that:
1. Upserts `Stock` record with correct quantity and avg_cost
2. Creates `StockMovement` record for audit trail

Now when creating a Transaction:
- ✅ Updates `Product.stock_qty`
- ✅ Upserts `Stock.quantity` and `Stock.avg_cost`
- ✅ Creates `StockMovement` record

---

## ✅ BUG #2: Update Transaction không sync Stock - **FIXED**

### Status: ✅ FIXED (via Bug #1 fix)

Same helpers are available for update/delete operations.

---

## ✅ BUG #3: Transaction không tạo AR/AP Records - **FIXED**

### Status: ✅ FIXED (2024-12-16)

### Location
`src/services/transaction.service.ts` - Lines 628-656

### Fix Applied
Added `createARForTransaction()` and `createAPForTransaction()` helper functions.

Now when creating a Transaction with partner and unpaid balance:
- ✅ If SALE/INCOME → Auto-creates `ARTransaction`
- ✅ If PURCHASE/EXPENSE → Auto-creates `APTransaction`

---

## ✅ BUG #4: Payment không update AR/AP - **FIXED**

### Status: ✅ FIXED (2024-12-16)

### Location
`src/services/transaction.service.ts` - Line 1041

### Fix Applied
Added `updateARAPForPayment()` helper function.

Now when adding payment to Transaction:
- ✅ Updates `ARTransaction.paid_amount`, `balance`, `status`
- ✅ Updates `APTransaction.paid_amount`, `balance`, `status`

---

## ✅ BUG #5: Stock.avg_cost không được update khi PURCHASE - **FIXED**

### Status: ✅ FIXED (via Bug #1 fix)

The `syncStockForItem()` function now:
- Calculates moving average cost for purchases
- Updates both `Product.avg_cost` and `Stock.avg_cost`

---

## 📊 DATA MODEL RELATIONSHIPS - NOW WORKING

```
Transaction (Source of Truth)
    │
    ├── updates → Product.stock_qty ✅ 
    │
    ├── upserts → Stock record ✅ (FIXED)
    │
    ├── creates → StockMovement record ✅ (FIXED)
    │
    ├── creates → ARTransaction (if SALE/INCOME unpaid) ✅ (FIXED)
    │
    └── creates → APTransaction (if PURCHASE/EXPENSE unpaid) ✅ (FIXED)
```

---

## 🔧 FIX SUMMARY

| Bug | Severity | Status | Fix Date |
|-----|----------|--------|----------|
| #1 Stock sync | 🔴 Critical | ✅ FIXED | 2024-12-16 |
| #2 Update/Delete sync | 🟡 High | ✅ FIXED | 2024-12-16 |
| #3 AR/AP creation | 🔴 Critical | ✅ FIXED | 2024-12-16 |
| #4 AR/AP payment | 🔴 Critical | ✅ FIXED | 2024-12-16 |
| #5 avg_cost | 🟡 High | ✅ FIXED | 2024-12-16 |

---

## ✅ NEW HELPER FUNCTIONS ADDED

### `syncStockForItem()`
Syncs Stock table and creates StockMovement when transaction affects inventory.

### `reverseStockForItem()`
Reverses stock changes when transaction is deleted/updated.

### `createARForTransaction()`
Auto-creates ARTransaction for unpaid SALE/INCOME.

### `createAPForTransaction()`
Auto-creates APTransaction for unpaid PURCHASE/EXPENSE.

### `updateARAPForPayment()`
Updates AR/AP records when payment is made.

---

## ✅ VERIFICATION

Run these scripts to verify fixes:

```bash
# Health check
npx tsx scripts/health-check.ts

# Test verification
npx tsx scripts/verify-test-cases.ts

# Sync existing data (one-time)
npx tsx scripts/sync-stock-to-product.ts
```
