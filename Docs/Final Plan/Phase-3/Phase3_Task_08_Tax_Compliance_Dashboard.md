# 📋 PHASE 3 - TASK 8: TAX COMPLIANCE DASHBOARD

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P3-T8 |
| **Tên** | Tax Compliance Dashboard |
| **Thời gian** | 6-8 giờ |
| **Phụ thuộc** | Task 4-7 (CIT, PIT, VAT) |
| **Task tiếp theo** | Task 9 (Hybrid Tax Sync) |

---

## 📋 MỤC TIÊU

- Dashboard tổng quan tuân thủ thuế
- Lịch nộp thuế với reminders
- Status tracking cho các tờ khai
- Alerts cho deadlines

---

## PHẦN 1: TAX CALENDAR

```typescript
// Tax due dates VN
const TAX_DEADLINES = {
  VAT_MONTHLY: 20,        // Ngày 20 tháng sau
  VAT_QUARTERLY: 30,      // Ngày cuối tháng đầu quý sau
  CIT_QUARTERLY: 30,      // Ngày 30 tháng đầu quý sau
  CIT_ANNUAL: '03-31',    // 31/03 năm sau
  PIT_MONTHLY: 20,        // Ngày 20 tháng sau
};
```

---

## PHẦN 2: DASHBOARD COMPONENTS

### Summary Cards
- VAT status (nộp/chưa nộp)
- CIT status
- PIT status
- Upcoming deadlines

### Calendar View
- Các deadline trong tháng
- Color code theo status

### Alerts
- Overdue tasks (red)
- Due trong 7 ngày (orange)
- Upcoming (yellow)

---

## ✅ CHECKLIST

- [ ] Tax calendar API
- [ ] Dashboard page
- [ ] Reminder emails
- [ ] Alert notifications

---

**Estimated Time:** 6-8 giờ  
**Next Task:** Task 9 - Hybrid Tax Sync
