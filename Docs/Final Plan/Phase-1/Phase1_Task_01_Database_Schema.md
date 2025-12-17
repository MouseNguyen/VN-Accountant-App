# 📋 PHASE 1 - TASK 1: PROJECT SETUP & DATABASE SCHEMA

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P1-T1 |
| **Tên** | Project Setup & Database Schema |
| **Thời gian** | 3-4 giờ |
| **Phụ thuộc** | Không có (task đầu tiên) |
| **Task tiếp theo** | Task 2 (Authentication) |

---

## 📋 MỤC TIÊU

- Khởi tạo Next.js 14 + TypeScript
- Cấu hình TailwindCSS + Shadcn/UI
- Setup Prisma + PostgreSQL
- Tạo TOÀN BỘ schema (bao gồm các trường dự phòng cho Phase 2+)
- Seed data: Accounts, Tax Rates, Tax Rules

---

## PHẦN 1: PROJECT SETUP

### 1.1 Commands Khởi Tạo

```bash
# Tạo Next.js project
npx create-next-app@14 laba-erp --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

cd laba-erp

# Cài đặt dependencies chính
npm install @prisma/client bcryptjs jsonwebtoken zustand @tanstack/react-query zod date-fns recharts

# Dev dependencies
npm install -D prisma @types/bcryptjs @types/jsonwebtoken

# Shadcn/UI
npx shadcn@latest init -y
npx shadcn@latest add button card input form dialog sheet toast table select checkbox tabs badge alert

# Database
npx prisma init
```

### 1.2 Cấu trúc thư mục

```
laba-erp/
├── prisma/
│   ├── schema.prisma
│   ├── seed/
│   │   ├── index.ts
│   │   ├── accounts.ts
│   │   └── tax-rates.ts
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── api/
│   │   ├── (auth)/
│   │   └── (dashboard)/
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   ├── types/
│   └── config/
└── public/
```

---

## PHẦN 2: PRISMA SCHEMA

### 2.1 Core Models (Farm, User)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==========================================
// ENUMS
// ==========================================

enum BusinessType {
  FARM          // Nông trại
  RETAIL_FNB    // F&B / Bán lẻ
}

enum UserRole {
  OWNER
  STAFF
  ACCOUNTANT
}

enum TransactionType {
  CASH_IN           // Thu tiền
  CASH_OUT          // Chi tiền
  BANK_TRANSFER     // Chuyển khoản
  SALE              // Bán hàng
  PURCHASE          // Mua hàng
  PAYROLL           // Trả lương
  // Phase 2+
  STOCK_IN          // Nhập kho
  STOCK_OUT         // Xuất kho
  AR_PAYMENT        // Thu công nợ
  AP_PAYMENT        // Trả công nợ
  VAT_PAYMENT       // Nộp thuế
}

enum PaymentMethod {
  CASH
  BANK_TRANSFER
  CREDIT          // Công nợ
}

// ==========================================
// FARM & USER
// ==========================================

model Farm {
  id              String       @id @default(uuid())
  
  // Thông tin cơ bản
  name            String       // Tên nông trại
  business_type   BusinessType @default(FARM)
  
  // Thông tin thuế
  tax_code        String?      // Mã số thuế
  address         String?
  phone           String?
  
  // Cấu hình
  fiscal_year_start Int        @default(1)  // Tháng bắt đầu năm tài chính
  currency        String       @default("VND")
  
  // Meta
  created_at      DateTime     @default(now())
  updated_at      DateTime     @updatedAt
  
  // Relations
  users           User[]
  products        Product[]
  partners        Partner[]
  transactions    Transaction[]
  workers         Worker[]
  accounts        Account[]
  
  @@map("farms")
}

model User {
  id              String    @id @default(uuid())
  farm_id         String
  
  // Thông tin đăng nhập
  email           String    @unique
  password        String
  
  // Thông tin cá nhân
  name            String
  phone           String?
  avatar_url      String?
  
  // Quyền
  role            UserRole  @default(STAFF)
  is_active       Boolean   @default(true)
  
  // Meta
  last_login      DateTime?
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt
  
  // Relations
  farm            Farm      @relation(fields: [farm_id], references: [id])
  
  @@index([farm_id])
  @@map("users")
}
```

### 2.2 Master Data Models (Product, Partner)

```prisma
// ==========================================
// PRODUCT (Sản phẩm / Nông sản)
// ==========================================

model Product {
  id              String    @id @default(uuid())
  farm_id         String
  
  code            String    // SP001
  name            String
  description     String?
  
  // Đơn vị
  unit            String    @default("kg")
  
  // Giá mặc định
  default_price   Decimal   @default(0) @db.Decimal(18, 2)
  
  // Thuế
  vat_rate        Decimal   @default(0) @db.Decimal(5, 2)  // 0, 5, 10
  
  // Phân loại
  category        String?
  
  // Trạng thái
  is_active       Boolean   @default(true)
  
  // Meta
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt
  
  // Relations
  farm            Farm      @relation(fields: [farm_id], references: [id])
  transaction_items TransactionItem[]
  
  @@unique([farm_id, code])
  @@index([farm_id, is_active])
  @@map("products")
}

// ==========================================
// PARTNER (Khách hàng / Nhà cung cấp)
// ==========================================

model Partner {
  id              String    @id @default(uuid())
  farm_id         String
  
  code            String    // KH001, NCC001
  name            String
  phone           String?
  address         String?
  
  // Thuế (quan trọng cho Phase 2 VAT)
  tax_code        String?   // Mã số thuế
  
  // Loại đối tác
  is_customer     Boolean   @default(true)
  is_supplier     Boolean   @default(false)
  
  // Công nợ (tracking đơn giản Phase 1)
  credit_limit    Decimal?  @db.Decimal(18, 2)
  balance_ar      Decimal   @default(0) @db.Decimal(18, 2)  // Phải thu
  balance_ap      Decimal   @default(0) @db.Decimal(18, 2)  // Phải trả
  
  // Trạng thái
  is_active       Boolean   @default(true)
  
  // Meta
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt
  
  // Relations
  farm            Farm      @relation(fields: [farm_id], references: [id])
  transactions    Transaction[]
  
  @@unique([farm_id, code])
  @@index([farm_id, is_customer])
  @@index([farm_id, is_supplier])
  @@map("partners")
}
```

### 2.3 Transaction Models

```prisma
// ==========================================
// TRANSACTION (Giao dịch)
// ==========================================

model Transaction {
  id              String           @id @default(uuid())
  farm_id         String
  
  // Loại và mã
  type            TransactionType
  code            String           // PT-2024-0001, PC-2024-0001
  
  // Thời gian
  trans_date      DateTime         @db.Date
  
  // Đối tác (optional)
  partner_id      String?
  
  // Tài khoản
  account_id      String?          // Tài khoản kế toán
  from_account_id String?          // Cho chuyển khoản
  to_account_id   String?          // Cho chuyển khoản
  
  // Số tiền
  amount          Decimal          @db.Decimal(18, 2)
  
  // VAT (Phase 1 ghi nhận, Phase 2 tính toán)
  vat_rate        Decimal          @default(0) @db.Decimal(5, 2)
  vat_amount      Decimal          @default(0) @db.Decimal(18, 2)
  
  // Phương thức
  payment_method  PaymentMethod    @default(CASH)
  
  // Mô tả
  description     String?
  notes           String?
  
  // Chứng từ
  ref_number      String?          // Số hóa đơn/chứng từ
  attachment_url  String?          // Ảnh hóa đơn
  
  // Phase 2+ fields (dự phòng)
  is_posted       Boolean          @default(true)  // Đã ghi sổ
  cogs            Decimal?         @db.Decimal(18, 2)  // Giá vốn
  
  // Meta
  created_at      DateTime         @default(now())
  updated_at      DateTime         @updatedAt
  created_by      String?
  
  // Relations
  farm            Farm             @relation(fields: [farm_id], references: [id])
  partner         Partner?         @relation(fields: [partner_id], references: [id])
  account         Account?         @relation("MainAccount", fields: [account_id], references: [id])
  items           TransactionItem[]
  
  @@unique([farm_id, code])
  @@index([farm_id, type, trans_date])
  @@index([farm_id, partner_id])
  @@map("transactions")
}

model TransactionItem {
  id              String      @id @default(uuid())
  transaction_id  String
  
  product_id      String
  
  // Số lượng và giá
  quantity        Decimal     @db.Decimal(18, 3)
  unit            String      @default("kg")
  unit_price      Decimal     @db.Decimal(18, 2)
  
  // Tổng tiền
  amount          Decimal     @db.Decimal(18, 2)  // = quantity * unit_price
  
  // VAT
  vat_rate        Decimal     @default(0) @db.Decimal(5, 2)
  vat_amount      Decimal     @default(0) @db.Decimal(18, 2)
  
  // Meta
  created_at      DateTime    @default(now())
  
  // Relations
  transaction     Transaction @relation(fields: [transaction_id], references: [id], onDelete: Cascade)
  product         Product     @relation(fields: [product_id], references: [id])
  
  @@index([transaction_id])
  @@map("transaction_items")
}
```

### 2.4 Worker & WorkLog Models (Nhân công thời vụ)

```prisma
// ==========================================
// WORKER (Nhân công thời vụ)
// ==========================================

model Worker {
  id              String    @id @default(uuid())
  farm_id         String
  
  // Thông tin cơ bản
  code            String    // TH001
  name            String
  phone           String?
  id_number       String?   // CCCD
  address         String?
  
  // Hợp đồng
  has_contract    Boolean   @default(false)  // Có HĐ giao khoán
  contract_url    String?                     // File HĐ
  
  // Cam kết thuế
  has_tax_commitment Boolean @default(false) // Có mẫu 02/CK-TNCN
  tax_commitment_url String?
  
  // Lương
  daily_rate      Decimal   @default(0) @db.Decimal(18, 2)  // Công/ngày
  
  // Tracking
  total_days      Decimal   @default(0) @db.Decimal(10, 2)  // Tổng ngày công
  total_paid      Decimal   @default(0) @db.Decimal(18, 2)  // Tổng đã trả
  balance         Decimal   @default(0) @db.Decimal(18, 2)  // Còn phải trả
  
  // Trạng thái
  is_active       Boolean   @default(true)
  
  // Meta
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt
  
  // Relations
  farm            Farm      @relation(fields: [farm_id], references: [id])
  work_logs       WorkLog[]
  
  @@unique([farm_id, code])
  @@index([farm_id, is_active])
  @@map("workers")
}

model WorkLog {
  id              String    @id @default(uuid())
  farm_id         String
  worker_id       String
  
  // Ngày làm việc
  work_date       DateTime  @db.Date
  
  // Số công (0.5, 1, 1.5, ...)
  work_units      Decimal   @default(1) @db.Decimal(5, 2)
  
  // Công việc
  description     String?
  
  // Ghi chú
  notes           String?
  
  // Meta
  created_at      DateTime  @default(now())
  created_by      String?
  
  // Relations
  worker          Worker    @relation(fields: [worker_id], references: [id])
  
  @@unique([worker_id, work_date])
  @@index([farm_id, work_date])
  @@map("work_logs")
}
```

### 2.5 Account & Invoice Models

```prisma
// ==========================================
// ACCOUNT (Hệ thống tài khoản kế toán)
// ==========================================

model Account {
  id              String    @id @default(uuid())
  farm_id         String
  
  // Mã và tên
  code            String    // 111, 112, 131, 331, 511, ...
  name            String
  name_en         String?
  
  // Phân loại
  type            String    // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  parent_code     String?   // Tài khoản cha
  level           Int       @default(1)
  
  // Số dư
  opening_balance Decimal   @default(0) @db.Decimal(18, 2)
  current_balance Decimal   @default(0) @db.Decimal(18, 2)
  
  // Trạng thái
  is_active       Boolean   @default(true)
  is_system       Boolean   @default(false)  // Tài khoản hệ thống
  
  // Meta
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt
  
  // Relations
  farm            Farm      @relation(fields: [farm_id], references: [id])
  transactions    Transaction[] @relation("MainAccount")
  
  @@unique([farm_id, code])
  @@index([farm_id, type])
  @@map("accounts")
}

// ==========================================
// INVOICE (Hóa đơn - cho OCR)
// ==========================================

model Invoice {
  id              String    @id @default(uuid())
  farm_id         String
  
  // Ảnh gốc
  image_url       String
  
  // OCR Result
  ocr_status      String    @default("PENDING")  // PENDING, PROCESSING, DONE, FAILED
  ocr_result      Json?     @db.JsonB
  
  // Extracted data
  vendor_name     String?
  vendor_tax_code String?
  invoice_number  String?
  invoice_date    DateTime? @db.Date
  total_amount    Decimal?  @db.Decimal(18, 2)
  vat_amount      Decimal?  @db.Decimal(18, 2)
  
  // Linked transaction
  transaction_id  String?
  
  // Meta
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt
  
  @@index([farm_id, ocr_status])
  @@map("invoices")
}
```

### 2.6 TaxRate Model (Seed Data)

```prisma
// ==========================================
// TAX RATE (Thuế suất)
// ==========================================

model TaxRate {
  id              String    @id @default(uuid())
  farm_id         String?   // null = system default
  
  // Loại thuế
  type            String    // VAT, PIT, CIT
  code            String    // VAT_10, VAT_5, PIT_THRESHOLD
  name            String
  
  // Giá trị
  rate            Decimal   @db.Decimal(10, 4)  // 0.10, 0.05, ...
  fixed_amount    Decimal?  @db.Decimal(18, 2)  // Số cố định (2tr cho PIT)
  
  // Hiệu lực
  effective_from  DateTime  @db.Date
  effective_to    DateTime? @db.Date
  
  // Meta
  is_active       Boolean   @default(true)
  created_at      DateTime  @default(now())
  
  @@unique([farm_id, type, code])
  @@map("tax_rates")
}
```

---

## PHẦN 3: SEED DATA

### 3.1 Account Chart (Hệ thống tài khoản)

```typescript
// prisma/seed/accounts.ts

export const accountChart = [
  // Loại 1: Tài sản ngắn hạn
  { code: '111', name: 'Tiền mặt', type: 'ASSET', level: 1 },
  { code: '1111', name: 'Tiền Việt Nam', type: 'ASSET', level: 2, parent_code: '111' },
  { code: '112', name: 'Tiền gửi ngân hàng', type: 'ASSET', level: 1 },
  { code: '1121', name: 'Tiền Việt Nam', type: 'ASSET', level: 2, parent_code: '112' },
  { code: '131', name: 'Phải thu khách hàng', type: 'ASSET', level: 1 },
  { code: '133', name: 'Thuế GTGT được khấu trừ', type: 'ASSET', level: 1 },
  { code: '1331', name: 'Thuế GTGT đầu vào', type: 'ASSET', level: 2, parent_code: '133' },
  { code: '152', name: 'Nguyên liệu, vật liệu', type: 'ASSET', level: 1 },
  { code: '154', name: 'Chi phí SXKD dở dang', type: 'ASSET', level: 1 },
  { code: '156', name: 'Hàng hóa', type: 'ASSET', level: 1 },
  
  // Loại 2: Tài sản dài hạn
  { code: '211', name: 'Tài sản cố định hữu hình', type: 'ASSET', level: 1 },
  { code: '214', name: 'Hao mòn TSCĐ', type: 'CONTRA_ASSET', level: 1 },
  { code: '242', name: 'Chi phí trả trước', type: 'ASSET', level: 1 },
  
  // Loại 3: Nợ phải trả
  { code: '331', name: 'Phải trả nhà cung cấp', type: 'LIABILITY', level: 1 },
  { code: '333', name: 'Thuế và các khoản phải nộp', type: 'LIABILITY', level: 1 },
  { code: '3331', name: 'Thuế GTGT phải nộp', type: 'LIABILITY', level: 2, parent_code: '333' },
  { code: '33311', name: 'Thuế GTGT đầu ra', type: 'LIABILITY', level: 3, parent_code: '3331' },
  { code: '3334', name: 'Thuế TNDN', type: 'LIABILITY', level: 2, parent_code: '333' },
  { code: '3335', name: 'Thuế TNCN', type: 'LIABILITY', level: 2, parent_code: '333' },
  { code: '334', name: 'Phải trả người lao động', type: 'LIABILITY', level: 1 },
  { code: '338', name: 'Phải trả khác', type: 'LIABILITY', level: 1 },
  
  // Loại 4: Vốn chủ sở hữu
  { code: '411', name: 'Vốn đầu tư của chủ sở hữu', type: 'EQUITY', level: 1 },
  { code: '421', name: 'Lợi nhuận sau thuế chưa phân phối', type: 'EQUITY', level: 1 },
  
  // Loại 5: Doanh thu
  { code: '511', name: 'Doanh thu bán hàng', type: 'REVENUE', level: 1 },
  { code: '515', name: 'Doanh thu tài chính', type: 'REVENUE', level: 1 },
  { code: '521', name: 'Các khoản giảm trừ doanh thu', type: 'CONTRA_REVENUE', level: 1 },
  { code: '711', name: 'Thu nhập khác', type: 'REVENUE', level: 1 },
  
  // Loại 6: Chi phí
  { code: '621', name: 'Chi phí nguyên vật liệu trực tiếp', type: 'EXPENSE', level: 1 },
  { code: '622', name: 'Chi phí nhân công trực tiếp', type: 'EXPENSE', level: 1 },
  { code: '627', name: 'Chi phí sản xuất chung', type: 'EXPENSE', level: 1 },
  { code: '632', name: 'Giá vốn hàng bán', type: 'EXPENSE', level: 1 },
  { code: '635', name: 'Chi phí tài chính', type: 'EXPENSE', level: 1 },
  { code: '641', name: 'Chi phí bán hàng', type: 'EXPENSE', level: 1 },
  { code: '642', name: 'Chi phí quản lý doanh nghiệp', type: 'EXPENSE', level: 1 },
  { code: '811', name: 'Chi phí khác', type: 'EXPENSE', level: 1 },
  { code: '821', name: 'Chi phí thuế TNDN', type: 'EXPENSE', level: 1 },
];
```

### 3.2 Tax Rates

```typescript
// prisma/seed/tax-rates.ts

export const taxRates = [
  // VAT
  { type: 'VAT', code: 'VAT_10', name: 'VAT 10%', rate: 0.10 },
  { type: 'VAT', code: 'VAT_8', name: 'VAT 8%', rate: 0.08 },
  { type: 'VAT', code: 'VAT_5', name: 'VAT 5%', rate: 0.05 },
  { type: 'VAT', code: 'VAT_0', name: 'VAT 0%', rate: 0.00 },
  
  // PIT thresholds
  { type: 'PIT', code: 'PIT_THRESHOLD', name: 'Ngưỡng khấu trừ 10%', rate: 0.10, fixed_amount: 2000000 },
  { type: 'PIT', code: 'PIT_DEDUCTION_SELF', name: 'Giảm trừ bản thân', rate: 0, fixed_amount: 11000000 },
  { type: 'PIT', code: 'PIT_DEDUCTION_DEP', name: 'Giảm trừ người phụ thuộc', rate: 0, fixed_amount: 4400000 },
  
  // BHXH rates
  { type: 'BHXH', code: 'BHXH_EMP', name: 'BHXH người lao động', rate: 0.08 },
  { type: 'BHXH', code: 'BHYT_EMP', name: 'BHYT người lao động', rate: 0.015 },
  { type: 'BHXH', code: 'BHTN_EMP', name: 'BHTN người lao động', rate: 0.01 },
];
```

### 3.3 Seed Index

```typescript
// prisma/seed/index.ts

import { PrismaClient } from '@prisma/client'
import { accountChart } from './accounts'
import { taxRates } from './tax-rates'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')
  
  // Seed Tax Rates (system-wide, farm_id = null)
  for (const tax of taxRates) {
    await prisma.taxRate.upsert({
      where: { farm_id_type_code: { farm_id: null, type: tax.type, code: tax.code } },
      update: {},
      create: {
        ...tax,
        effective_from: new Date('2024-01-01'),
      },
    })
  }
  console.log('✅ Tax rates seeded')
  
  console.log('🎉 Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

---

## PHẦN 4: ENVIRONMENT & CONFIG

### 4.1 .env.example

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/laba_erp?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Next.js
NEXT_PUBLIC_API_URL="http://localhost:3000"

# Google Cloud Vision (Task 9)
GOOGLE_CLOUD_PROJECT_ID=""
GOOGLE_CLOUD_CREDENTIALS=""
```

### 4.2 package.json scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "prisma:generate": "prisma generate",
    "prisma:push": "prisma db push",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "ts-node prisma/seed/index.ts",
    "prisma:studio": "prisma studio",
    "db:reset": "prisma migrate reset --force && npm run prisma:seed"
  }
}
```

---

## ✅ CHECKLIST HOÀN THÀNH

### Project Setup
- [ ] Next.js 14 + TypeScript initialized
- [ ] TailwindCSS configured
- [ ] Shadcn/UI components added
- [ ] Folder structure created

### Database
- [ ] Prisma schema complete
- [ ] All enums defined
- [ ] Farm, User models
- [ ] Product, Partner models
- [ ] Transaction, TransactionItem models
- [ ] Worker, WorkLog models
- [ ] Account model
- [ ] Invoice model (for OCR)
- [ ] TaxRate model

### Seed Data
- [ ] Account chart (40+ accounts)
- [ ] Tax rates (VAT, PIT, BHXH)
- [ ] Seed script working

### Validation
- [ ] `npx prisma generate` - No errors
- [ ] `npx prisma db push` - Schema applied
- [ ] `npm run prisma:seed` - Data seeded
- [ ] `npm run dev` - App starts

---

## 🔗 KẾT NỐI VỚI TASK TIẾP THEO

### Output → Task 2 (Authentication)
- `User` model với email, password fields
- `Farm` model cho multi-tenant

### Output → Task 4 (Products & Partners)
- `Product` model
- `Partner` model

### Output → Task 5 (Transactions)
- `Transaction` model
- `TransactionItem` model
- `Account` model với chart of accounts

### Output → Task 7 (Workers)
- `Worker` model
- `WorkLog` model

---

**Estimated Time:** 3-4 giờ  
**Next Task:** Task 2 - Authentication
