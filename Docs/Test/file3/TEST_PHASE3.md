# AI PROMPT: TEST PHASE 3 - TAX ENGINE

## TASK
Test all Phase 3 tax calculations. Verify Vietnam tax rules.

## PHASE 3 SCOPE
Tax Rules Engine, VAT validation, CIT, PIT, Fixed Assets, Depreciation, Financial Statements

## VIETNAM TAX RULES REFERENCE

### VAT Rules
```
Standard rate: 10% (was 8% COVID relief)
Cash >= 20M VND → non-deductible
Vehicle < 9 seats → VAT not deductible
Must have valid invoice + tax code
```

### CIT Rules
```
Rate: 20%
Taxable = Accounting Profit + Add-backs - Deductions
Add-backs:
  - Cash payments >= 20M (no invoice)
  - Penalties (100%)
  - Vehicle depreciation over 1.6B cap
  - Welfare over limit
```

### PIT Rules
```
Employee pays: BHXH 8% + BHYT 1.5% + BHTN 1% = 10.5%
Personal deduction: 11,000,000đ/month
Dependent deduction: 4,400,000đ/person/month
Progressive rates: 5%, 10%, 15%, 20%, 25%, 30%, 35%
```

### Depreciation Rules
```
Straight-line: monthly = cost / useful_life_months
Vehicle > 1.6B → cap depreciation base at 1.6B
Vehicle < 9 seats → special rule (check CIT deduction)
```

## CHECKLIST

### 1. Tax Rules Engine
```
□ TaxRule table has rules loaded
□ getRuleValue() returns correct values
□ Rules versioned (effective_from, effective_to)
□ Farm can override default rules
```

### 2. VAT Validation
```
□ Cash >= 20M flagged non-deductible
□ Missing invoice → non-deductible
□ Invalid tax code → rejected
□ Vehicle < 9 seats → VAT non-deductible
□ VAT Declaration totals match transactions
```

### 3. CIT Calculation
```
□ Revenue = SUM(SALE + INCOME)
□ Expenses = SUM(PURCHASE + EXPENSE) 
□ COGS calculated from StockMovement
□ Add-backs calculated correctly
□ CIT = Taxable × 20%
□ Loss carried forward (if negative)
```

### 4. PIT Calculation
```
□ BHXH deducted: gross × 10.5%
□ Personal deduction: 11M
□ Dependent deduction: 4.4M × count
□ Taxable = gross - BHXH - deductions
□ Progressive tax applied correctly
□ Non-resident: flat 20%
```

### 5. Fixed Assets
```
□ CRUD assets works
□ Auto-generate code: TSCD-XXXX
□ Monthly depreciation calculated
□ Book value = original - accumulated
□ Vehicle > 1.6B capped
□ Fully depreciated → skip
```

### 6. Depreciation Schedule
```
□ DepreciationSchedule records created
□ Period format: YYYY-MM
□ accumulated_amount increases monthly
□ remaining_value decreases monthly
□ is_posted flag works
```

### 7. Financial Statements
```
□ Balance Sheet balances (A = L + E)
□ P&L: Revenue - COGS - Expenses = Profit
□ Cash Flow statement
□ Comparative periods work
```

## TEST CASES

### PIT Test
```
Gross: 15,000,000đ, 0 dependents
BHXH: 15M × 10.5% = 1,575,000
Deductions: 11,000,000
Taxable: 15M - 1.575M - 11M = 2,425,000
Tax: 2,425,000 × 5% = 121,250đ
```

### Depreciation Test
```
Asset: Máy cày 60,000,000đ, 60 months
Monthly: 60M / 60 = 1,000,000đ/month
After 12 months: accumulated = 12M, remaining = 48M
```

### Vehicle Cap Test
```
Toyota Camry: 1,800,000,000đ, 120 months
CAP: 1,600,000,000đ
Monthly: 1.6B / 120 = 13,333,333đ (NOT 15M)
```

## OUTPUT FORMAT
```
PHASE 3 TEST RESULTS
====================
✓ VAT validation: 7/7 passed
✗ PIT calculation: 4/5 (progressive rate wrong)
✗ Depreciation: 3/4 (vehicle cap not applied)
...
```
