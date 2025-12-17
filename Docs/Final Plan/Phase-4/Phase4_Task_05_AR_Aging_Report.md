# 📋 PHASE 4 - TASK 5: AR AGING REPORT

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P4-T5 |
| **Tên** | AR Aging Report |
| **Thời gian** | 4-6 giờ |
| **Phụ thuộc** | Task 4 (Payments) |
| **Task tiếp theo** | Task 6 (AP Module) |

---

## 📋 MỤC TIÊU

- Báo cáo tuổi nợ theo bucket (0-30, 31-60, 61-90, >90)
- Group by customer
- Summary totals
- Export Excel

---

## PHẦN 1: AGING CALCULATION

```typescript
// GET /api/ar/aging

interface AgingBucket {
  customer_id: string;
  customer_name: string;
  current: number;      // 0-30 days
  days_31_60: number;
  days_61_90: number;
  over_90: number;
  total: number;
}

export async function getAgingReport(farmId: string, asOfDate: Date) {
  const invoices = await prisma.aRInvoice.findMany({
    where: {
      farm_id: farmId,
      status: { in: ['POSTED', 'PARTIALLY_PAID', 'OVERDUE'] },
    },
    include: { customer: true },
  });
  
  const agingMap = new Map<string, AgingBucket>();
  
  for (const inv of invoices) {
    const balance = Number(inv.total_amount) - Number(inv.paid_amount);
    if (balance <= 0) continue;
    
    const daysOverdue = differenceInDays(asOfDate, inv.due_date);
    
    let bucket = agingMap.get(inv.customer_id) || {
      customer_id: inv.customer_id,
      customer_name: inv.customer.name,
      current: 0, days_31_60: 0, days_61_90: 0, over_90: 0, total: 0,
    };
    
    if (daysOverdue <= 0) bucket.current += balance;
    else if (daysOverdue <= 30) bucket.current += balance;
    else if (daysOverdue <= 60) bucket.days_31_60 += balance;
    else if (daysOverdue <= 90) bucket.days_61_90 += balance;
    else bucket.over_90 += balance;
    
    bucket.total += balance;
    agingMap.set(inv.customer_id, bucket);
  }
  
  return Array.from(agingMap.values());
}
```

---

## ✅ CHECKLIST

- [ ] Aging API
- [ ] Group by customer
- [ ] Summary row
- [ ] Excel export

---

**Estimated Time:** 4-6 giờ  
**Next Task:** Task 6 - AP Module
