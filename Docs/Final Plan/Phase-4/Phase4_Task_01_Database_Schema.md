# 📋 PHASE 4 - TASK 1: DATABASE SCHEMA

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P4-T1 |
| **Tên** | Database Schema Phase 4 |
| **Thời gian** | 8-10 giờ |
| **Phụ thuộc** | Phase 3 hoàn thành |
| **Task tiếp theo** | Task 2 (AR Invoice CRUD) |

---

## 📋 MỤC TIÊU

- Full AR Schema: Invoice, Line, Payment, Allocation, CreditMemo
- Full AP Schema: Invoice, Line, Payment, Allocation
- FailedLogin cho brute force protection
- BankAccount model

---

## 📥 INPUTS TỪ PHASE 3

| Input | Từ | Chi tiết |
|-------|-----|----------|
| Partners | P1 | Customer/Vendor |
| Products | P1 | Inventory items |
| Tax rates | P3 | VAT rates |

---

## PHẦN 1: AR SCHEMA

```prisma
model ARInvoice {
  id              String   @id @default(uuid())
  farm_id         String
  invoice_number  String   // INV-2025-00001
  invoice_date    DateTime @db.Date
  customer_id     String
  
  sub_total       Decimal  @db.Decimal(18, 2)
  tax_amount      Decimal  @db.Decimal(18, 2)
  total_amount    Decimal  @db.Decimal(18, 2)
  paid_amount     Decimal  @default(0) @db.Decimal(18, 2)
  
  due_date        DateTime @db.Date
  payment_term_days Int    @default(30)
  
  status          ARInvoiceStatus @default(DRAFT)
  posted_at       DateTime?
  
  @@unique([farm_id, invoice_number])
  @@map("ar_invoices")
}

model ARInvoiceLine {
  id              String   @id @default(uuid())
  invoice_id      String
  line_number     Int
  product_id      String?
  product_name    String
  quantity        Decimal  @db.Decimal(18, 2)
  unit_price      Decimal  @db.Decimal(18, 2)
  tax_rate        Decimal  @db.Decimal(5, 2)
  total_amount    Decimal  @db.Decimal(18, 2)
  
  @@unique([invoice_id, line_number])
  @@map("ar_invoice_lines")
}

model ARPayment {
  id              String   @id @default(uuid())
  farm_id         String
  payment_number  String   // PT-2025-00001
  payment_date    DateTime @db.Date
  customer_id     String
  payment_method  PaymentMethod
  amount          Decimal  @db.Decimal(18, 2)
  allocated_amount Decimal @default(0) @db.Decimal(18, 2)
  status          PaymentStatus @default(DRAFT)
  
  @@unique([farm_id, payment_number])
  @@map("ar_payments")
}

model ARPaymentAllocation {
  id              String   @id @default(uuid())
  payment_id      String
  invoice_id      String
  amount          Decimal  @db.Decimal(18, 2)
  
  @@unique([payment_id, invoice_id])
  @@map("ar_payment_allocations")
}

enum ARInvoiceStatus {
  DRAFT, POSTED, PARTIALLY_PAID, PAID, OVERDUE, VOID
}
```

---

## PHẦN 2: AP SCHEMA

```prisma
model APInvoice {
  id              String   @id @default(uuid())
  farm_id         String
  invoice_number  String   // PINV-2025-00001
  invoice_date    DateTime @db.Date
  vendor_id       String
  
  sub_total       Decimal  @db.Decimal(18, 2)
  tax_amount      Decimal  @db.Decimal(18, 2)
  total_amount    Decimal  @db.Decimal(18, 2)
  paid_amount     Decimal  @default(0) @db.Decimal(18, 2)
  
  due_date        DateTime @db.Date
  status          APInvoiceStatus @default(DRAFT)
  
  @@unique([farm_id, invoice_number])
  @@map("ap_invoices")
}

// Similar: APInvoiceLine, APPayment, APPaymentAllocation
```

---

## PHẦN 3: SECURITY SCHEMA

```prisma
model FailedLogin {
  id              String   @id @default(uuid())
  email           String
  ip_address      String
  user_agent      String?
  attempt_at      DateTime @default(now())
  
  @@index([email, attempt_at])
  @@map("failed_logins")
}

model BankAccount {
  id              String   @id @default(uuid())
  farm_id         String
  bank_name       String
  account_number  String
  account_name    String
  is_default      Boolean  @default(false)
  
  @@unique([farm_id, account_number])
  @@map("bank_accounts")
}
```

---

## ✅ CHECKLIST

- [ ] AR Invoice, Line, Payment, Allocation
- [ ] AP Invoice, Line, Payment, Allocation
- [ ] CreditMemo
- [ ] FailedLogin
- [ ] BankAccount
- [ ] Migration SQL

---

## 🔗 KẾT NỐI

### Output → Task 2-6 (AR/AP Modules)
- All schema models ready

---

**Estimated Time:** 8-10 giờ  
**Next Task:** Task 2 - AR Invoice CRUD
