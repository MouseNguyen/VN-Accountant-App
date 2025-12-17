# 📋 PHASE 4 - TASK 2: AR INVOICE CRUD

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P4-T2 |
| **Tên** | AR Invoice CRUD |
| **Thời gian** | 8-10 giờ |
| **Phụ thuộc** | Task 1 (Schema) |
| **Task tiếp theo** | Task 3 (AR Invoice Posting) |

---

## 📋 MỤC TIÊU

- Tạo, sửa, xóa hóa đơn bán hàng (AR Invoice)
- Auto-generate invoice number
- Multi-line items
- Draft → Post workflow

---

## PHẦN 1: API ENDPOINTS

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /api/ar/invoices | List invoices |
| GET | /api/ar/invoices/:id | Get detail |
| POST | /api/ar/invoices | Create draft |
| PUT | /api/ar/invoices/:id | Update draft |
| DELETE | /api/ar/invoices/:id | Delete draft |

---

## PHẦN 2: CREATE INVOICE

```typescript
// src/services/ar-invoice.service.ts

export async function createInvoice(input: CreateARInvoiceInput) {
  const invoiceNumber = await generateInvoiceNumber(input.farm_id, 'INV');
  
  return prisma.$transaction(async (tx) => {
    // Create invoice
    const invoice = await tx.aRInvoice.create({
      data: {
        farm_id: input.farm_id,
        invoice_number: invoiceNumber,
        invoice_date: new Date(input.invoice_date),
        customer_id: input.customer_id,
        due_date: addDays(new Date(input.invoice_date), input.payment_term_days || 30),
        payment_term_days: input.payment_term_days || 30,
        description: input.description,
        sub_total: 0,
        tax_amount: 0,
        total_amount: 0,
        status: 'DRAFT',
        created_by: input.user_id,
      },
    });
    
    // Create lines
    let subTotal = 0;
    let taxAmount = 0;
    
    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i];
      const lineSubTotal = line.quantity * line.unit_price - (line.discount || 0);
      const lineTax = lineSubTotal * (line.tax_rate / 100);
      
      await tx.aRInvoiceLine.create({
        data: {
          farm_id: input.farm_id,
          invoice_id: invoice.id,
          line_number: i + 1,
          product_id: line.product_id,
          product_name: line.product_name,
          unit: line.unit,
          quantity: line.quantity,
          unit_price: line.unit_price,
          discount: line.discount || 0,
          tax_rate: line.tax_rate,
          sub_total: lineSubTotal,
          tax_amount: lineTax,
          total_amount: lineSubTotal + lineTax,
        },
      });
      
      subTotal += lineSubTotal;
      taxAmount += lineTax;
    }
    
    // Update totals
    return tx.aRInvoice.update({
      where: { id: invoice.id },
      data: {
        sub_total: subTotal,
        tax_amount: taxAmount,
        total_amount: subTotal + taxAmount,
      },
      include: { lines: true },
    });
  });
}
```

---

## PHẦN 3: INVOICE NUMBER GENERATION

```typescript
async function generateInvoiceNumber(farmId: string, prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-%`;
  
  const lastInvoice = await prisma.aRInvoice.findFirst({
    where: {
      farm_id: farmId,
      invoice_number: { startsWith: `${prefix}-${year}-` },
    },
    orderBy: { invoice_number: 'desc' },
  });
  
  let sequence = 1;
  if (lastInvoice) {
    const lastSeq = parseInt(lastInvoice.invoice_number.split('-').pop() || '0');
    sequence = lastSeq + 1;
  }
  
  return `${prefix}-${year}-${sequence.toString().padStart(5, '0')}`;
}
```

---

## ✅ CHECKLIST

- [ ] Create invoice API
- [ ] Update invoice API
- [ ] Delete draft invoice
- [ ] Invoice number generation
- [ ] Multi-line support
- [ ] UI forms

---

## 🔗 KẾT NỐI

### Output → Task 3 (Posting)
- Draft invoices ready for posting

---

**Estimated Time:** 8-10 giờ  
**Next Task:** Task 3 - AR Invoice Posting
