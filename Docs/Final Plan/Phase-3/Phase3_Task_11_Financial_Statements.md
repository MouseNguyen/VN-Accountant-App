# 📋 PHASE 3 - TASK 11: FINANCIAL STATEMENTS

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P3-T11 |
| **Tên** | Financial Statements - BCTC |
| **Thời gian** | 12-15 giờ |
| **Phụ thuộc** | Task 1-10 (All data) |
| **Task tiếp theo** | Task 12 (Cron Jobs) |

---

## 📋 MỤC TIÊU

- Bảng cân đối kế toán (B01-DNN)
- Báo cáo kết quả kinh doanh (B02-DNN)
- Báo cáo lưu chuyển tiền tệ (B03-DNN)
- Thuyết minh BCTC (B09-DNN)

---

## PHẦN 1: BALANCE SHEET (B01-DNN)

```typescript
// src/services/financial-statements/balance-sheet.ts

interface BalanceSheetLine {
  code: string;
  name: string;
  amount_current: number;
  amount_previous: number;
}

export async function generateBalanceSheet(farmId: string, asOfDate: Date) {
  // ASSETS
  const assets = {
    current: {
      cash: await getAccountBalance(farmId, '111', asOfDate),
      bank: await getAccountBalance(farmId, '112', asOfDate),
      receivables: await getAccountBalance(farmId, '131', asOfDate),
      inventory: await getAccountBalance(farmId, '156', asOfDate),
    },
    fixed: {
      tangible: await getAccountBalance(farmId, '211', asOfDate),
      accumulated_depreciation: await getAccountBalance(farmId, '214', asOfDate),
    },
  };
  
  // LIABILITIES
  const liabilities = {
    payables: await getAccountBalance(farmId, '331', asOfDate),
    tax_payable: await getAccountBalance(farmId, '333', asOfDate),
    salary_payable: await getAccountBalance(farmId, '334', asOfDate),
  };
  
  // EQUITY
  const equity = {
    capital: await getAccountBalance(farmId, '411', asOfDate),
    retained_earnings: await getAccountBalance(farmId, '421', asOfDate),
  };
  
  const totalAssets = sumValues(assets);
  const totalLiabilities = sumValues(liabilities);
  const totalEquity = sumValues(equity);
  
  // Verify: Assets = Liabilities + Equity
  if (Math.abs(totalAssets - totalLiabilities - totalEquity) > 1) {
    console.warn('Balance sheet not balanced!');
  }
  
  return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity };
}
```

---

## PHẦN 2: INCOME STATEMENT (B02-DNN)

```typescript
// src/services/financial-statements/income-statement.ts

export async function generateIncomeStatement(
  farmId: string, 
  startDate: Date, 
  endDate: Date
) {
  // Revenue
  const revenue = await getAccountMovements(farmId, '511', startDate, endDate, 'credit');
  const returns = await getAccountMovements(farmId, '521', startDate, endDate, 'debit');
  const netRevenue = revenue - returns;
  
  // COGS
  const cogs = await getAccountMovements(farmId, '632', startDate, endDate, 'debit');
  const grossProfit = netRevenue - cogs;
  
  // Operating Expenses
  const sellingExpense = await getAccountMovements(farmId, '641', startDate, endDate, 'debit');
  const adminExpense = await getAccountMovements(farmId, '642', startDate, endDate, 'debit');
  const operatingProfit = grossProfit - sellingExpense - adminExpense;
  
  // Other
  const otherIncome = await getAccountMovements(farmId, '711', startDate, endDate, 'credit');
  const otherExpense = await getAccountMovements(farmId, '811', startDate, endDate, 'debit');
  const financialExpense = await getAccountMovements(farmId, '635', startDate, endDate, 'debit');
  
  const profitBeforeTax = operatingProfit + otherIncome - otherExpense - financialExpense;
  
  // Tax
  const citExpense = await getAccountMovements(farmId, '821', startDate, endDate, 'debit');
  const netProfit = profitBeforeTax - citExpense;
  
  return {
    revenue, returns, netRevenue,
    cogs, grossProfit,
    sellingExpense, adminExpense, operatingProfit,
    otherIncome, otherExpense, financialExpense,
    profitBeforeTax, citExpense, netProfit,
  };
}
```

---

## PHẦN 3: CASH FLOW STATEMENT (B03-DNN)

```typescript
// Phương pháp trực tiếp
export async function generateCashFlowStatement(
  farmId: string,
  startDate: Date,
  endDate: Date
) {
  // Operating Activities
  const cashFromSales = await getCashReceipts(farmId, 'SALE', startDate, endDate);
  const cashPaidSuppliers = await getCashPayments(farmId, 'PURCHASE', startDate, endDate);
  const cashPaidEmployees = await getCashPayments(farmId, 'PAYROLL', startDate, endDate);
  const cashPaidTax = await getCashPayments(farmId, 'TAX', startDate, endDate);
  
  const operatingCashFlow = cashFromSales - cashPaidSuppliers - cashPaidEmployees - cashPaidTax;
  
  // Investing Activities
  const assetPurchases = await getAssetPurchases(farmId, startDate, endDate);
  const investingCashFlow = -assetPurchases;
  
  // Financing Activities
  const capitalContributions = await getCapitalContributions(farmId, startDate, endDate);
  const financingCashFlow = capitalContributions;
  
  const netCashChange = operatingCashFlow + investingCashFlow + financingCashFlow;
  
  return {
    operating: { cashFromSales, cashPaidSuppliers, cashPaidEmployees, cashPaidTax, total: operatingCashFlow },
    investing: { assetPurchases, total: investingCashFlow },
    financing: { capitalContributions, total: financingCashFlow },
    netCashChange,
  };
}
```

---

## ✅ CHECKLIST HOÀN THÀNH

### Reports
- [ ] Balance Sheet (B01-DNN)
- [ ] Income Statement (B02-DNN)
- [ ] Cash Flow Statement (B03-DNN)
- [ ] Notes to FS (B09-DNN)

### Export
- [ ] PDF export
- [ ] Excel export

### Validation
- [ ] Balance sheet balances
- [ ] Period comparisons

---

## 🔗 KẾT NỐI

### Output → Phase 4
- Financial data cho advanced reports

---

**Estimated Time:** 12-15 giờ  
**Next Task:** Task 12 - Cron Jobs & Testing
