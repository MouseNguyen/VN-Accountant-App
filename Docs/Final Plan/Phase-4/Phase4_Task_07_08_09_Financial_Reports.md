# 📋 PHASE 4 - TASK 7-9: FINANCIAL REPORTS

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P4-T7, P4-T8, P4-T9 |
| **Tên** | Financial Reports & Dashboard |
| **Thời gian** | 12-15 giờ |
| **Phụ thuộc** | Task 1-6 (AR/AP) |
| **Task tiếp theo** | Task 10 (Production Auth) |

---

## 📋 MỤC TIÊU

- Cash Flow Forecast (dự báo dòng tiền)
- Financial Dashboard (executive view)
- Advanced reporting

---

## PHẦN 1: CASH FLOW FORECAST

```typescript
// src/services/cash-forecast.service.ts

interface CashForecast {
  date: string;
  opening_balance: number;
  expected_receipts: number;  // AR due
  expected_payments: number;  // AP due
  closing_balance: number;
}

export async function getCashFlowForecast(
  farmId: string, 
  days: number = 30
): Promise<CashForecast[]> {
  const today = new Date();
  const endDate = addDays(today, days);
  
  // Get current cash balance
  const cashBalance = await getAccountBalance(farmId, '111');
  const bankBalance = await getAccountBalance(farmId, '112');
  let balance = cashBalance + bankBalance;
  
  const forecast: CashForecast[] = [];
  
  for (let i = 0; i <= days; i++) {
    const date = addDays(today, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // AR due this day
    const receipts = await prisma.aRInvoice.aggregate({
      where: {
        farm_id: farmId,
        due_date: date,
        status: { in: ['POSTED', 'PARTIALLY_PAID'] },
      },
      _sum: { total_amount: true },
    });
    
    // AP due this day
    const payments = await prisma.aPInvoice.aggregate({
      where: {
        farm_id: farmId,
        due_date: date,
        status: { in: ['POSTED', 'PARTIALLY_PAID'] },
      },
      _sum: { total_amount: true },
    });
    
    const expectedReceipts = Number(receipts._sum.total_amount) || 0;
    const expectedPayments = Number(payments._sum.total_amount) || 0;
    
    forecast.push({
      date: dateStr,
      opening_balance: balance,
      expected_receipts: expectedReceipts,
      expected_payments: expectedPayments,
      closing_balance: balance + expectedReceipts - expectedPayments,
    });
    
    balance = balance + expectedReceipts - expectedPayments;
  }
  
  return forecast;
}
```

---

## PHẦN 2: FINANCIAL DASHBOARD

### KPIs
- Total Revenue (MTD, YTD)
- Total AR Outstanding
- Total AP Outstanding
- Cash Position
- Gross Profit Margin
- DSO (Days Sales Outstanding)
- DPO (Days Payable Outstanding)

### Charts
- Revenue trend (12 months)
- Cash flow forecast
- AR Aging pie chart
- Top 10 customers

---

## ✅ CHECKLIST

- [ ] Cash flow forecast API
- [ ] Financial dashboard page
- [ ] KPI cards
- [ ] Trend charts (Recharts)
- [ ] Executive summary PDF

---

**Estimated Time:** 12-15 giờ  
**Next Task:** Task 10 - Production Auth
