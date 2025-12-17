# 📋 PHASE 2 - TASK 1: DATABASE SCHEMA

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P2-T1 |
| **Tên** | Database Schema Phase 2 |
| **Thời gian** | 5-6 giờ |
| **Phụ thuộc** | Phase 1 hoàn thành |
| **Task tiếp theo** | Task 2 (Inventory Management) |

---

## 📋 MỤC TIÊU

- Migration tables mới: Stock, StockMovement, AR/AP Transactions
- Thêm: PeriodLock, VATDeclaration, AuditLog
- Indexes và constraints cho performance
- Seed data mẫu

---

## 📥 INPUTS TỪ PHASE 1

| Input | Bảng/Model | Sử dụng |
|-------|------------|---------|
| Products | `products` | Link to stocks |
| Partners | `partners` | AR/AP tracking |
| Transactions | `transactions` | Link to movements |
| Accounts | `accounts` | Accounting entries |

---

## PHẦN 1: PRISMA SCHEMA - INVENTORY

```prisma
// ==========================================
// STOCK (TỒN KHO)
// ==========================================

model Stock {
  id              String    @id @default(uuid())
  farm_id         String
  product_id      String
  
  // Tồn kho
  quantity        Decimal   @default(0) @db.Decimal(18, 3)
  
  // Giá vốn bình quân (Moving Average)
  avg_cost        Decimal   @default(0) @db.Decimal(18, 2)
  total_value     Decimal   @default(0) @db.Decimal(18, 2)  // = quantity * avg_cost
  
  // Cảnh báo
  min_quantity    Decimal?  @db.Decimal(18, 3)  // Tồn tối thiểu
  max_quantity    Decimal?  @db.Decimal(18, 3)  // Tồn tối đa
  reorder_point   Decimal?  @db.Decimal(18, 3)  // Điểm đặt hàng lại
  
  // Vị trí
  location_code   String?   @default("DEFAULT")
  
  // Meta
  last_movement_at DateTime?
  updated_at      DateTime  @updatedAt
  
  // Relations
  farm            Farm      @relation(fields: [farm_id], references: [id])
  product         Product   @relation(fields: [product_id], references: [id])
  
  @@unique([farm_id, product_id, location_code])
  @@index([farm_id, quantity])
  @@map("stocks")
}

// ==========================================
// STOCK MOVEMENT (NHẬP/XUẤT KHO)
// ==========================================

enum StockMovementType {
  IN            // Nhập kho
  OUT           // Xuất kho
  ADJUST_IN     // Điều chỉnh tăng
  ADJUST_OUT    // Điều chỉnh giảm
  TRANSFER      // Chuyển kho
}

model StockMovement {
  id              String            @id @default(uuid())
  farm_id         String
  
  type            StockMovementType
  code            String            // PNK-2024-0001, PXK-2024-0001
  date            DateTime          @db.Date
  
  product_id      String
  quantity        Decimal           @db.Decimal(18, 3)
  unit            String
  unit_price      Decimal           @db.Decimal(18, 2)
  
  // Giá vốn tracking
  avg_cost_before Decimal           @db.Decimal(18, 2)
  avg_cost_after  Decimal           @db.Decimal(18, 2)
  cogs_amount     Decimal           @default(0) @db.Decimal(18, 2)  // Cost of Goods Sold
  
  // Số lượng tracking
  qty_before      Decimal           @db.Decimal(18, 3)
  qty_after       Decimal           @db.Decimal(18, 3)
  
  // Location
  from_location   String?
  to_location     String?
  
  // References
  transaction_id  String?           // Link to sale/purchase
  partner_id      String?
  
  reason          String?
  notes           String?
  
  // Meta
  created_at      DateTime          @default(now())
  created_by      String?
  
  // Relations
  farm            Farm              @relation(fields: [farm_id], references: [id])
  product         Product           @relation(fields: [product_id], references: [id])
  partner         Partner?          @relation(fields: [partner_id], references: [id])
  
  @@unique([farm_id, code])
  @@index([farm_id, product_id, date])
  @@map("stock_movements")
}
```

---

## PHẦN 2: PRISMA SCHEMA - AR/AP

```prisma
// ==========================================
// AR TRANSACTION (CÔNG NỢ PHẢI THU)
// ==========================================

enum ARAPStatus {
  OPEN          // Còn nợ
  PARTIAL       // Thanh toán 1 phần
  PAID          // Đã thanh toán
  OVERDUE       // Quá hạn
  CANCELLED     // Đã hủy
}

model ARTransaction {
  id              String      @id @default(uuid())
  farm_id         String
  partner_id      String
  
  // Document
  code            String      // AR-2024-0001
  doc_date        DateTime    @db.Date
  due_date        DateTime    @db.Date
  
  // Amounts
  original_amount Decimal     @db.Decimal(18, 2)
  paid_amount     Decimal     @default(0) @db.Decimal(18, 2)
  balance         Decimal     @db.Decimal(18, 2)  // = original - paid
  
  // Status
  status          ARAPStatus  @default(OPEN)
  
  // Reference
  transaction_id  String?     // Link to original sale
  invoice_number  String?
  
  notes           String?
  
  // Meta
  created_at      DateTime    @default(now())
  updated_at      DateTime    @updatedAt
  
  // Relations
  farm            Farm        @relation(fields: [farm_id], references: [id])
  partner         Partner     @relation(fields: [partner_id], references: [id])
  payments        ARPayment[]
  
  @@unique([farm_id, code])
  @@index([farm_id, partner_id, status])
  @@index([farm_id, due_date])
  @@map("ar_transactions")
}

model ARPayment {
  id              String        @id @default(uuid())
  ar_id           String
  
  payment_date    DateTime      @db.Date
  amount          Decimal       @db.Decimal(18, 2)
  payment_method  String        // CASH, BANK_TRANSFER
  reference       String?
  
  created_at      DateTime      @default(now())
  
  ar_transaction  ARTransaction @relation(fields: [ar_id], references: [id])
  
  @@index([ar_id])
  @@map("ar_payments")
}

// ==========================================
// AP TRANSACTION (CÔNG NỢ PHẢI TRẢ)
// ==========================================

model APTransaction {
  id              String      @id @default(uuid())
  farm_id         String
  partner_id      String
  
  code            String      // AP-2024-0001
  doc_date        DateTime    @db.Date
  due_date        DateTime    @db.Date
  
  original_amount Decimal     @db.Decimal(18, 2)
  paid_amount     Decimal     @default(0) @db.Decimal(18, 2)
  balance         Decimal     @db.Decimal(18, 2)
  
  status          ARAPStatus  @default(OPEN)
  
  transaction_id  String?
  invoice_number  String?
  notes           String?
  
  created_at      DateTime    @default(now())
  updated_at      DateTime    @updatedAt
  
  farm            Farm        @relation(fields: [farm_id], references: [id])
  partner         Partner     @relation(fields: [partner_id], references: [id])
  payments        APPayment[]
  
  @@unique([farm_id, code])
  @@index([farm_id, partner_id, status])
  @@map("ap_transactions")
}

model APPayment {
  id              String        @id @default(uuid())
  ap_id           String
  
  payment_date    DateTime      @db.Date
  amount          Decimal       @db.Decimal(18, 2)
  payment_method  String
  reference       String?
  
  created_at      DateTime      @default(now())
  
  ap_transaction  APTransaction @relation(fields: [ap_id], references: [id])
  
  @@map("ap_payments")
}
```

---

## PHẦN 3: ADDITIONAL SCHEMAS

```prisma
// ==========================================
// PERIOD LOCK (KHÓA SỔ KẾ TOÁN)
// ==========================================

model PeriodLock {
  id          String   @id @default(uuid())
  farm_id     String
  
  year        Int
  month       Int      // 1-12
  
  is_locked   Boolean  @default(false)
  locked_at   DateTime?
  locked_by   String?
  
  created_at  DateTime @default(now())
  
  @@unique([farm_id, year, month])
  @@map("period_locks")
}

// ==========================================
// VAT DECLARATION (TỜ KHAI GTGT)
// ==========================================

enum VATDeclarationStatus {
  DRAFT
  SUBMITTED
  ACCEPTED
  REJECTED
}

model VATDeclaration {
  id              String              @id @default(uuid())
  farm_id         String
  
  period_year     Int
  period_month    Int
  
  // Amounts
  output_vat      Decimal             @db.Decimal(18, 2)  // VAT đầu ra
  input_vat       Decimal             @db.Decimal(18, 2)  // VAT đầu vào
  vat_payable     Decimal             @db.Decimal(18, 2)  // = output - input
  
  status          VATDeclarationStatus @default(DRAFT)
  
  submitted_at    DateTime?
  submission_ref  String?             // Mã nộp tờ khai
  
  created_at      DateTime            @default(now())
  updated_at      DateTime            @updatedAt
  
  @@unique([farm_id, period_year, period_month])
  @@map("vat_declarations")
}

// ==========================================
// AUDIT LOG (NHẬT KÝ HOẠT ĐỘNG)
// ==========================================

model AuditLog {
  id          String   @id @default(uuid())
  farm_id     String
  user_id     String?
  
  action      String   // CREATE, UPDATE, DELETE
  entity      String   // Transaction, Product, etc.
  entity_id   String
  
  old_data    Json?    @db.JsonB
  new_data    Json?    @db.JsonB
  
  ip_address  String?
  user_agent  String?
  
  created_at  DateTime @default(now())
  
  @@index([farm_id, entity, entity_id])
  @@index([farm_id, created_at])
  @@map("audit_logs")
}
```

---

## ✅ CHECKLIST HOÀN THÀNH

### Inventory Schema
- [ ] Stock model với avg_cost, min/max quantities
- [ ] StockMovement model với cost tracking
- [ ] StockMovementType enum
- [ ] Indexes cho performance

### AR/AP Schema
- [ ] ARTransaction model với payment tracking
- [ ] APTransaction model với payment tracking
- [ ] ARPayment, APPayment models
- [ ] ARAPStatus enum

### Additional
- [ ] PeriodLock model
- [ ] VATDeclaration model
- [ ] AuditLog model

### Validation
- [ ] `npx prisma generate` - No errors
- [ ] `npx prisma migrate dev` - Migration applied
- [ ] All relations valid

---

## 🔗 KẾT NỐI VỚI TASKS TIẾP THEO

### Output → Task 2 (Inventory Management)
- `Stock` model
- `StockMovement` model
- Moving average calculation base

### Output → Task 4-5 (AR/AP)
- `ARTransaction`, `APTransaction` models
- Payment allocation models

### Output → Task 8 (VAT Declaration)
- `VATDeclaration` model

### Output → Task 10 (Security)
- `AuditLog` model

---

**Estimated Time:** 5-6 giờ  
**Next Task:** Task 2 - Inventory Management
