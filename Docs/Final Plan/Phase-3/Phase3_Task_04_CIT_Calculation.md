# 📋 PHASE 3 - TASK 4: CIT CALCULATION

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P3-T4 |
| **Tên** | CIT Calculation - Tính Thuế TNDN |
| **Thời gian** | 10-12 giờ |
| **Phụ thuộc** | Task 2 (Tax Rules) |
| **Task tiếp theo** | Task 5 (CIT XML Export) |

---

## 📋 MỤC TIÊU

- Lấy doanh thu, chi phí từ transactions
- Áp dụng điều chỉnh tăng/giảm theo TaxRules
- Tính thu nhập chịu thuế và thuế TNDN
- Hỗ trợ chuyển lỗ (loss carry forward)

---

## 📥 INPUTS

| Input | Từ | Chi tiết |
|-------|-----|----------|
| CITCalculation model | Task 1 | Schema |
| Tax Rules | Task 2 | CIT_ADD_BACK, CIT_DEDUCTION |
| Transactions | P1-P2 | Revenue, Expenses |

---

## PHẦN 1: API ENDPOINTS

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | /api/cit/calculate | Tính CIT cho kỳ |
| GET | /api/cit/:period | Xem kết quả |
| PUT | /api/cit/:id/adjustments | Thêm/sửa điều chỉnh |
| POST | /api/cit/:id/submit | Nộp tờ khai |

---

## PHẦN 2: CIT CALCULATION LOGIC

```typescript
// src/services/cit.service.ts

const CIT_RATE = 0.20;  // 20%

export async function calculateCIT(
  farmId: string, 
  period: string,  // "2024-Q4" or "2024"
  periodType: 'QUARTERLY' | 'ANNUAL'
) {
  const { startDate, endDate } = getPeriodDates(period, periodType);
  
  // 1. Get Revenue
  const revenue = await prisma.transaction.aggregate({
    where: {
      farm_id: farmId,
      type: 'SALE',
      trans_date: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
  });
  
  // 2. Get Expenses
  const expenses = await prisma.transaction.aggregate({
    where: {
      farm_id: farmId,
      type: { in: ['PURCHASE', 'CASH_OUT', 'PAYROLL'] },
      trans_date: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
  });
  
  const totalRevenue = Number(revenue._sum.amount) || 0;
  const totalExpenses = Number(expenses._sum.amount) || 0;
  const accountingProfit = totalRevenue - totalExpenses;
  
  // 3. Get Tax Rules for adjustments
  const adjustments = await calculateAdjustments(farmId, startDate, endDate);
  
  // 4. Calculate taxable income
  const taxableIncome = Math.max(0, 
    accountingProfit + adjustments.addBacks - adjustments.deductions
  );
  
  // 5. Check for loss carry forward
  const lossCarried = await getLossCarryForward(farmId, period);
  const finalTaxableIncome = Math.max(0, taxableIncome - lossCarried);
  
  // 6. Calculate CIT
  const citAmount = finalTaxableIncome * CIT_RATE;
  
  // 7. Save calculation
  return prisma.cITCalculation.upsert({
    where: { farm_id_period: { farm_id: farmId, period } },
    update: {
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      accounting_profit: accountingProfit,
      add_backs: adjustments.addBacks,
      deductions: adjustments.deductions,
      taxable_income: finalTaxableIncome,
      tax_rate: CIT_RATE * 100,
      cit_amount: citAmount,
      loss_carried: lossCarried,
      status: 'CALCULATED',
      calculated_at: new Date(),
    },
    create: {
      farm_id: farmId,
      period,
      period_type: periodType,
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      accounting_profit: accountingProfit,
      add_backs: adjustments.addBacks,
      deductions: adjustments.deductions,
      taxable_income: finalTaxableIncome,
      tax_rate: CIT_RATE * 100,
      cit_amount: citAmount,
      loss_carried: lossCarried,
    },
  });
}
```

---

## PHẦN 3: ADJUSTMENTS

```typescript
// Điều chỉnh theo quy định thuế VN
async function calculateAdjustments(farmId: string, startDate: Date, endDate: Date) {
  let addBacks = 0;
  let deductions = 0;
  const details: CITAdjustment[] = [];
  
  // 1. Chi phí tiếp khách > 15% quỹ lương
  const entertainmentLimit = await evaluateRule('CIT_LIMIT_ENTERTAINMENT', { farm_id: farmId });
  const entertainment = await getExpenseByCategory(farmId, 'ENTERTAINMENT', startDate, endDate);
  const payrollTotal = await getPayrollTotal(farmId, startDate, endDate);
  
  if (entertainment > payrollTotal * entertainmentLimit.value) {
    const excess = entertainment - payrollTotal * entertainmentLimit.value;
    addBacks += excess;
    details.push({
      adjustment_type: 'ADD_BACK',
      category: 'ENTERTAINMENT',
      description: 'Chi tiếp khách vượt 15% quỹ lương',
      amount: excess,
    });
  }
  
  // 2. Lương không có hợp đồng
  const noContractSalary = await getNoContractSalary(farmId, startDate, endDate);
  if (noContractSalary > 0) {
    addBacks += noContractSalary;
    details.push({
      adjustment_type: 'ADD_BACK',
      category: 'NO_CONTRACT_SALARY',
      description: 'Lương không có hợp đồng lao động',
      amount: noContractSalary,
    });
  }
  
  return { addBacks, deductions, details };
}
```

---

## ✅ CHECKLIST HOÀN THÀNH

### Calculation
- [ ] Aggregate revenue/expenses
- [ ] Apply tax rules adjustments
- [ ] Loss carry forward
- [ ] CIT = taxable × 20%

### Adjustments
- [ ] Entertainment limit (15%)
- [ ] No-contract salary
- [ ] Depreciation over limit
- [ ] Personal expenses

### UI
- [ ] CIT calculation form
- [ ] Adjustments editor
- [ ] Summary view

---

## 🔗 KẾT NỐI

### Output → Task 5-6 (CIT XML & UI)
- CIT calculation data

### Output → Task 8 (Tax Compliance Dashboard)
- CIT status for dashboard

---

**Estimated Time:** 10-12 giờ  
**Next Task:** Task 5 - CIT XML Export
