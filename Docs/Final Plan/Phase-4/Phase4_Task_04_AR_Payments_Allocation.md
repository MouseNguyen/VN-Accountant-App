# 📋 PHASE 4 - TASK 4: AR PAYMENTS & ALLOCATION

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P4-T4 |
| **Tên** | AR Payments & Allocation |
| **Thời gian** | 8-10 giờ |
| **Phụ thuộc** | Task 3 (Posting) |
| **Task tiếp theo** | Task 5 (Aging Report) |

---

## 📋 MỤC TIÊU

- Thu tiền khách hàng
- Phân bổ vào nhiều invoices (FIFO hoặc manual)
- Post payment với journal entry
- Update invoice status

---

## PHẦN 1: API ENDPOINTS

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | /api/ar/payments | Create payment |
| POST | /api/ar/payments/:id/post | Post payment |
| POST | /api/ar/payments/:id/allocate | Allocate to invoices |
| POST | /api/ar/payments/auto-allocate | FIFO allocation |

---

## PHẦN 2: FIFO ALLOCATION

```typescript
// src/services/ar-payment.service.ts

export async function autoAllocate(
  farmId: string, 
  customerId: string, 
  paymentId: string
) {
  const payment = await prisma.aRPayment.findUnique({
    where: { id: paymentId },
  });
  
  if (payment.allocated_amount >= payment.amount) {
    throw new Error('Payment fully allocated');
  }
  
  const remainingToAllocate = payment.amount - payment.allocated_amount;
  
  // Get open invoices, oldest first (FIFO)
  const invoices = await prisma.aRInvoice.findMany({
    where: {
      farm_id: farmId,
      customer_id: customerId,
      status: { in: ['POSTED', 'PARTIALLY_PAID'] },
    },
    orderBy: { invoice_date: 'asc' },
  });
  
  let remaining = remainingToAllocate;
  const allocations = [];
  
  for (const invoice of invoices) {
    if (remaining <= 0) break;
    
    const balance = invoice.total_amount - invoice.paid_amount;
    if (balance <= 0) continue;
    
    const allocateAmount = Math.min(remaining, balance);
    
    // Create allocation
    await prisma.aRPaymentAllocation.create({
      data: {
        farm_id: farmId,
        payment_id: paymentId,
        invoice_id: invoice.id,
        amount: allocateAmount,
      },
    });
    
    // Update invoice
    const newPaid = invoice.paid_amount + allocateAmount;
    const newStatus = newPaid >= invoice.total_amount ? 'PAID' : 'PARTIALLY_PAID';
    
    await prisma.aRInvoice.update({
      where: { id: invoice.id },
      data: { paid_amount: newPaid, status: newStatus },
    });
    
    remaining -= allocateAmount;
    allocations.push({ invoice_id: invoice.id, amount: allocateAmount });
  }
  
  // Update payment allocated amount
  await prisma.aRPayment.update({
    where: { id: paymentId },
    data: { allocated_amount: { increment: remainingToAllocate - remaining } },
  });
  
  return allocations;
}
```

---

## ✅ CHECKLIST

- [ ] Create payment
- [ ] Post payment with journal
- [ ] Manual allocation
- [ ] FIFO auto-allocation
- [ ] Invoice status update

---

**Estimated Time:** 8-10 giờ  
**Next Task:** Task 5 - AR Aging Report
