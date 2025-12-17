# 📋 PHASE 2 - TASK 4: AR (ACCOUNTS RECEIVABLE)

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P2-T4 |
| **Tên** | AR - Công Nợ Phải Thu |
| **Thời gian** | 8-10 giờ |
| **Phụ thuộc** | Task 1 (Schema) |
| **Task tiếp theo** | Task 5 (AP) |

---

## 📋 MỤC TIÊU

- Quản lý công nợ khách hàng
- Thu tiền với FIFO allocation
- AR Aging Report (tuổi nợ)
- Cảnh báo nợ quá hạn

---

## 📥 INPUTS

| Input | Từ | Chi tiết |
|-------|-----|----------|
| ARTransaction model | Task 1 | Schema công nợ |
| SALE transactions | Phase 1 | Giao dịch bán nợ |
| Partners | Phase 1 | Khách hàng |

---

## PHẦN 1: API ENDPOINTS

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /api/ar | Danh sách công nợ |
| GET | /api/ar/:id | Chi tiết 1 khoản nợ |
| POST | /api/ar | Tạo AR thủ công |
| POST | /api/ar/:id/payment | Thu tiền |
| GET | /api/ar/aging | Báo cáo tuổi nợ |
| GET | /api/ar/partner/:partnerId | Công nợ theo KH |

---

## PHẦN 2: FIFO PAYMENT ALLOCATION

```typescript
// src/services/ar.service.ts

/**
 * Thu tiền với FIFO - phân bổ từ khoản nợ cũ nhất
 */
export async function receivePayment(input: {
  farm_id: string;
  partner_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference?: string;
}) {
  // Lấy các khoản nợ còn mở, sắp xếp theo ngày cũ nhất
  const openAR = await prisma.aRTransaction.findMany({
    where: {
      farm_id: input.farm_id,
      partner_id: input.partner_id,
      status: { in: ['OPEN', 'PARTIAL'] },
    },
    orderBy: { doc_date: 'asc' },  // FIFO
  });
  
  let remainingAmount = input.amount;
  const allocations: ARPayment[] = [];
  
  for (const ar of openAR) {
    if (remainingAmount <= 0) break;
    
    const balance = ar.original_amount - ar.paid_amount;
    const allocatedAmount = Math.min(remainingAmount, balance);
    
    // Tạo payment record
    const payment = await prisma.aRPayment.create({
      data: {
        ar_id: ar.id,
        payment_date: new Date(input.payment_date),
        amount: allocatedAmount,
        payment_method: input.payment_method,
        reference: input.reference,
      },
    });
    
    // Update AR
    const newPaid = ar.paid_amount + allocatedAmount;
    const newBalance = ar.original_amount - newPaid;
    await prisma.aRTransaction.update({
      where: { id: ar.id },
      data: {
        paid_amount: newPaid,
        balance: newBalance,
        status: newBalance <= 0 ? 'PAID' : 'PARTIAL',
      },
    });
    
    allocations.push(payment);
    remainingAmount -= allocatedAmount;
  }
  
  // Update Partner balance
  await prisma.partner.update({
    where: { id: input.partner_id },
    data: { balance_ar: { decrement: input.amount - remainingAmount } },
  });
  
  return { 
    allocated: input.amount - remainingAmount,
    unallocated: remainingAmount,
    payments: allocations,
  };
}
```

---

## PHẦN 3: AR AGING REPORT

```typescript
// Aging buckets: 0-30, 31-60, 61-90, >90 days

interface ARAgingEntry {
  partner_id: string;
  partner_name: string;
  current: number;      // 0-30 days
  days_31_60: number;
  days_61_90: number;
  over_90: number;
  total: number;
}

export async function getARAgingReport(farmId: string): Promise<ARAgingEntry[]> {
  const today = new Date();
  
  const openAR = await prisma.aRTransaction.findMany({
    where: {
      farm_id: farmId,
      status: { in: ['OPEN', 'PARTIAL', 'OVERDUE'] },
    },
    include: { partner: true },
  });
  
  // Group by partner and calculate aging
  const agingMap = new Map<string, ARAgingEntry>();
  
  for (const ar of openAR) {
    const daysOverdue = daysBetween(ar.due_date, today);
    const entry = agingMap.get(ar.partner_id) || {
      partner_id: ar.partner_id,
      partner_name: ar.partner.name,
      current: 0, days_31_60: 0, days_61_90: 0, over_90: 0, total: 0,
    };
    
    if (daysOverdue <= 0) entry.current += ar.balance;
    else if (daysOverdue <= 30) entry.current += ar.balance;
    else if (daysOverdue <= 60) entry.days_31_60 += ar.balance;
    else if (daysOverdue <= 90) entry.days_61_90 += ar.balance;
    else entry.over_90 += ar.balance;
    
    entry.total += ar.balance;
    agingMap.set(ar.partner_id, entry);
  }
  
  return Array.from(agingMap.values());
}
```

---

## ✅ CHECKLIST HOÀN THÀNH

### API
- [ ] GET /api/ar với pagination, filters
- [ ] POST /api/ar/:id/payment
- [ ] GET /api/ar/aging

### Business Logic
- [ ] Auto create AR khi SALE credit
- [ ] FIFO payment allocation
- [ ] Status update (OPEN → PARTIAL → PAID)
- [ ] Partner balance sync

### UI
- [ ] AR list page
- [ ] Payment collection form
- [ ] Aging report page

---

## 🔗 KẾT NỐI

### Output → Task 6 (Accounting Reports)
- AR balance cho Balance Sheet
- AR Aging cho báo cáo

### Output → Phase 4 (AR Full Module)
- Base AR logic → Payment matching enhancement

---

**Estimated Time:** 8-10 giờ  
**Next Task:** Task 5 - AP (Accounts Payable)
