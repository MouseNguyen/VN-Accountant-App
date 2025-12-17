# 📋 PHASE 3: TAX ENGINE + BCTC + TSCĐ - TỔNG QUAN

**Phiên bản:** 1.0  
**Ngày cập nhật:** 14/12/2024  
**Thời gian:** 8 tuần (4 Sprints × 2 tuần)  
**Số Tasks:** 12  
**Ước tính:** 96-120 giờ

---

## 🎯 MỤC TIÊU PHASE 3

### Mục tiêu chính
1. ✅ **Tax Engine** - Tính thuế tự động tuân thủ luật VN
2. ✅ **VAT Validation** - Kiểm tra khấu trừ GTGT (TT219, TT96)
3. ✅ **CIT Calculation** - Thuế TNDN với điều chỉnh tăng/giảm
4. ✅ **PIT Calculation** - Thuế TNCN lũy tiến 7 bậc
5. ✅ **Fixed Assets** - Quản lý TSCĐ + Khấu hao tự động
6. ✅ **Financial Statements** - BCTC năm (Balance Sheet, P&L)
7. ✅ **Tax Compliance** - Dashboard + Nhắc nhở nộp thuế
8. ✅ **Hybrid Sync** - Tự động cập nhật luật thuế mới

### Deliverables
- Tax Engine hoạt động đúng luật thuế VN
- Xuất tờ khai 01/GTGT, 03/TNDN (XML chuẩn TCT)
- BCTC năm hoàn chỉnh (Excel/PDF)
- Quản lý TSCĐ + Khấu hao tự động hàng tháng
- Dashboard tuân thủ thuế với cảnh báo

---

## 📊 TASK BREAKDOWN

### Sprint 3.1: VAT Engine (Tuần 1-2)

| Task | Tên | Giờ | Phụ thuộc |
|------|-----|-----|-----------|
| 1 | Database Schema Phase 3 | 4-5h | - |
| 2 | Tax Rules Engine Core | 8-10h | Task 1 |
| 3 | VAT Validation Service | 6-8h | Task 2 |

### Sprint 3.2: CIT Engine (Tuần 3-4)

| Task | Tên | Giờ | Phụ thuộc |
|------|-----|-----|-----------|
| 4 | CIT Calculation Service | 8-10h | Task 1, 2 |
| 5 | CIT Declaration XML | 6-8h | Task 4 |
| 6 | CIT UI Components | 5-6h | Task 4, 5 |

### Sprint 3.3: PIT + Tax Compliance (Tuần 5-6)

| Task | Tên | Giờ | Phụ thuộc |
|------|-----|-----|-----------|
| 7 | PIT Calculation Service | 6-8h | Task 1 |
| 8 | Tax Compliance Dashboard | 8-10h | Task 3, 4, 7 |
| 9 | Hybrid Tax Sync Engine | 8-10h | Task 2 |

### Sprint 3.4: TSCĐ + BCTC (Tuần 7-8)

| Task | Tên | Giờ | Phụ thuộc |
|------|-----|-----|-----------|
| 10 | Fixed Assets Management | 10-12h | Task 1 |
| 11 | Financial Statements | 10-12h | Task 1, 4, 10 |
| 12 | Cron Jobs & Integration Tests | 6-8h | All |

---

## 🗄️ DATABASE SCHEMA TỔNG QUAN

### Bảng mới Phase 3

```
┌─────────────────────────────────────────────────────────────┐
│                     TAX ENGINE TABLES                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐      ┌──────────────────┐              │
│  │   tax_rules     │      │ tax_rule_history │              │
│  │─────────────────│      │──────────────────│              │
│  │ id              │      │ id               │              │
│  │ farm_id         │──────│ tax_rule_id      │              │
│  │ code            │      │ action           │              │
│  │ rule_type       │      │ old_value        │              │
│  │ category        │      │ new_value        │              │
│  │ condition (JSON)│      │ changed_by       │              │
│  │ action          │      │ changed_at       │              │
│  │ value           │      └──────────────────┘              │
│  │ original_value  │                                        │
│  │ is_overridden   │                                        │
│  │ master_version  │                                        │
│  └─────────────────┘                                        │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                     CIT TABLES                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐      ┌──────────────────┐              │
│  │cit_calculations │      │ cit_adjustments  │              │
│  │─────────────────│      │──────────────────│              │
│  │ id              │      │ id               │              │
│  │ farm_id         │◄─────│ cit_calculation_id│             │
│  │ period          │      │ adjustment_type  │              │
│  │ total_revenue   │      │ category         │              │
│  │ total_expenses  │      │ description      │              │
│  │ accounting_profit│     │ amount           │              │
│  │ add_backs       │      │ transaction_id   │              │
│  │ taxable_income  │      └──────────────────┘              │
│  │ cit_amount      │                                        │
│  │ status          │                                        │
│  └─────────────────┘                                        │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                     PIT TABLE                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐                                        │
│  │pit_calculations │                                        │
│  │─────────────────│                                        │
│  │ id              │                                        │
│  │ farm_id         │                                        │
│  │ employee_id     │                                        │
│  │ period          │                                        │
│  │ gross_income    │                                        │
│  │ insurance_deduct│                                        │
│  │ family_deduction│                                        │
│  │ taxable_income  │                                        │
│  │ pit_amount      │                                        │
│  │ tax_brackets    │                                        │
│  └─────────────────┘                                        │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                     ASSET TABLES                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐      ┌────────────────────┐            │
│  │     assets      │      │depreciation_schedules│          │
│  │─────────────────│      │────────────────────│            │
│  │ id              │      │ id                 │            │
│  │ farm_id         │◄─────│ asset_id           │            │
│  │ code            │      │ period             │            │
│  │ name            │      │ depreciation_amount│            │
│  │ category        │      │ accumulated_amount │            │
│  │ purchase_date   │      │ remaining_value    │            │
│  │ purchase_price  │      │ is_posted          │            │
│  │ useful_life_months│    └────────────────────┘            │
│  │ monthly_depreciation│                                    │
│  │ original_cost   │                                        │
│  │ accumulated_dep │                                        │
│  │ book_value      │                                        │
│  │ status          │                                        │
│  └─────────────────┘                                        │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                     TAX SCHEDULE                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐                                        │
│  │  tax_schedules  │                                        │
│  │─────────────────│                                        │
│  │ id              │                                        │
│  │ farm_id         │                                        │
│  │ tax_type        │  (VAT, CIT, PIT, LICENSE)              │
│  │ period          │                                        │
│  │ due_date        │                                        │
│  │ status          │  (PENDING, REMINDED, SUBMITTED, PAID)  │
│  │ amount          │                                        │
│  └─────────────────┘                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧮 TAX ENGINE LOGIC

### 1. VAT Validation Rules (TT219, TT96)

| # | Rule | Điều kiện | Kết quả |
|---|------|-----------|---------|
| 1 | Payment Method | HĐ >= 20tr, TT tiền mặt | ❌ Không khấu trừ |
| 2 | Vehicle | Xe < 9 chỗ | ❌ Không khấu trừ |
| 3 | Entertainment | > 500k/người | ⚠️ Warning |
| 4 | MST Required | Thiếu MST NCC | ❌ Không khấu trừ |
| 5 | Invoice Age | > 5 năm | ❌ Không khấu trừ |

### 2. CIT Add-back Rules

| # | Category | Mô tả | Action |
|---|----------|-------|--------|
| 1 | ENTERTAINMENT | Chi tiếp khách > 500k/người | Tăng thu nhập |
| 2 | ENTERTAINMENT_TOTAL | > 15% tổng chi phí | Tăng thu nhập |
| 3 | NO_CONTRACT_SALARY | Lương không HĐ >= 2tr | Tăng thu nhập |
| 4 | DEPRECIATION_EXCESS | Khấu hao vượt quy định | Tăng thu nhập |

### 3. PIT Progressive Tax (7 Bậc)

| Bậc | Thu nhập (VND) | Thuế suất |
|-----|----------------|-----------|
| 1 | 0 - 5,000,000 | 5% |
| 2 | 5,000,000 - 10,000,000 | 10% |
| 3 | 10,000,000 - 18,000,000 | 15% |
| 4 | 18,000,000 - 32,000,000 | 20% |
| 5 | 32,000,000 - 52,000,000 | 25% |
| 6 | 52,000,000 - 80,000,000 | 30% |
| 7 | > 80,000,000 | 35% |

**Giảm trừ:**
- Bản thân: 11,000,000đ/tháng
- Người phụ thuộc: 4,400,000đ/người/tháng
- BHXH: 10.5% lương

---

## 📊 FINANCIAL STATEMENTS

### Balance Sheet (Bảng Cân Đối Kế Toán)

```
TÀI SẢN
├── Tài sản ngắn hạn
│   ├── Tiền mặt
│   ├── Tiền gửi ngân hàng
│   ├── Phải thu khách hàng (AR)
│   └── Hàng tồn kho
└── Tài sản dài hạn
    ├── Tài sản cố định
    └── (-) Khấu hao lũy kế

NỢ PHẢI TRẢ
├── Phải trả nhà cung cấp (AP)
└── Thuế phải nộp

VỐN CHỦ SỞ HỮU
├── Vốn góp
└── Lợi nhuận giữ lại
```

### Income Statement (Báo Cáo Kết Quả Kinh Doanh)

```
Doanh thu thuần
(-) Giá vốn hàng bán
= LỢI NHUẬN GỘP

(-) Chi phí bán hàng
(-) Chi phí quản lý
(-) Chi phí khấu hao
= LỢI NHUẬN HOẠT ĐỘNG

(+) Thu nhập khác
(-) Chi phí khác
= LỢI NHUẬN TRƯỚC THUẾ

(-) Thuế TNDN
= LỢI NHUẬN SAU THUẾ
```

---

## 🔄 HYBRID TAX SYNC ENGINE

### Workflow

```
┌────────────────────────────────────────────────────────────┐
│                    LUẬT THUẾ MỚI BAN HÀNH                  │
└─────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│              ADMIN CẬP NHẬT MASTER JSON                    │
│              (public/tax-rules-master.json)                │
│              version: 20251210                             │
└─────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│                   WEEKLY CRON JOB                          │
│                checkAndSyncAll()                           │
└─────────────────────────┬──────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
          ▼                               ▼
┌─────────────────────┐       ┌─────────────────────┐
│   is_overridden     │       │   is_overridden     │
│      = FALSE        │       │      = TRUE         │
│                     │       │                     │
│  ✅ UPDATE value    │       │  ❌ SKIP value      │
│  ✅ UPDATE metadata │       │  ✅ UPDATE metadata │
│  ✅ Log history     │       │  ✅ Log skipped     │
└─────────────────────┘       └─────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│            PUSH NOTIFICATION TO USERS                      │
│        "📋 Có cập nhật luật thuế mới!"                     │
└────────────────────────────────────────────────────────────┘
```

### User Override Flow

```
User sửa giá trị
       │
       ▼
is_overridden = TRUE
       │
       ▼
Sync mới KHÔNG đè value
       │
       ▼
User có thể "Reset về mặc định"
       │
       ▼
is_overridden = FALSE
       │
       ▼
Sync tiếp theo sẽ update value
```

---

## ⏰ CRON JOBS

| Job | Schedule | Mô tả |
|-----|----------|-------|
| `calculateMonthlyDepreciation` | Ngày 1, 00:00 | Tính khấu hao TSCĐ |
| `sendTaxReminders` | Hàng ngày, 08:00 | Nhắc nhở hạn nộp thuế |
| `updateTaxScheduleStatus` | Hàng ngày, 00:00 | Cập nhật status lịch thuế |
| `checkAndSyncTaxRules` | Hàng tuần, Chủ nhật 00:00 | Sync luật thuế mới |

---

## ✅ SUCCESS METRICS

| Metric | Target |
|--------|--------|
| VAT Validation Accuracy | 100% theo luật |
| CIT Calculation Accuracy | 100% |
| PIT Calculation Accuracy | 100% |
| Tax Declaration XML Valid | 100% pass TCT |
| Auto Depreciation | 100% monthly |
| User Tax Compliance Rate | > 95% |
| Sync Engine Uptime | > 99.9% |

---

## 🔗 DEPENDENCIES

### NPM Packages mới

```json
{
  "dependencies": {
    "node-cron": "^3.0.3",      // Cron jobs
    "xml2js": "^0.6.2",         // XML builder
    "decimal.js": "^10.4.3"     // Tính toán chính xác
  },
  "devDependencies": {
    "@types/node-cron": "^3.0.11"
  }
}
```

### External APIs

| API | Mục đích |
|-----|----------|
| TCT Test Portal | Validate XML trước khi nộp |
| Push Notification | Nhắc nhở hạn nộp thuế |

---

## 📁 FOLDER STRUCTURE

```
src/
├── lib/
│   └── tax/
│       ├── engine.ts           # Tax engine core
│       ├── rules-evaluator.ts  # Evaluate rule conditions
│       ├── vat-validator.ts    # VAT validation
│       ├── cit-calculator.ts   # CIT calculation
│       ├── pit-calculator.ts   # PIT calculation
│       ├── xml-generator.ts    # Generate XML declarations
│       ├── tct-validator.ts    # TCT API validation
│       └── sync-service.ts     # Hybrid sync engine
├── services/
│   ├── tax.service.ts
│   ├── asset.service.ts
│   └── financial-statement.service.ts
├── cron/
│   ├── depreciation.ts
│   ├── tax-reminders.ts
│   └── tax-sync.ts
└── app/
    └── api/
        ├── tax/
        │   ├── vat/
        │   ├── cit/
        │   └── pit/
        ├── assets/
        └── reports/
            ├── balance-sheet/
            └── income-statement/
```

---

## 📋 TASK SPECS FILES

| Task | File |
|------|------|
| Overview | `00_Overview_Phase3.md` ← BẠN ĐANG Ở ĐÂY |
| Task 1 | `Phase3_Task_01_Database_Schema.md` |
| Task 2 | `Phase3_Task_02_Tax_Rules_Engine.md` |
| Task 3 | `Phase3_Task_03_VAT_Validation.md` |
| Task 4 | `Phase3_Task_04_CIT_Calculation.md` |
| Task 5 | `Phase3_Task_05_CIT_XML_Declaration.md` |
| Task 6 | `Phase3_Task_06_CIT_UI_Components.md` |
| Task 7 | `Phase3_Task_07_PIT_Calculation.md` |
| Task 8 | `Phase3_Task_08_Tax_Compliance_Dashboard.md` |
| Task 9 | `Phase3_Task_09_Hybrid_Tax_Sync.md` |
| Task 10 | `Phase3_Task_10_Fixed_Assets.md` |
| Task 11 | `Phase3_Task_11_Financial_Statements.md` |
| Task 12 | `Phase3_Task_12_Cron_Jobs_Testing.md` |

---

## 🚀 NEXT PHASE

**Phase 4: Multi-Currency + Banking Integration**
- Hỗ trợ đa tiền tệ (USD, EUR)
- Tích hợp API ngân hàng
- Tự động đối chiếu sổ sách
- Advanced inventory (Lot, Serial)

---

*Version: 1.0*  
*Created: 14/12/2024*  
*Status: Ready for Development*
