# 📋 PHASE 4 - TASK 6: AP MODULE

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P4-T6 |
| **Tên** | AP Module (Accounts Payable) |
| **Thời gian** | 10-12 giờ |
| **Phụ thuộc** | Task 1 (Schema) |
| **Task tiếp theo** | Task 7 (Financial Reports) |

---

## 📋 MỤC TIÊU

- Full AP module tương tự AR:
  - AP Invoice CRUD
  - Post với nhập kho
  - AP Payments
  - AP Aging

---

## PHẦN 1: API ENDPOINTS

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /api/ap/invoices | List vendor invoices |
| POST | /api/ap/invoices | Create draft |
| POST | /api/ap/invoices/:id/post | Post (nhập kho) |
| POST | /api/ap/payments | Create payment |
| POST | /api/ap/payments/:id/allocate | Allocate |
| GET | /api/ap/aging | Aging report |

---

## PHẦN 2: POST WITH STOCK IN

```typescript
export async function postAPInvoice(invoiceId: string, userId: string) {
  const invoice = await prisma.aPInvoice.findUnique({
    where: { id: invoiceId },
    include: { lines: true },
  });
  
  return prisma.$transaction(async (tx) => {
    // 1. Journal entry
    await createJournalEntry(tx, {
      entries: [
        { account: '156', debit: invoice.sub_total },    // Inventory
        { account: '133', debit: invoice.tax_amount },   // VAT Input
        { account: '331', credit: invoice.total_amount }, // AP
      ],
    });
    
    // 2. Stock movements (nhập kho)
    for (const line of invoice.lines) {
      if (line.product_id) {
        await createStockMovement(tx, {
          type: 'IN',
          product_id: line.product_id,
          quantity: line.quantity,
          unit_price: line.unit_price,  // For moving average
        });
      }
    }
    
    // 3. Update vendor balance
    await tx.partner.update({
      where: { id: invoice.vendor_id },
      data: { balance_ap: { increment: invoice.total_amount } },
    });
    
    // 4. Update status
    return tx.aPInvoice.update({
      where: { id: invoiceId },
      data: { status: 'POSTED', posted_at: new Date(), posted_by: userId },
    });
  });
}
```

---

## ✅ CHECKLIST

- [ ] AP Invoice CRUD
- [ ] Post với stock in
- [ ] AP Payments
- [ ] FIFO allocation
- [ ] AP Aging report

---

**Estimated Time:** 10-12 giờ  
**Next Task:** Task 7 - Financial Reports
