# 📋 PHASE 2 - TASK 5: AP (ACCOUNTS PAYABLE)

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P2-T5 |
| **Tên** | AP - Công Nợ Phải Trả |
| **Thời gian** | 8-10 giờ |
| **Phụ thuộc** | Task 1 (Schema) |
| **Task tiếp theo** | Task 6 (Accounting Reports) |

---

## 📋 MỤC TIÊU

- Quản lý công nợ nhà cung cấp
- Thanh toán với FIFO allocation
- AP Aging Report
- Lịch thanh toán (Payment Schedule)

---

## 📥 INPUTS

| Input | Từ | Chi tiết |
|-------|-----|----------|
| APTransaction model | Task 1 | Schema AP |
| PURCHASE transactions | Phase 1 | Giao dịch mua nợ |
| Partners | Phase 1 | Nhà cung cấp |

---

## PHẦN 1: API ENDPOINTS

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /api/ap | Danh sách công nợ |
| POST | /api/ap/:id/payment | Thanh toán |
| GET | /api/ap/aging | Báo cáo tuổi nợ |
| GET | /api/ap/schedule | Lịch thanh toán |

---

## PHẦN 2: PAYMENT LOGIC

```typescript
// src/services/ap.service.ts

/**
 * Thanh toán công nợ - tương tự AR nhưng cho NCC
 */
export async function makePayment(input: {
  farm_id: string;
  partner_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
}) {
  // FIFO allocation giống AR
  const openAP = await prisma.aPTransaction.findMany({
    where: {
      farm_id: input.farm_id,
      partner_id: input.partner_id,
      status: { in: ['OPEN', 'PARTIAL'] },
    },
    orderBy: { doc_date: 'asc' },
  });
  
  let remaining = input.amount;
  
  for (const ap of openAP) {
    if (remaining <= 0) break;
    
    const balance = ap.original_amount - ap.paid_amount;
    const allocated = Math.min(remaining, balance);
    
    await prisma.aPPayment.create({
      data: {
        ap_id: ap.id,
        payment_date: new Date(input.payment_date),
        amount: allocated,
        payment_method: input.payment_method,
      },
    });
    
    const newPaid = ap.paid_amount + allocated;
    await prisma.aPTransaction.update({
      where: { id: ap.id },
      data: {
        paid_amount: newPaid,
        balance: ap.original_amount - newPaid,
        status: newPaid >= ap.original_amount ? 'PAID' : 'PARTIAL',
      },
    });
    
    remaining -= allocated;
  }
  
  // Update Partner balance
  await prisma.partner.update({
    where: { id: input.partner_id },
    data: { balance_ap: { decrement: input.amount - remaining } },
  });
  
  return { allocated: input.amount - remaining };
}
```

---

## PHẦN 3: PAYMENT SCHEDULE

```typescript
// Lịch thanh toán sắp tới (7 ngày, 30 ngày)

interface PaymentScheduleEntry {
  ap_id: string;
  partner_name: string;
  due_date: string;
  days_until_due: number;
  amount: number;
  is_overdue: boolean;
}

export async function getPaymentSchedule(farmId: string, days: number = 30) {
  const today = new Date();
  const endDate = addDays(today, days);
  
  return prisma.aPTransaction.findMany({
    where: {
      farm_id: farmId,
      status: { in: ['OPEN', 'PARTIAL'] },
      due_date: { lte: endDate },
    },
    include: { partner: true },
    orderBy: { due_date: 'asc' },
  });
}
```

---

## ✅ CHECKLIST HOÀN THÀNH

### API
- [ ] GET /api/ap
- [ ] POST /api/ap/:id/payment  
- [ ] GET /api/ap/aging
- [ ] GET /api/ap/schedule

### Business Logic
- [ ] Auto create AP khi PURCHASE credit
- [ ] FIFO payment
- [ ] Partner balance sync

### UI
- [ ] AP list page  
- [ ] Payment form
- [ ] Payment schedule dashboard

---

## 🔗 KẾT NỐI

### Output → Task 6 (Accounting Reports)
- AP balance cho Balance Sheet

### Output → Task 8 (VAT Declaration)
- AP với VAT đầu vào

---

**Estimated Time:** 8-10 giờ  
**Next Task:** Task 6 - Accounting Reports
