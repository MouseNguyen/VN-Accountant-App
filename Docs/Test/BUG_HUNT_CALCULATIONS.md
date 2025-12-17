# AI PROMPT: DEEP BUG HUNT - CALCULATION & TRANS_TYPE ISSUES

## CRITICAL MISSION
Hunt down ALL calculation bugs, especially the `trans_type` pattern bug found across multiple files.

## KNOWN BUG PATTERN

```typescript
// ❌ BUG: Only checks ONE type
trans_type: 'INCOME'      // Missing SALE
trans_type: 'EXPENSE'     // Missing PURCHASE

// ✓ CORRECT: Check BOTH types
trans_type: { in: ['SALE', 'INCOME'] }
trans_type: { in: ['PURCHASE', 'EXPENSE'] }
```

## FILES TO SCAN

Search these patterns in ALL files:
```bash
grep -rn "trans_type.*'INCOME'" src/
grep -rn "trans_type.*'EXPENSE'" src/
grep -rn "trans_type.*'SALE'" src/
grep -rn "trans_type.*'PURCHASE'" src/
grep -rn "trans_type.*===" src/
```

---

## CATEGORY 1: REVENUE CALCULATIONS

### Files to Check
```
src/lib/tax/cit-calculator.ts
src/services/reports.service.ts
src/services/dashboard.service.ts
src/app/api/reports/*/route.ts
```

### What Revenue MUST Include
```typescript
// Revenue = SALE + INCOME
const revenue = await prisma.transaction.aggregate({
  where: {
    trans_type: { in: ['SALE', 'INCOME'] },  // ✓ BOTH
    // NOT: trans_type: 'INCOME'  // ❌ BUG
  },
  _sum: { total_amount: true }
});
```

### Test Case
```
Database has:
- 3 SALE transactions: 50M + 30M + 20M = 100M
- 2 INCOME transactions: 10M + 5M = 15M

Expected Revenue: 115M
If bug exists: Only 15M (missing SALE)
```

---

## CATEGORY 2: EXPENSE CALCULATIONS

### Files to Check
```
src/lib/tax/cit-calculator.ts
src/services/reports.service.ts
src/services/dashboard.service.ts
src/services/payable.service.ts
```

### What Expenses MUST Include
```typescript
// Expenses = PURCHASE + EXPENSE
const expenses = await prisma.transaction.aggregate({
  where: {
    trans_type: { in: ['PURCHASE', 'EXPENSE'] },  // ✓ BOTH
  },
  _sum: { total_amount: true }
});
```

### Test Case
```
Database has:
- 3 PURCHASE transactions: 40M + 20M + 10M = 70M
- 2 EXPENSE transactions: 5M + 3M = 8M

Expected Expenses: 78M
If bug exists: Only 8M (missing PURCHASE)
```

---

## CATEGORY 3: AR (ACCOUNTS RECEIVABLE)

### Files to Check
```
src/services/ar.service.ts
src/services/receivable.service.ts
src/app/api/ar/*/route.ts
```

### AR MUST Query
```typescript
// Customer owes us money from SALE or INCOME
where: {
  trans_type: { in: ['SALE', 'INCOME'] },
  partner: { partner_type: 'CUSTOMER' },
  payment_status: { not: 'PAID' }
}
```

### Bug Impact
- Missing SALE in AR → Customer debt not tracked
- Partner.balance incorrect
- Aging report wrong

---

## CATEGORY 4: AP (ACCOUNTS PAYABLE)

### Files to Check
```
src/services/ap.service.ts
src/services/payable.service.ts
src/app/api/ap/*/route.ts
```

### AP MUST Query
```typescript
// We owe vendor money from PURCHASE or EXPENSE
where: {
  trans_type: { in: ['PURCHASE', 'EXPENSE'] },
  partner: { partner_type: 'VENDOR' },
  payment_status: { not: 'PAID' }
}
```

---

## CATEGORY 5: VAT CALCULATIONS

### Files to Check
```
src/lib/tax/vat-calculator.ts
src/services/vat.service.ts
src/app/api/tax/vat/*/route.ts
```

### Output VAT (Bán ra)
```typescript
// From SALE + INCOME
const outputVAT = await prisma.transactionItem.aggregate({
  where: {
    transaction: { trans_type: { in: ['SALE', 'INCOME'] } }
  },
  _sum: { vat_amount: true }
});
```

### Input VAT (Mua vào)
```typescript
// From PURCHASE + EXPENSE
const inputVAT = await prisma.transactionItem.aggregate({
  where: {
    transaction: { trans_type: { in: ['PURCHASE', 'EXPENSE'] } }
  },
  _sum: { vat_amount: true }
});
```

---

## CATEGORY 6: CIT SPECIFIC BUGS

### File: `src/lib/tax/cit-calculator.ts`

### Line 43 Bug (CONFIRMED)
```typescript
// ❌ BUG
trans_type: 'INCOME'

// ✓ FIX
trans_type: { in: ['SALE', 'INCOME'] }
```

### Line 266 Bug (CONFIRMED)
Entertainment limit uses wrong revenue base.

### Other CIT Checks
```
□ Line ~50: COGS calculation - uses StockMovement?
□ Line ~80: Operating expenses - includes PURCHASE?
□ Line ~120: Add-backs - cash >= 20M check
□ Line ~150: Vehicle depreciation cap check
□ Line ~200: Entertainment ratio calculation
```

---

## CATEGORY 7: P&L REPORT BUGS

### Files to Check
```
src/services/reports.service.ts
src/lib/reports/pnl.ts
```

### P&L Formula
```
Revenue (SALE + INCOME)
- COGS (from StockMovement, type=OUT)
= Gross Profit

- Operating Expenses (EXPENSE only, NOT PURCHASE)
= Operating Profit

- Other Expenses
= Net Profit Before Tax
```

### Common Bugs
```typescript
// BUG 1: COGS = 0 because StockMovement not created
// BUG 2: PURCHASE counted as Operating Expense (should be COGS)
// BUG 3: SALE not included in Revenue
```

---

## CATEGORY 8: DASHBOARD CALCULATIONS

### File: `src/services/dashboard.service.ts`

### Check These Metrics
```
□ Total Revenue = SALE + INCOME
□ Total Expenses = EXPENSE (not PURCHASE for P&L view)
□ Profit = Revenue - COGS - Expenses
□ AR Total = Outstanding from SALE + INCOME
□ AP Total = Outstanding from PURCHASE + EXPENSE
```

---

## CATEGORY 9: PARTNER BALANCE

### Files to Check
```
src/services/partner.service.ts
src/services/transaction.service.ts
```

### Balance Update Logic
```typescript
// CUSTOMER balance (they owe us)
if (['SALE', 'INCOME'].includes(trans_type)) {
  partner.balance += amount;  // Increase debt
}

// VENDOR balance (we owe them)
if (['PURCHASE', 'EXPENSE'].includes(trans_type)) {
  partner.balance += amount;  // Increase our debt
}

// On payment
partner.balance -= payment_amount;
```

### Bug Pattern
```typescript
// ❌ BUG
if (trans_type === 'INCOME') {  // Missing SALE
  partner.balance += amount;
}
```

---

## CATEGORY 10: PAYMENT SYNC

### Files to Check
```
src/services/payment.service.ts
src/services/ar.service.ts
src/services/ap.service.ts
```

### After Payment Must Update
```
1. PaymentHistory created ✓
2. PaymentAllocation created ✓
3. Transaction.paid_amount += payment ✓
4. Transaction.payment_status updated ✓
5. AR/APTransaction.balance -= payment ✓
6. Partner.balance -= payment ✓
```

### Common Bug
```typescript
// Payment updates AR but NOT Transaction.paid_amount
// Result: Dashboard shows wrong numbers
```

---

## HOW TO TEST

### Step 1: Create Test Data
```sql
-- Clear test data
DELETE FROM transactions WHERE farm_id = 'test-farm';

-- Insert mixed transactions
INSERT INTO transactions (trans_type, total_amount, ...) VALUES
('SALE', 50000000, ...),
('SALE', 30000000, ...),
('INCOME', 10000000, ...),
('PURCHASE', 40000000, ...),
('EXPENSE', 5000000, ...);
```

### Step 2: Run Calculations
```typescript
const revenue = await calculateRevenue('test-farm');
// Expected: 90M (50+30+10)
// If bug: 10M (only INCOME)

const expenses = await calculateExpenses('test-farm');
// Expected: 45M (40+5)
// If bug: 5M (only EXPENSE)
```

### Step 3: Compare Results
```
If Revenue = 10M instead of 90M → trans_type bug confirmed
If Expenses = 5M instead of 45M → trans_type bug confirmed
```

---

## OUTPUT FORMAT

```
🔍 TRANS_TYPE BUG HUNT RESULTS
==============================

FILE: src/lib/tax/cit-calculator.ts
  Line 43:  ❌ trans_type: 'INCOME' (missing SALE)
  Line 266: ❌ trans_type: 'INCOME' (missing SALE)
  Line 89:  ✓ trans_type: { in: [...] }

FILE: src/services/ar.service.ts
  Line 52:  ❌ trans_type: 'INCOME' (missing SALE)
  
FILE: src/services/reports.service.ts
  Line 120: ❌ trans_type: 'EXPENSE' (missing PURCHASE)
  Line 145: ✓ Correct

CALCULATION TEST RESULTS:
  Revenue:  ❌ Expected 90M, Got 10M
  Expenses: ❌ Expected 45M, Got 5M
  AR Total: ❌ Missing SALE transactions
  
TOTAL BUGS FOUND: 5
```

---

## FIX TEMPLATE

For each bug found, apply this fix:

```typescript
// BEFORE (BUG)
trans_type: 'INCOME'
trans_type: 'EXPENSE'

// AFTER (FIX)
trans_type: { in: ['SALE', 'INCOME'] }
trans_type: { in: ['PURCHASE', 'EXPENSE'] }
```

Or if using raw comparison:
```typescript
// BEFORE
if (trans_type === 'INCOME')
if (trans_type === 'EXPENSE')

// AFTER
if (['SALE', 'INCOME'].includes(trans_type))
if (['PURCHASE', 'EXPENSE'].includes(trans_type))
```
