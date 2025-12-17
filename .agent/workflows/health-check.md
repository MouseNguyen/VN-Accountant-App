---
description: Health check and QA verification scripts for LABA ERP
---

# 🏥 LABA ERP Health Check Workflow

Run this before starting new tasks or phases to verify system integrity.

---

## 🚀 Quick Start - Full System Check

// turbo
1. Run the comprehensive health check:
```bash
npx tsx scripts/health-check.ts
```

**Expected Result:**
- All checks should PASS or have acceptable WARNINGS
- No FAILED checks
- Report saved to `health-check-YYYY-MM-DD.json`

---

## 📋 All Available Scripts

### 🏥 Health & Verification

| Script | Purpose | Command |
|--------|---------|---------|
| `health-check.ts` | **MAIN** - Comprehensive system check | `npx tsx scripts/health-check.ts` |
| `verify-test-cases.ts` | Business logic test verification | `npx tsx scripts/verify-test-cases.ts` |
| `quick-integrity-check.ts` | Fast data integrity check | `npx tsx scripts/quick-integrity-check.ts` |
| `check-data-integrity.ts` | Detailed integrity audit | `npx tsx scripts/check-data-integrity.ts` |

### 🔧 Data Repair Scripts

| Script | Purpose | Command |
|--------|---------|---------|
| `fix-all-issues.ts` | Auto-fix data issues | `npx tsx scripts/fix-all-issues.ts` |
| `repair-data-sync.ts` | Repair data sync (use `--dry-run` first) | `npx tsx scripts/repair-data-sync.ts --dry-run` |
| `sync-stock-to-product.ts` | Fix stock data sync | `npx tsx scripts/sync-stock-to-product.ts` |
| `sync-transaction-ap.ts` | Sync Transaction with AP records | `npx tsx scripts/sync-transaction-ap.ts` |

### 📦 Stock & Inventory

| Script | Purpose | Command |
|--------|---------|---------|
| `check-stock.ts` | Debug stock issues | `npx tsx scripts/check-stock.ts` |
| `check-product-stock.ts` | Check Product vs Stock sync | `npx tsx scripts/check-product-stock.ts` |
| `check-stock-locations.ts` | Verify stock location data | `npx tsx scripts/check-stock-locations.ts` |
| `create-stock-from-products.ts` | Create Stock from existing Products | `npx tsx scripts/create-stock-from-products.ts` |

### 👥 Partners & Payables

| Script | Purpose | Command |
|--------|---------|---------|
| `check-partner-balance.ts` | Verify partner balance calculations | `npx tsx scripts/check-partner-balance.ts` |
| `check-ap.ts` | Check Accounts Payable data | `npx tsx scripts/check-ap.ts` |
| `check-ar-data.ts` | Check Accounts Receivable data | `npx tsx scripts/check-ar-data.ts` |
| `check-dailythuoc.ts` | Check specific partner data | `npx tsx scripts/check-dailythuoc.ts` |

### 💰 Transactions & Reports

| Script | Purpose | Command |
|--------|---------|---------|
| `check-transactions.ts` | Debug transaction data | `npx tsx scripts/check-transactions.ts` |
| `compare-pages.ts` | Compare Giao dịch vs Báo cáo totals | `npx tsx scripts/compare-pages.ts` |
| `expense-details.ts` | Show expense transaction details | `npx tsx scripts/expense-details.ts` |
| `muahang-details.ts` | Show Mua hàng breakdown | `npx tsx scripts/muahang-details.ts` |

### 🧾 VAT & Tax

| Script | Purpose | Command |
|--------|---------|---------|
| `check-vat.ts` | Check VAT calculations | `npx tsx scripts/check-vat.ts` |
| `check-vat-declaration.ts` | Verify VAT declaration data | `npx tsx scripts/check-vat-declaration.ts` |
| `verify-chiPhi.ts` | Verify Chi phí calculations | `npx tsx scripts/verify-chiPhi.ts` |
| `verify-namnay.ts` | Verify "Năm nay" data | `npx tsx scripts/verify-namnay.ts` |

### 👷 Payroll

| Script | Purpose | Command |
|--------|---------|---------|
| `check-payroll.ts` | Debug payroll data | `npx tsx scripts/check-payroll.ts` |
| `backfill-payroll-expenses.ts` | Create expense records for payroll | `npx tsx scripts/backfill-payroll-expenses.ts` |

---

## 🔄 Recommended Order for Full QA

// turbo-all
```bash
# 1. Main health check
npx tsx scripts/health-check.ts

# 2. Verify business logic
npx tsx scripts/verify-test-cases.ts

# 3. Check specific areas (if issues found)
npx tsx scripts/check-stock.ts
npx tsx scripts/check-partner-balance.ts
npx tsx scripts/check-transactions.ts
```

---

## What Gets Checked by health-check.ts

| Category | Checks |
|----------|--------|
| 📊 **Database** | Connection, tables exist |
| 🔍 **Data Integrity** | Partner balance, Stock sync, AP/AR sync, Payment status |
| 🧮 **Calculations** | Moving average, VND rounding (0 decimals), COGS consistency |
| 📈 **Reports** | Revenue query, Expense query, COGS query |
| 📋 **Business Rules** | Negative stock, Future transactions, Orphan records |
| 👷 **Payroll** | Active workers, Pending payroll |

---

## When to Run

✅ **Run health check when:**
- Before starting a new development phase
- After making database changes
- After fixing bugs in calculation logic
- Before deploying to production
- After data migration

❌ **Don't run repair scripts without:**
- Running `--dry-run` first (if available)
- Understanding what will be changed
- Having a database backup
