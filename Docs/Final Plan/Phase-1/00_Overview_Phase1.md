# 📋 LABA ERP - PHASE 1: TỔNG QUAN

## Tài Liệu Hướng Dẫn Phát Triển MVP

**Phiên bản:** 1.0  
**Ngày tạo:** 10/12/2024  
**Tác giả:** LABA Team  
**Mục đích:** Tổng quan kiến trúc và kế hoạch phát triển Phase 1

---

## 📑 MỤC LỤC

1. [Giới Thiệu Dự Án](#1-giới-thiệu-dự-án)
2. [Đối Tượng Người Dùng](#2-đối-tượng-người-dùng)
3. [Nguyên Tắc Thiết Kế UX](#3-nguyên-tắc-thiết-kế-ux)
4. [Tech Stack](#4-tech-stack)
5. [Cấu Trúc Thư Mục](#5-cấu-trúc-thư-mục)
6. [Danh Sách Tasks](#6-danh-sách-tasks)
7. [Sơ Đồ Dependencies](#7-sơ-đồ-dependencies)
8. [Quy Ước Code](#8-quy-ước-code)
9. [Hướng Dẫn Sử Dụng Prompts](#9-hướng-dẫn-sử-dụng-prompts)

---

## 1. GIỚI THIỆU DỰ ÁN

### 1.1 LABA ERP là gì?

**LABA ERP** là hệ thống quản lý tài chính mini dành cho:
- 🌾 **Nông trại** (FARM): Trồng trọt, chăn nuôi, thủy sản
- ☕ **F&B / Bán lẻ** (RETAIL_FNB): Cafe, nhà hàng, cửa hàng nhỏ

### 1.2 Mục Tiêu Phase 1 (MVP)

Xây dựng phiên bản đầu tiên có thể sử dụng được với các chức năng cơ bản:

| STT | Chức năng | Mô tả |
|-----|-----------|-------|
| 1 | **Quản lý Tiền** | Thu tiền, Chi tiền, Chuyển khoản |
| 2 | **Bán hàng** | Bán nông sản / Bán hàng hóa |
| 3 | **Mua hàng** | Mua vật tư / Nhập hàng + Công nợ NCC |
| 4 | **Nhân công** | Quản lý thợ, Chấm công, Trả lương, Thuế TNCN |
| 5 | **Dashboard** | Tổng quan thu chi, Báo cáo cơ bản |
| 6 | **OCR** | Scan hóa đơn tự động nhập liệu |

### 1.3 Phạm Vi KHÔNG bao gồm (Phase 2+)

- ❌ Quản lý kho chi tiết (tồn kho, kiểm kê)
- ❌ Báo cáo thuế VAT/TNDN phức tạp
- ❌ PWA Offline
- ❌ Hóa đơn điện tử (VNPT/Viettel)
- ❌ Multi-user cho 1 farm

---

## 2. ĐỐI TƯỢNG NGƯỜI DÙNG

### 2.1 Persona Chính

```
👤 Chú Năm - Chủ nông trại rau sạch

Tuổi: 58 tuổi
Địa điểm: Đà Lạt, Lâm Đồng
Doanh thu: ~500 triệu/năm
Công nghệ: Dùng smartphone cơ bản, hay dùng Zalo

Nỗi đau:
- Ghi sổ tay, hay quên, hay mất
- Không biết lãi lỗ thật sự bao nhiêu
- Cuối năm lo quyết toán thuế, không có chứng từ

Mong muốn:
- App đơn giản như ghi sổ tay
- Nhìn được tổng quan tiền bạc
- Có đủ giấy tờ khi thuế hỏi
```

### 2.2 Đặc Điểm Người Dùng

| Đặc điểm | Chi tiết |
|----------|----------|
| **Độ tuổi** | 45-70 tuổi |
| **Trình độ CN** | Thấp - Trung bình |
| **Thiết bị** | Smartphone Android giá rẻ |
| **Thói quen** | Dùng Zalo, Facebook |
| **Ngôn ngữ** | Tiếng Việt 100% |
| **Thời gian** | Bận rộn, ít thời gian học app mới |

---

## 3. NGUYÊN TẮC THIẾT KẾ UX

### 3.1 Mobile-First

```
✅ Thiết kế cho màn hình 375px trước
✅ Sau đó mở rộng cho tablet/desktop
✅ Touch-friendly (vùng chạm đủ lớn)
```

### 3.2 Quy Tắc "3 Bước"

```
Mọi tác vụ phải hoàn thành trong TỐI ĐA 3 bước

Ví dụ - Ghi thu tiền:
Bước 1: Bấm nút "Thu tiền"
Bước 2: Nhập số tiền + chọn người
Bước 3: Bấm "Lưu"
→ XONG!
```

### 3.3 Kích Thước Tối Thiểu

| Thành phần | Kích thước |
|------------|------------|
| **Font body** | 16px (1rem) |
| **Font heading** | 20px - 24px |
| **Button height** | 48px minimum |
| **Touch target** | 44px × 44px minimum |
| **Input height** | 48px minimum |
| **Spacing** | 16px (1rem) cơ bản |

### 3.4 Màu Sắc

```css
/* Màu chính */
--primary: #16a34a;        /* Xanh lá - Nông nghiệp */
--primary-dark: #15803d;

/* Màu phụ */
--success: #22c55e;        /* Xanh - Thu tiền */
--danger: #ef4444;         /* Đỏ - Chi tiền */
--warning: #f59e0b;        /* Cam - Cảnh báo */
--info: #3b82f6;           /* Xanh dương - Thông tin */

/* Nền */
--background: #f9fafb;
--card: #ffffff;
--border: #e5e7eb;

/* Text */
--text-primary: #111827;
--text-secondary: #6b7280;
--text-muted: #9ca3af;
```

### 3.5 Nguyên Tắc Khác

| Nguyên tắc | Chi tiết |
|------------|----------|
| **Không viết tắt** | "Nhà cung cấp" thay vì "NCC" |
| **Tiếng Việt 100%** | Tất cả UI bằng tiếng Việt |
| **Icon + Text** | Luôn có text đi kèm icon |
| **Feedback rõ ràng** | Toast/Alert sau mỗi action |
| **Confirm xóa** | Luôn hỏi trước khi xóa |
| **Auto-save draft** | Tự lưu nháp tránh mất data |

---

## 4. TECH STACK

### 4.1 Frontend

| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|----------|
| **Next.js** | 14+ | Framework React với App Router |
| **TypeScript** | 5+ | Type safety |
| **TailwindCSS** | 3+ | Styling |
| **Shadcn/UI** | Latest | UI Components |
| **Zustand** | 4+ | State management đơn giản |
| **TanStack Query** | 5+ | Data fetching & caching |
| **React Hook Form** | 7+ | Form handling |
| **Zod** | 3+ | Validation |
| **Recharts** | 2+ | Charts |
| **date-fns** | 3+ | Date utilities |

### 4.2 Backend

| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|----------|
| **Next.js API Routes** | 14+ | REST API |
| **Prisma** | 5+ | ORM |
| **PostgreSQL** | 16 | Database |
| **JWT** | - | Authentication |
| **bcrypt** | - | Password hashing |

### 4.3 Cloud Services

| Dịch vụ | Mục đích |
|---------|----------|
| **Vercel** | Hosting Frontend + API |
| **Supabase / Railway** | PostgreSQL Database |
| **Cloudflare R2 / AWS S3** | File storage (ảnh chứng từ) |
| **Google Cloud Vision** | OCR (Task 9) |

### 4.4 Development Tools

| Tool | Mục đích |
|------|----------|
| **VS Code** | IDE |
| **Prisma Studio** | Database GUI |
| **Postman / Insomnia** | API testing |
| **Git + GitHub** | Version control |

---

## 5. CẤU TRÚC THƯ MỤC

```
laba-erp/
│
├── 📁 src/
│   ├── 📁 app/                      # Next.js App Router
│   │   ├── 📁 (auth)/               # Auth pages (không có layout)
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   │
│   │   ├── 📁 (dashboard)/          # Main app (có layout chung)
│   │   │   ├── layout.tsx           # Dashboard layout
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx         # Trang chủ
│   │   │   ├── tien/
│   │   │   │   ├── page.tsx         # Danh sách thu chi
│   │   │   │   ├── thu-tien/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── chi-tien/
│   │   │   │       └── page.tsx
│   │   │   ├── ban-hang/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── mua-hang/
│   │   │   │   ├── page.tsx
│   │   │   │   └── tra-no/          # Trả nợ NCC
│   │   │   │       └── page.tsx
│   │   │   ├── nhan-cong/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── cham-cong/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── tra-luong/
│   │   │   │       └── page.tsx
│   │   │   ├── bao-cao/
│   │   │   │   └── page.tsx
│   │   │   └── cai-dat/
│   │   │       ├── page.tsx
│   │   │       ├── ca-nhan/
│   │   │       ├── nong-trai/
│   │   │       ├── san-pham/
│   │   │       └── doi-tac/
│   │   │
│   │   ├── 📁 api/                  # API Routes
│   │   │   ├── auth/
│   │   │   │   ├── register/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── login/
│   │   │   │   │   └── route.ts
│   │   │   │   └── me/
│   │   │   │       └── route.ts
│   │   │   ├── farms/
│   │   │   │   └── route.ts
│   │   │   ├── products/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   ├── partners/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   ├── transactions/
│   │   │   │   ├── route.ts
│   │   │   │   ├── [id]/
│   │   │   │   │   └── route.ts
│   │   │   │   └── summary/
│   │   │   │       └── route.ts
│   │   │   ├── workers/
│   │   │   │   ├── route.ts
│   │   │   │   ├── [id]/
│   │   │   │   │   └── route.ts
│   │   │   │   └── pay/
│   │   │   │       └── route.ts
│   │   │   ├── work-logs/
│   │   │   │   ├── route.ts
│   │   │   │   └── batch/
│   │   │   │       └── route.ts
│   │   │   ├── payables/            # Công nợ NCC
│   │   │   │   ├── route.ts
│   │   │   │   └── pay/
│   │   │   │       └── route.ts
│   │   │   ├── dashboard/
│   │   │   │   └── route.ts
│   │   │   └── ocr/
│   │   │       └── route.ts
│   │   │
│   │   ├── layout.tsx               # Root layout
│   │   ├── page.tsx                 # Landing page
│   │   └── globals.css
│   │
│   ├── 📁 components/
│   │   ├── 📁 ui/                   # Shadcn components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── table.tsx
│   │   │   ├── form.tsx
│   │   │   ├── select.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── radio-group.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── skeleton.tsx
│   │   │   └── ... 
│   │   │
│   │   ├── 📁 layouts/
│   │   │   ├── dashboard-layout.tsx
│   │   │   ├── header.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── mobile-nav.tsx
│   │   │   └── bottom-nav.tsx
│   │   │
│   │   ├── 📁 forms/
│   │   │   ├── transaction-form.tsx
│   │   │   ├── product-form.tsx
│   │   │   ├── partner-form.tsx
│   │   │   ├── worker-form.tsx
│   │   │   └── login-form.tsx
│   │   │
│   │   ├── 📁 shared/
│   │   │   ├── loading.tsx
│   │   │   ├── empty-state.tsx
│   │   │   ├── error-boundary.tsx
│   │   │   ├── confirm-dialog.tsx
│   │   │   ├── money-input.tsx
│   │   │   ├── date-picker.tsx
│   │   │   ├── search-input.tsx
│   │   │   ├── stat-card.tsx
│   │   │   ├── page-header.tsx
│   │   │   └── partner-combobox.tsx
│   │   │
│   │   └── 📁 features/
│   │       ├── 📁 transactions/
│   │       │   ├── transaction-card.tsx
│   │       │   ├── transaction-list.tsx
│   │       │   └── transaction-detail.tsx
│   │       ├── 📁 workers/
│   │       │   ├── worker-card.tsx
│   │       │   ├── attendance-checkbox.tsx
│   │       │   ├── pay-worker-sheet.tsx
│   │       │   └── work-log-item.tsx
│   │       ├── 📁 products/
│   │       │   ├── product-card.tsx
│   │       │   ├── product-picker.tsx
│   │       │   └── product-line-item.tsx
│   │       └── 📁 dashboard/
│   │           ├── summary-cards.tsx
│   │           ├── revenue-chart.tsx
│   │           └── quick-actions.tsx
│   │
│   ├── 📁 lib/
│   │   ├── prisma.ts                # Prisma client
│   │   ├── auth.ts                  # JWT helpers
│   │   ├── utils.ts                 # General utilities
│   │   ├── constants.ts             # App constants
│   │   ├── api-client.ts            # Fetch wrapper
│   │   └── 📁 validations/
│   │       ├── auth.ts
│   │       ├── transaction.ts
│   │       ├── product.ts
│   │       ├── partner.ts
│   │       └── worker.ts
│   │
│   ├── 📁 hooks/
│   │   ├── use-auth.ts
│   │   ├── use-farm.ts
│   │   ├── use-label.ts             # Dynamic labels
│   │   ├── use-transactions.ts
│   │   ├── use-products.ts
│   │   ├── use-partners.ts
│   │   ├── use-workers.ts
│   │   ├── use-dashboard.ts
│   │   └── use-debounce.ts
│   │
│   ├── 📁 config/
│   │   ├── site.ts                  # Site metadata
│   │   ├── labels.ts                # Dynamic labels (FARM vs F&B)
│   │   └── navigation.ts            # Nav items
│   │
│   ├── 📁 types/
│   │   ├── index.ts                 # Export all types
│   │   ├── auth.ts
│   │   ├── farm.ts
│   │   ├── transaction.ts
│   │   ├── product.ts
│   │   ├── partner.ts
│   │   └── worker.ts
│   │
│   ├── 📁 templates/                # HTML templates để in
│   │   ├── contract.html            # Hợp đồng giao khoán (Mẫu 08)
│   │   ├── tax-commitment.html      # Cam kết thuế (02/CK-TNCN)
│   │   └── payroll-sheet.html       # Bảng thanh toán lương (Mẫu 05)
│   │
│   └── 📁 stores/                   # Zustand stores
│       ├── auth-store.ts
│       └── app-store.ts
│
├── 📁 prisma/
│   ├── schema.prisma                # Database schema
│   ├── 📁 migrations/               # DB migrations
│   └── 📁 seed/
│       ├── index.ts                 # Main seed file
│       ├── accounts.ts              # Hệ thống tài khoản
│       ├── tax-rates.ts             # Thuế suất
│       └── tax-rules.ts             # Quy tắc thuế
│
├── 📁 public/
│   ├── 📁 icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── 📁 images/
│       └── logo.svg
│
├── .env.example                     # Environment variables template
├── .env.local                       # Local env (git ignored)
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── postcss.config.js
├── components.json                  # Shadcn config
└── README.md
```

---

## 6. DANH SÁCH TASKS

### 6.1 Tổng Quan 9 Tasks

| Task | Tên | Mô tả | Thời gian |
|------|-----|-------|-----------|
| **1** | Setup Project & Database | Khởi tạo Next.js, Prisma, Schema đầy đủ | 3-4 giờ |
| **2** | Authentication | Đăng ký (chọn business type), Đăng nhập | 3-4 giờ |
| **3** | Farm & User + Labels | Quản lý thông tin farm, Dynamic labels | 2-3 giờ |
| **4** | Products & Partners | CRUD Sản phẩm, Đối tác | 4-5 giờ |
| **5** | Transactions Thu/Chi | Phiếu thu, Phiếu chi đơn giản | 5-6 giờ |
| **6** | Bán hàng / Mua hàng | Bán hàng, Mua hàng + Công nợ NCC | 7-9 giờ |
| **7** | Workers & Payroll | Nhân công, Chấm công, Trả lương, Thuế TNCN | 6-8 giờ |
| **8** | Dashboard & Reports | Tổng quan, Báo cáo cơ bản | 4-5 giờ |
| **9** | OCR Integration | Scan hóa đơn với Google Vision | 4-5 giờ |

**Tổng thời gian ước tính:** 38-49 giờ (~1-1.5 tuần)

### 6.2 Chi Tiết Từng Task

#### Task 1: Setup Project & Database Schema
- Khởi tạo Next.js 14 + TypeScript
- Cài đặt TailwindCSS, Shadcn/UI
- Cấu hình Prisma + PostgreSQL
- Tạo TOÀN BỘ schema (bao gồm các trường nâng cao cho Phase 2+)
- Seed data: Accounts, Tax Rates, Tax Rules

#### Task 2: Authentication
- API: Register, Login, Logout, Get Me
- UI: Trang Đăng ký (có chọn Business Type), Trang Đăng nhập
- JWT token management
- Protected routes middleware

#### Task 3: Farm & User Management + Dynamic Labels
- API: Get/Update Farm, Get/Update User
- UI: Trang Cài đặt, Thông tin cá nhân, Thông tin nông trại
- Config labels động (FARM vs RETAIL_FNB)
- Hook useLabel()

#### Task 4: Products & Partners
- API: CRUD Products, CRUD Partners
- UI: Danh sách SP, Thêm/Sửa SP, Danh sách Đối tác, Thêm/Sửa Đối tác
- Search, Filter, Pagination

#### Task 5: Transactions - Thu/Chi tiền
- API: CRUD Transactions (CASH_IN, CASH_OUT)
- UI: Danh sách Thu Chi, Form Thu tiền, Form Chi tiền
- Tự động sinh số chứng từ
- Màn hình thành công + Chia sẻ

#### Task 6: Bán hàng / Mua hàng + Công nợ
- API: SALE, PURCHASE với nhiều items
- API: Payables (Công nợ NCC), Pay Payables
- UI: Form Bán hàng, Form Mua hàng (có partial payment)
- UI: Màn hình Trả nợ NCC
- Xử lý công nợ tự động

#### Task 7: Workers & Payroll + Thuế TNCN
- API: CRUD Workers, Work Logs, Pay Worker
- Logic tính thuế TNCN (quy tắc 2 triệu)
- UI: Danh sách nhân công, Hồ sơ pháp lý, Chấm công, Trả lương
- HTML Templates: Hợp đồng, Cam kết 02, Bảng lương
- Upload ảnh chứng từ

#### Task 8: Dashboard & Reports
- API: Dashboard summary, Chart data
- UI: Trang Dashboard với stat cards, charts
- UI: Các báo cáo cơ bản
- Export Excel

#### Task 9: OCR Integration
- Tích hợp Google Cloud Vision API
- API: Upload ảnh → OCR → Extract data
- UI: Nút scan trong form Mua hàng
- Auto-fill form từ kết quả OCR

---

## 7. SƠ ĐỒ DEPENDENCIES

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Task 1: Setup Project & Database Schema                       │
│   ════════════════════════════════════════                      │
│                          │                                      │
│                          ▼                                      │
│   Task 2: Authentication (+ Business Type)                      │
│   ═════════════════════════════════════════                     │
│                          │                                      │
│                          ▼                                      │
│   Task 3: Farm & User Management (+ Dynamic Labels)             │
│   ══════════════════════════════════════════════════            │
│                          │                                      │
│                          ▼                                      │
│   Task 4: Products & Partners                                   │
│   ═══════════════════════════                                   │
│                          │                                      │
│                          ▼                                      │
│   Task 5: Transactions - Thu/Chi tiền                           │
│   ═══════════════════════════════════                           │
│                          │                                      │
│           ┌──────────────┼──────────────┐                       │
│           │              │              │                       │
│           ▼              ▼              ▼                       │
│   Task 6          Task 7          Task 9                        │
│   Bán/Mua hàng    Workers         OCR                           │
│   + Công nợ       + Thuế TNCN     Integration                   │
│           │              │              │                       │
│           └──────────────┼──────────────┘                       │
│                          │                                      │
│                          ▼                                      │
│   Task 8: Dashboard & Reports                                   │
│   ═══════════════════════════                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Ghi chú:
- Task 6, 7, 9 có thể làm song song sau Task 5
- Task 8 cần data từ Task 6, 7 để hiển thị đầy đủ
- Task 9 (OCR) có thể làm cuối cùng hoặc bỏ qua nếu cần
```

---

## 8. QUY ƯỚC CODE

### 8.1 Ngôn Ngữ

| Thành phần | Ngôn ngữ |
|------------|----------|
| **UI Text** | Tiếng Việt 100% |
| **Code (variable, function)** | Tiếng Anh |
| **Comments** | Tiếng Việt (giải thích logic) |
| **Git commits** | Tiếng Anh |

### 8.2 Naming Conventions

```typescript
// Variables & Functions: camelCase
const transactionList = [];
function calculateTax() {}

// Components: PascalCase
function TransactionCard() {}
function MoneyInput() {}

// Types/Interfaces: PascalCase
interface Transaction {}
type PaymentMethod = 'CASH' | 'BANK_TRANSFER';

// Constants: SCREAMING_SNAKE_CASE
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const TRANSACTION_TYPES = {};

// Files: kebab-case
transaction-card.tsx
use-transactions.ts
money-input.tsx

// API Routes: kebab-case
/api/work-logs
/api/tra-no (có thể dùng tiếng Việt cho route nếu cần)

// Database tables: snake_case (Prisma @@map)
@@map("transactions")
@@map("work_logs")
```

### 8.3 Code Style

```typescript
// ✅ Tốt: Có type rõ ràng
interface CreateTransactionInput {
  trans_type: TransactionType;
  amount: number;
  partner_id?: string;
}

async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  // Validate input
  const validated = transactionSchema.parse(input);
  
  // Tạo transaction trong database
  const transaction = await prisma.transaction.create({
    data: validated
  });
  
  return transaction;
}

// ❌ Tránh: any type, không có validation
async function createTransaction(input: any) {
  return await prisma.transaction.create({ data: input });
}
```

### 8.4 API Response Format

```typescript
// Success response
{
  success: true,
  data: { ... },
  message?: "Tạo giao dịch thành công"
}

// Error response
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Số tiền phải lớn hơn 0",
    details?: { ... }
  }
}

// List response with pagination
{
  success: true,
  data: [ ... ],
  pagination: {
    page: 1,
    limit: 20,
    total: 150,
    totalPages: 8
  }
}
```

---

## 9. HƯỚNG DẪN SỬ DỤNG PROMPTS

### 9.1 Cách Sử Dụng

1. **Mở file task tương ứng** (Task_01.md, Task_02.md, ...)
2. **Copy toàn bộ nội dung trong block ```PROMPT```**
3. **Paste vào Claude Opus 4.5** (hoặc AI khác)
4. **Chờ AI hoàn thành** code trước khi qua task tiếp theo
5. **Review code** và test từng phần
6. **Fix bugs** nếu có trước khi tiếp tục task mới

### 9.2 Nếu Output Bị Cắt Giữa Chừng

Khi AI output bị cắt (do giới hạn token):
- Nhắn: **"tiếp tục"** hoặc **"continue"**
- AI sẽ tiếp tục viết từ chỗ dừng

### 9.3 Nếu Cần AI Sửa Code

Khi cần AI sửa/thêm code:
```
Sửa lại file [tên file]:
- Thay đổi 1: ...
- Thay đổi 2: ...
```

### 9.4 Checklist Sau Mỗi Task

Sau khi AI hoàn thành mỗi task, kiểm tra:

- [ ] Code không có lỗi TypeScript (`npm run build`)
- [ ] Chạy được `npm run dev` không lỗi
- [ ] Test các flow chính trên trình duyệt
- [ ] UI responsive trên mobile (F12 → Toggle device)
- [ ] Tất cả text hiển thị bằng tiếng Việt
- [ ] Commit code lên Git

---

## 📁 DANH SÁCH FILES PROMPTS

Sau khi hoàn thành, bạn sẽ có các files sau:

```
📁 LABA_Phase1_Prompts/
│
├── 00_Overview.md                      ← File này
├── Task_01_Setup_Database.md
├── Task_02_Authentication.md
├── Task_03_Farm_User_Labels.md
├── Task_04_Products_Partners.md
├── Task_05_Transactions_CashInOut.md
├── Task_06_Sales_Purchases_Payables.md
├── Task_07_Workers_Payroll_Tax.md
├── Task_08_Dashboard_Reports.md
└── Task_09_OCR_Integration.md
```

---

## ✅ SẴN SÀNG BẮT ĐẦU!

Tiếp theo, hãy mở file **Task_01_Setup_Database.md** và bắt đầu với Task 1!

Chúc bạn code vui vẻ! 🚀

---

**Phiên bản:** 1.0  
**Cập nhật lần cuối:** 10/12/2024  
**Tác giả:** LABA Team
