# AI PROMPT: TEST PHASE 2 - INVENTORY & AR/AP

## TASK
Test all Phase 2 features for bugs. Focus on inventory sync and AR/AP balance.

## PHASE 2 SCOPE
Inventory, Stock movements, AR (Accounts Receivable), AP (Accounts Payable), Reports, Security

## CHECKLIST

### 1. Inventory & Stock
```
□ Product.stock_qty = SUM(Stock.quantity)
□ PURCHASE → Stock IN + StockMovement created
□ SALE → Stock OUT + StockMovement created
□ Moving average cost calculated:
  new_avg = (old_qty × old_avg + new_qty × new_price) / (old_qty + new_qty)
□ Negative stock prevented (or warned)
□ Stock count/adjustment works
```

### 2. Stock Movements
```
□ Type: IN, OUT, ADJUSTMENT_IN, ADJUSTMENT_OUT, TRANSFER
□ Each movement has: product_id, quantity, unit_cost
□ COGS calculated for OUT: qty × avg_cost
□ Movement linked to transaction_id (if from sale/purchase)
```

### 3. AR (Accounts Receivable)
```
□ SALE/INCOME → ARTransaction created
□ AR.balance = Transaction.total - Transaction.paid
□ Payment → AR.balance decreases
□ AR query includes BOTH 'SALE' AND 'INCOME' trans_type
□ Partner.balance updated on payment
```

### 4. AP (Accounts Payable)
```
□ PURCHASE/EXPENSE → APTransaction created
□ AP.balance = Transaction.total - Transaction.paid
□ Payment → AP.balance decreases
□ AP query includes BOTH 'PURCHASE' AND 'EXPENSE' trans_type
□ Partner.balance updated on payment
```

### 5. Payment Sync (CRITICAL)
```
□ PaymentHistory created on payment
□ PaymentAllocation links payment to transaction(s)
□ Transaction.paid_amount = SUM(allocations)
□ Transaction.payment_status updated correctly
□ Partner.balance synced after payment
```

### 6. Reports
```
□ Revenue report: SUM(SALE + INCOME)
□ Expense report: SUM(PURCHASE + EXPENSE)
□ Stock report: current qty, value
□ AR Aging: group by 0-30, 31-60, 61-90, >90 days
□ AP Aging: same grouping
```

### 7. VAT Declaration
```
□ Output VAT = SUM(vat from SALE/INCOME)
□ Input VAT = SUM(vat from PURCHASE/EXPENSE)
□ VAT payable = output - input
□ Cash >= 20M → non-deductible flag
```

### 8. Security & Audit
```
□ AuditLog created for important actions
□ Failed login tracking
□ Session management works
□ Soft delete (deleted_at) works
```

## CRITICAL BUGS TO CHECK

```typescript
// BUG PATTERN 1: Only checking one trans_type
WHERE trans_type = 'INCOME'  // ❌ Missing SALE
WHERE trans_type IN ('SALE', 'INCOME')  // ✓

// BUG PATTERN 2: Payment not syncing
// After payment:
Transaction.paid_amount // Should increase
Partner.balance // Should decrease
AR/AP.balance // Should decrease
```

## OUTPUT FORMAT
```
PHASE 2 TEST RESULTS
====================
✓ Stock sync: 5/5 passed
✗ AR balance: 3/5 (SALE not included)
✗ Payment sync: 2/4 (Partner.balance not updated)
...
```
