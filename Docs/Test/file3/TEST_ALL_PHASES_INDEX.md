# 🧪 LABA ERP - TEST PROMPTS (ALL 5 PHASES)

## Quick Reference

| Phase | Focus | Prompt File |
|-------|-------|-------------|
| **1** | Core ERP | `TEST_PHASE1.md` |
| **2** | Inventory & AR/AP | `TEST_PHASE2.md` |
| **3** | Tax Engine | `TEST_PHASE3.md` |
| **4** | Advanced AR/AP & Infra | `TEST_PHASE4.md` |
| **5** | Auto-Backend | `TEST_PHASE5.md` |

---

## How to Use

1. **Copy** the prompt file content
2. **Paste** to AI with your codebase
3. **AI will** check all items and report bugs

---

## Phase Summary

### Phase 1: Core ERP
- Auth, Users, Farms
- Products, Partners
- Transactions (INCOME/EXPENSE/SALE/PURCHASE)
- Workers, Dashboard, OCR

### Phase 2: Inventory & AR/AP
- Stock management, StockMovements
- Moving average cost (COGS)
- AR/AP balance tracking
- Payment sync
- VAT Declaration

### Phase 3: Tax Engine
- Tax Rules Engine
- VAT validation (cash 20M, vehicle rules)
- CIT calculation (add-backs)
- PIT calculation (progressive rates)
- Fixed Assets & Depreciation
- Vehicle 1.6B cap

### Phase 4: AR/AP Advanced
- Invoice workflow (DRAFT→POSTED→PAID)
- Payment allocation
- Aging reports
- Financial statements
- RBAC, Multi-tenant
- AWS, CI/CD

### Phase 5: Auto-Backend
- Payroll auto-calculate
- BHXH/PIT auto-deduct
- CCDC allocation (cron)
- Budget management
- Cost analytics

---

## Critical Cross-Phase Bugs

### The "INCOME only" Bug
```typescript
// Found in multiple services
trans_type: 'INCOME'  // ❌ Missing SALE
trans_type: { in: ['SALE', 'INCOME'] }  // ✓
```

### Payment Not Syncing
```
After payment made:
✓ PaymentHistory created
✓ PaymentAllocation created
✗ Transaction.paid_amount NOT updated
✗ Partner.balance NOT updated
```

### Vehicle Depreciation Cap
```
Vehicle > 1.6B VND
- Depreciation base capped at 1.6B
- Current bug: using full value
```

---

## Run Order

For full system test:
1. Phase 1 → Foundation
2. Phase 2 → Inventory/AR/AP
3. Phase 3 → Tax calculations
4. Phase 4 → Reports/Infra
5. Phase 5 → Automation

---

## Output Expected

Each phase test should output:
```
PHASE X TEST RESULTS
====================
✓ Category A: X/Y passed
✗ Category B: X/Y (bug description)
⚠ Category C: Warning
...
Total: X passed, Y failed, Z warnings
```
