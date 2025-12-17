# AI PROMPT: TEST PHASE 1 - CORE ERP

## TASK
Test all Phase 1 features for bugs. Run comprehensive checks.

## PHASE 1 SCOPE
Core ERP mini: Auth, Farm, Products, Partners, Transactions, Workers, Dashboard, OCR

## CHECKLIST

### 1. Authentication & Users
```
□ Login/logout works
□ Session persists on refresh
□ Invalid credentials rejected
□ Password hashing (bcrypt)
□ JWT token valid
```

### 2. Farm & User Management
```
□ Create farm with owner
□ Add users to farm
□ Role permissions (OWNER, STAFF, ACCOUNTANT)
□ Switch between farms (if multi-farm)
```

### 3. Products
```
□ CRUD products
□ Category enum works
□ Unit price stored correctly (VND, 0 decimals)
□ SKU unique per farm
□ Soft delete works
```

### 4. Partners
```
□ CRUD partners
□ Type: CUSTOMER / VENDOR / BOTH
□ Tax code validation (10 or 13 digits)
□ Phone/email optional
□ Balance field exists (for AR/AP)
```

### 5. Transactions
```
□ Create INCOME/EXPENSE/SALE/PURCHASE
□ TransactionItems linked correctly
□ Total = SUM(items.line_total)
□ Payment status: PENDING/PARTIAL/PAID
□ Date stored in Vietnam timezone
□ Auto-generate trans_code
```

### 6. Sales & Purchases
```
□ SALE creates TransactionItems
□ PURCHASE creates TransactionItems  
□ Partner linked correctly
□ VAT calculated: line_total × vat_rate/100
□ Discount applied before VAT
```

### 7. Workers & Daily Wages
```
□ CRUD workers
□ WorkLog: date, hours, rate
□ Calculate: total = hours × rate
□ Worker type: SEASONAL / PERMANENT
```

### 8. Dashboard
```
□ Total income this month
□ Total expense this month
□ Profit = income - expense
□ Recent transactions list
□ Numbers match actual data
```

### 9. OCR (if implemented)
```
□ Upload invoice image
□ Extract: date, amount, vendor
□ Create draft transaction from OCR
```

## QUICK TESTS

```typescript
// Test transaction calculation
const items = [
  { qty: 10, price: 100000, discount: 5000 },
  { qty: 5, price: 200000, discount: 0 }
];
// line_total = (10×100000-5000) + (5×200000) = 995000 + 1000000 = 1,995,000
// If VAT 10%: 1,995,000 × 1.1 = 2,194,500
```

## OUTPUT FORMAT
```
PHASE 1 TEST RESULTS
====================
✓ Auth: 5/5 passed
✗ Transactions: 4/5 (line_total calc wrong)
✓ Dashboard: 3/3 passed
...
Total: X passed, Y failed
```
