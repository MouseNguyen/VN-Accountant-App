# 📋 PHASE 4 - TASK 3: AR INVOICE POSTING

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P4-T3 |
| **Tên** | AR Invoice Posting |
| **Thời gian** | 6-8 giờ |
| **Phụ thuộc** | Task 2 (CRUD) |
| **Task tiếp theo** | Task 4 (Payments) |

---

## 📋 MỤC TIÊU

- Post invoice: DRAFT → POSTED
- Tạo journal entry (bút toán kế toán)
- Link với stock movements (xuất kho)
- Không cho sửa sau khi post

---

## PHẦN 1: POSTING LOGIC

```typescript
// POST /api/ar/invoices/:id/post

export async function postInvoice(invoiceId: string, userId: string) {
  const invoice = await prisma.aRInvoice.findUnique({
    where: { id: invoiceId },
    include: { lines: true },
  });
  
  if (!invoice) throw new Error('Invoice not found');
  if (invoice.status !== 'DRAFT') throw new Error('Only draft can be posted');
  
  return prisma.$transaction(async (tx) => {
    // 1. Create journal entry
    const journalEntry = await createJournalEntry(tx, {
      farm_id: invoice.farm_id,
      date: invoice.invoice_date,
      description: `Bán hàng - ${invoice.invoice_number}`,
      entries: [
        { account: '131', debit: invoice.total_amount },   // AR
        { account: '511', credit: invoice.sub_total },     // Revenue
        { account: '3331', credit: invoice.tax_amount },   // VAT
      ],
    });
    
    // 2. Create stock movements (xuất kho)
    for (const line of invoice.lines) {
      if (line.product_id) {
        await createStockMovement(tx, {
          type: 'OUT',
          product_id: line.product_id,
          quantity: line.quantity,
          reference: invoice.invoice_number,
        });
      }
    }
    
    // 3. Update partner AR balance
    await tx.partner.update({
      where: { id: invoice.customer_id },
      data: { balance_ar: { increment: invoice.total_amount } },
    });
    
    // 4. Update invoice status
    return tx.aRInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'POSTED',
        posted_at: new Date(),
        posted_by: userId,
        journal_entry_id: journalEntry.id,
      },
    });
  });
}
```

---

## ✅ CHECKLIST

- [ ] Post API
- [ ] Journal entry creation
- [ ] Stock movement on post
- [ ] Partner balance update
- [ ] Void invoice

---

**Estimated Time:** 6-8 giờ  
**Next Task:** Task 4 - AR Payments
