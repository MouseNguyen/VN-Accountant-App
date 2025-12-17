# AI PROMPT: TEST PHASE 5 - AUTO-BACKEND

## TASK
Test Phase 5 automation features: Payroll, CCDC allocation, Budget, Costing

## PHASE 5 SCOPE
Auto Payroll, CCDC (Tools) allocation, Budget management, Cost analytics

## CHECKLIST

### 1. Employee Management
```
□ CRUD employees
□ Link to Worker (if seasonal → permanent)
□ Contract info: start_date, salary, department
□ BHXH enrollment status
□ Bank account for salary
□ Dependents count for PIT
```

### 2. Payroll Auto-Calculate
```
□ Input: gross_salary, work_days, overtime
□ Auto-calc BHXH employee: 10.5%
□ Auto-calc BHXH employer: 21.5%
□ Auto-calc PIT (from Phase 3)
□ Net = Gross - BHXH - PIT + Allowances
□ Generate payslip
```

### 3. Payroll Workflow
```
□ Status: DRAFT → APPROVED → PAID
□ DRAFT: editable
□ APPROVED: locked, ready to pay
□ PAID: creates EXPENSE transaction
□ Payroll → Transaction link works
```

### 4. Payroll Reports
```
□ Monthly payroll summary
□ BHXH report (C02-TS)
□ PIT report (05-KK-TNCN)
□ Bank transfer file export
```

### 5. CCDC (Tools) Management
```
□ CRUD tools/CCDC
□ Fields: name, value, allocation_months
□ Monthly allocation = value / months
□ Start date determines first allocation
```

### 6. CCDC Auto-Allocation (Cron)
```
□ Cron runs monthly
□ Creates EXPENSE transaction for each active CCDC
□ Updates CCDC: accumulated, remaining
□ Stops when fully allocated
□ Transaction.expense_type = 'CCDC_ALLOCATION'
```

### 7. Budget Management
```
□ CRUD budgets
□ Budget per expense_type per month
□ Budget limit amount
□ Track actual vs budget
```

### 8. Budget Warnings
```
□ After each EXPENSE transaction:
  - Check budget for that expense_type
  - Calculate: actual / budget × 100%
□ >80%: Warning notification
□ >100%: Block or require override
□ Dashboard shows budget status
```

### 9. Cost Analytics
```
□ Cost per product (if farming)
□ Cost per department
□ Cost trend over time
□ Variance analysis: budget vs actual
```

## TEST CASES

### Payroll Test
```
Employee: 20,000,000đ gross, 1 dependent
BHXH employee: 20M × 10.5% = 2,100,000
Personal deduction: 11,000,000
Dependent deduction: 4,400,000
Taxable: 20M - 2.1M - 11M - 4.4M = 2,500,000
PIT: 2.5M × 5% = 125,000
Net: 20M - 2.1M - 125K = 17,775,000đ
```

### CCDC Allocation Test
```
Tool: Máy bơm 12,000,000đ, 12 months
Monthly: 12M / 12 = 1,000,000đ
After 6 months: accumulated = 6M, remaining = 6M
Creates 6 EXPENSE transactions
```

### Budget Test
```
Budget: Marketing 10,000,000đ/month
Actual spent: 8,500,000đ
Usage: 85% → WARNING
Next expense 2,000,000đ → total 10.5M → BLOCK
```

## AUTOMATION CHECKS

```
□ Cron job for CCDC runs correctly
□ Cron job for payroll reminders
□ Budget check triggers on transaction save
□ Notifications sent (email/in-app)
□ Audit log records auto-actions
```

## OUTPUT FORMAT
```
PHASE 5 TEST RESULTS
====================
✓ Employee CRUD: 5/5 passed
✓ Payroll calc: 6/6 passed
✗ CCDC allocation: 3/4 (cron not creating transaction)
✓ Budget warning: 4/4 passed
...
```
