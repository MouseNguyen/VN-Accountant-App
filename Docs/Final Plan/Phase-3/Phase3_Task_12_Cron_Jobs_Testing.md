# 📋 PHASE 3 - TASK 12: CRON JOBS & TESTING

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P3-T12 |
| **Tên** | Cron Jobs & Testing |
| **Thời gian** | 6-8 giờ |
| **Phụ thuộc** | All Phase 3 tasks |
| **Task tiếp theo** | Phase 4 |

---

## 📋 MỤC TIÊU

- Cron job chạy depreciation monthly
- Cron job tax reminders
- Cron job sync tax rules
- Comprehensive testing

---

## PHẦN 1: CRON JOBS

```typescript
// src/lib/cron/jobs.ts

import cron from 'node-cron';

// Chạy khấu hao đầu mỗi tháng
cron.schedule('0 0 1 * *', async () => {
  console.log('Running monthly depreciation...');
  const farms = await getAllActiveFarms();
  const period = format(subMonths(new Date(), 1), 'yyyy-MM');
  
  for (const farm of farms) {
    await runMonthlyDepreciation(farm.id, period);
  }
});

// Nhắc nộp thuế hàng ngày lúc 8:00
cron.schedule('0 8 * * *', async () => {
  console.log('Checking tax deadlines...');
  await sendTaxReminders();
});

// Sync tax rules hàng tuần
cron.schedule('0 2 * * 0', async () => {
  console.log('Syncing tax rules...');
  const farms = await getAllActiveFarms();
  
  for (const farm of farms) {
    if (farm.tax_settings?.auto_sync_rules) {
      await syncTaxRules(farm.id);
    }
  }
});
```

---

## PHẦN 2: TAX REMINDERS

```typescript
// src/services/tax-reminder.service.ts

export async function sendTaxReminders() {
  const today = new Date();
  const in7Days = addDays(today, 7);
  
  // Find upcoming deadlines
  const schedules = await prisma.taxSchedule.findMany({
    where: {
      status: { in: ['PENDING', 'REMINDED'] },
      due_date: { lte: in7Days },
    },
    include: { farm: { include: { users: true } } },
  });
  
  for (const schedule of schedules) {
    const daysUntil = differenceInDays(schedule.due_date, today);
    
    if (daysUntil <= 0 && schedule.status !== 'OVERDUE') {
      await markAsOverdue(schedule.id);
    }
    
    if (daysUntil <= 7 && schedule.reminder_count === 0) {
      await sendReminderEmail(schedule);
      await prisma.taxSchedule.update({
        where: { id: schedule.id },
        data: { reminded_at: new Date(), reminder_count: 1 },
      });
    }
  }
}
```

---

## PHẦN 3: TESTING PLAN

### Unit Tests
```bash
npm run test:unit -- --filter=tax-rules
npm run test:unit -- --filter=cit
npm run test:unit -- --filter=pit
npm run test:unit -- --filter=depreciation
```

### Integration Tests
```bash
npm run test:integration -- --filter=financial-statements
npm run test:integration -- --filter=tax-calculation
```

### Test Scenarios

| Scenario | Input | Expected |
|----------|-------|----------|
| PIT 7 brackets | Gross 50tr, 2 deps | PIT = 2,805,000đ |
| CIT calculation | Rev 1tỷ, Exp 800tr | CIT = 40tr |
| Depreciation | Asset 120tr, 60 months | Monthly = 2tr |

---

## ✅ CHECKLIST HOÀN THÀNH

### Cron Jobs
- [ ] Monthly depreciation
- [ ] Tax reminders
- [ ] Tax rules sync

### Testing
- [ ] Unit tests for all services
- [ ] Integration tests
- [ ] Test data generation

### Documentation
- [ ] API documentation
- [ ] Cron schedule documentation

---

## 🔗 KẾT NỐI

### Output → Phase 4
- Stable Phase 3 ready for production prep

---

**Estimated Time:** 6-8 giờ  
**Phase 3 Complete!** → Next: Phase 4
