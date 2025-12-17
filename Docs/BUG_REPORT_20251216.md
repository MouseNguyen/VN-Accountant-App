# 🐛 BUG REPORT: Business Logic Errors
## LABA ERP - December 16, 2025

---

## 🔴 CRITICAL BUGS FOUND

### File: `src/services/ar.service.ts`

#### Bug #1: Line 414 - AR Aging Query Wrong Filter
```sql
-- CURRENT (Wrong)
AND t.trans_type = 'INCOME'

-- SHOULD BE
AND t.trans_type IN ('SALE', 'INCOME')
```
**Impact:** AR Aging report misses all SALE transactions, showing incorrect receivables.

#### Bug #2: Line 570 - AR Summary Wrong Filter
```typescript
// CURRENT (Wrong)
trans_type: 'INCOME',

// SHOULD BE
trans_type: { in: ['SALE', 'INCOME'] },
```
**Impact:** Total receivable amount is incorrect, missing SALE transactions.

#### Bug #3: Line 614 - Collected Amount Wrong Filter
```typescript
// CURRENT (Wrong)
trans_type: 'INCOME',

// SHOULD BE  
trans_type: { in: ['SALE', 'INCOME'] },
```
**Impact:** Monthly collected amount is incorrect.

---

### File: `src/services/ap.service.ts`

#### Bug #4: Line 369 - AP Payment Wrong Filter
```typescript
// CURRENT (Wrong)
trans_type: 'EXPENSE',

// SHOULD BE
trans_type: { in: ['PURCHASE', 'EXPENSE'] },
```
**Impact:** Cannot make payments for PURCHASE transactions.

#### Bug #5: Line 564 - AP Payables Wrong Filter
```typescript
// CURRENT (Wrong)
trans_type: 'EXPENSE',

// SHOULD BE
trans_type: { in: ['PURCHASE', 'EXPENSE'] },
```
**Impact:** Payables dashboard misses PURCHASE transactions.

---

## 📋 TRANSACTION TYPE MAPPING

| Module | Business Function | Required Trans Types |
|--------|------------------|---------------------|
| **AR** | Receivables (Phải thu) | `SALE`, `INCOME` |
| **AP** | Payables (Phải trả) | `PURCHASE`, `EXPENSE` |
| **VAT Output** | VAT bán ra | `SALE` |
| **VAT Input** | VAT mua vào | `PURCHASE`, `EXPENSE` |
| **Revenue** | Doanh thu | `SALE`, `INCOME` |
| **Cost/Expense** | Chi phí | `PURCHASE`, `EXPENSE` |

---

## 🔧 FIX INSTRUCTIONS

### Fix ar.service.ts

**Line 414** - In raw SQL query:
```typescript
// Find this:
AND t.trans_type = 'INCOME'

// Replace with:
AND t.trans_type IN ('SALE', 'INCOME')
```

**Line 570** - In Prisma query:
```typescript
// Find this:
trans_type: 'INCOME',

// Replace with:
trans_type: { in: ['SALE', 'INCOME'] },
```

**Line 614** - In Prisma aggregate:
```typescript
// Find this:
trans_type: 'INCOME',

// Replace with:
trans_type: { in: ['SALE', 'INCOME'] },
```

### Fix ap.service.ts

**Line 369** - In Prisma create:
```typescript
// Find this:
trans_type: 'EXPENSE',

// Replace with:
trans_type: { in: ['PURCHASE', 'EXPENSE'] },
```

**Line 564** - In Prisma query:
```typescript
// Find this:
trans_type: 'EXPENSE',

// Replace with:
trans_type: { in: ['PURCHASE', 'EXPENSE'] },
```

---

## ✅ VERIFICATION TEST CASES

After fixing, verify with seed data:

### AR Tests:
1. Create SALE transaction (BH-2411-001) → Should appear in AR aging
2. Create INCOME transaction (TN-2411-001) → Should appear in AR summary
3. AR total should = sum of unpaid SALE + INCOME

### AP Tests:
1. Create PURCHASE transaction (MH-2411-001) → Should appear in AP payables
2. Create EXPENSE transaction (CP-2411-001) → Should appear in AP summary
3. AP total should = sum of unpaid PURCHASE + EXPENSE

---

## 📊 IMPACT ANALYSIS

| Bug | Severity | Data Affected | User Impact |
|-----|----------|---------------|-------------|
| AR Aging | 🔴 Critical | All SALE transactions | Wrong aging report |
| AR Summary | 🔴 Critical | Dashboard totals | Wrong receivable amount |
| AR Collected | 🟡 Medium | Monthly metrics | Wrong collection report |
| AP Payment | 🔴 Critical | Payment processing | Cannot pay vendors |
| AP Payables | 🔴 Critical | Dashboard | Wrong payable amount |

---

## 🔍 ROOT CAUSE

The code was written assuming:
- AR only tracks `INCOME` (Thu nhập khác)
- AP only tracks `EXPENSE` (Chi phí)

But in Vietnamese accounting:
- AR (Công nợ phải thu) = `SALE` (Bán hàng) + `INCOME` (Thu nhập khác)
- AP (Công nợ phải trả) = `PURCHASE` (Mua hàng) + `EXPENSE` (Chi phí)

---

## 📝 RECOMMENDED CONSTANTS

Add to a shared constants file:

```typescript
// src/lib/constants/transaction-types.ts

export const AR_TRANSACTION_TYPES = ['SALE', 'INCOME'] as const;
export const AP_TRANSACTION_TYPES = ['PURCHASE', 'EXPENSE'] as const;
export const REVENUE_TYPES = ['SALE', 'INCOME'] as const;
export const COST_TYPES = ['PURCHASE', 'EXPENSE'] as const;

// Usage:
import { AR_TRANSACTION_TYPES } from '@/lib/constants/transaction-types';

const arTransactions = await prisma.transaction.findMany({
  where: {
    trans_type: { in: [...AR_TRANSACTION_TYPES] },
  }
});
```

This prevents future bugs by centralizing the trans_type mappings.
