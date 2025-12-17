# 📋 PHASE 3 - TASK 10: FIXED ASSETS

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P3-T10 |
| **Tên** | Fixed Assets - TSCĐ |
| **Thời gian** | 10-12 giờ |
| **Phụ thuộc** | Task 1 (Schema) |
| **Task tiếp theo** | Task 11 (Financial Statements) |

---

## 📋 MỤC TIÊU

- CRUD tài sản cố định
- Tính khấu hao tự động (Straight Line)
- Lịch khấu hao
- Bút toán khấu hao

---

## PHẦN 1: API ENDPOINTS

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /api/assets | List assets |
| POST | /api/assets | Create asset |
| PUT | /api/assets/:id | Update |
| POST | /api/assets/:id/dispose | Thanh lý |
| GET | /api/depreciation/schedule | Lịch khấu hao |
| POST | /api/depreciation/run | Chạy khấu hao tháng |

---

## PHẦN 2: DEPRECIATION LOGIC

```typescript
// src/services/depreciation.service.ts

export async function createDepreciationSchedule(asset: Asset) {
  const { purchase_price, useful_life_months } = asset;
  const monthlyAmount = purchase_price / useful_life_months;
  
  const schedules = [];
  let accumulated = 0;
  
  for (let i = 1; i <= useful_life_months; i++) {
    accumulated += monthlyAmount;
    const period = addMonths(asset.purchase_date, i);
    
    schedules.push({
      asset_id: asset.id,
      period: format(period, 'yyyy-MM'),
      depreciation_amount: monthlyAmount,
      accumulated_amount: accumulated,
      remaining_value: purchase_price - accumulated,
    });
  }
  
  await prisma.depreciationSchedule.createMany({ data: schedules });
}

export async function runMonthlyDepreciation(farmId: string, period: string) {
  // Get all schedules for this period
  const schedules = await prisma.depreciationSchedule.findMany({
    where: {
      asset: { farm_id: farmId },
      period,
      is_posted: false,
    },
    include: { asset: true },
  });
  
  for (const schedule of schedules) {
    // Create accounting entry
    await createJournalEntry({
      debit_account: '627',  // Chi phí khấu hao
      credit_account: '214', // Hao mòn TSCĐ
      amount: schedule.depreciation_amount,
      description: `Khấu hao ${schedule.asset.name} - ${period}`,
    });
    
    // Update schedule
    await prisma.depreciationSchedule.update({
      where: { id: schedule.id },
      data: { is_posted: true, posted_at: new Date() },
    });
    
    // Update asset
    await prisma.asset.update({
      where: { id: schedule.asset_id },
      data: {
        accumulated_depreciation: schedule.accumulated_amount,
        book_value: schedule.remaining_value,
      },
    });
  }
}
```

---

## ✅ CHECKLIST HOÀN THÀNH

### CRUD
- [ ] Create asset với schedule generation
- [ ] Update asset
- [ ] Dispose/sell asset

### Depreciation
- [ ] Monthly calculation
- [ ] Auto journal entries
- [ ] Schedule view

### Reports
- [ ] Asset list report
- [ ] Depreciation schedule report

---

## 🔗 KẾT NỐI

### Output → Task 11 (Financial Statements)
- Asset values cho Balance Sheet
- Depreciation expense cho Income Statement

### Output → Phase 5 (CCDC)
- Short-term asset pattern

---

**Estimated Time:** 10-12 giờ  
**Next Task:** Task 11 - Financial Statements
