# 📋 PHASE 3 - TASK 1: DATABASE SCHEMA

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P3-T1 |
| **Tên** | Database Schema Phase 3 |
| **Thời gian** | 4-5 giờ |
| **Phụ thuộc** | Phase 2 hoàn thành |
| **Task tiếp theo** | Task 2 (Tax Rules Engine) |

---

## 📋 MỤC TIÊU

- Tạo 8 bảng mới: TaxRule, CITCalculation, PITCalculation, Asset
- DepreciationSchedule, TaxSchedule
- Enums cho tax types và status
- Seed data cho tax rules VN

---

## 📥 INPUTS TỪ PHASE 2

| Input | Từ | Chi tiết |
|-------|-----|----------|
| VATDeclaration | P2-T8 | Link to tax schedules |
| Transactions | P1-P2 | For CIT adjustments |
| Workers | P1-T7 | For PIT calculations |

---

## PHẦN 1: PRISMA SCHEMA - TAX RULES

```prisma
model TaxRule {
  id              String   @id @default(uuid())
  farm_id         String
  code            String   // "VAT_AGRI_5", "CIT_LIMIT_ENTERTAINMENT"
  rule_type       TaxRuleType
  category        String   // AGRI_PROD, ENTERTAINMENT
  action          TaxAction
  value           Decimal  @db.Decimal(18,2)
  limit_value     Decimal? @db.Decimal(18,2)
  description     String
  reference       String?  // TT219/2013
  effective_from  DateTime @db.Date
  effective_to    DateTime? @db.Date
  is_active       Boolean  @default(true)
  
  @@unique([farm_id, code])
  @@map("tax_rules")
}

enum TaxRuleType {
  VAT_RATE, VAT_DEDUCTIBLE, CIT_ADD_BACK, CIT_DEDUCTION, PIT_BRACKET, PIT_DEDUCTION
}
```

---

## PHẦN 2: CIT & PIT SCHEMAS

```prisma
model CITCalculation {
  id                  String   @id @default(uuid())
  farm_id             String
  period              String   // "2024-Q4" or "2024"
  period_type         CITPeriodType
  total_revenue       Decimal  @db.Decimal(18,2)
  total_expenses      Decimal  @db.Decimal(18,2)
  accounting_profit   Decimal  @db.Decimal(18,2)
  add_backs           Decimal  @default(0) @db.Decimal(18,2)
  deductions          Decimal  @default(0) @db.Decimal(18,2)
  taxable_income      Decimal  @db.Decimal(18,2)
  tax_rate            Decimal  @default(20) @db.Decimal(5,2)
  cit_amount          Decimal  @db.Decimal(18,2)
  status              CITStatus @default(DRAFT)
  
  @@unique([farm_id, period])
  @@map("cit_calculations")
}

model PITCalculation {
  id                  String   @id @default(uuid())
  farm_id             String
  employee_id         String
  period              String   // "2024-12"
  gross_income        Decimal  @db.Decimal(18,2)
  insurance_deduction Decimal  @db.Decimal(18,2)  // BHXH 10.5%
  family_deduction    Decimal  @db.Decimal(18,2)  // 11tr
  dependent_deduction Decimal  @db.Decimal(18,2)  // 4.4tr × N
  total_deduction     Decimal  @db.Decimal(18,2)
  taxable_income      Decimal  @db.Decimal(18,2)
  pit_amount          Decimal  @db.Decimal(18,2)
  tax_brackets        Json     @db.JsonB  // 7 bậc thuế chi tiết
  
  @@unique([farm_id, employee_id, period])
  @@map("pit_calculations")
}
```

---

## PHẦN 3: FIXED ASSETS SCHEMA

```prisma
model Asset {
  id                  String   @id @default(uuid())
  farm_id             String
  code                String   // TSCD-001
  name                String
  category            AssetCategory
  purchase_date       DateTime @db.Date
  purchase_price      Decimal  @db.Decimal(18,2)
  useful_life_months  Int
  depreciation_method DepreciationMethod @default(STRAIGHT_LINE)
  monthly_depreciation Decimal @db.Decimal(18,2)
  original_cost       Decimal @db.Decimal(18,2)
  accumulated_depreciation Decimal @default(0) @db.Decimal(18,2)
  book_value          Decimal @db.Decimal(18,2)
  status              AssetStatus @default(ACTIVE)
  
  @@unique([farm_id, code])
  @@map("assets")
}

model DepreciationSchedule {
  id                  String   @id @default(uuid())
  asset_id            String
  period              String   // "2024-12"
  depreciation_amount Decimal  @db.Decimal(18,2)
  accumulated_amount  Decimal  @db.Decimal(18,2)
  remaining_value     Decimal  @db.Decimal(18,2)
  is_posted           Boolean  @default(false)
  
  @@unique([asset_id, period])
  @@map("depreciation_schedules")
}
```

---

## ✅ CHECKLIST HOÀN THÀNH

### Schema
- [ ] TaxRule model với enums
- [ ] CITCalculation, CITAdjustment
- [ ] PITCalculation
- [ ] Asset, DepreciationSchedule
- [ ] TaxSchedule

### Migration
- [ ] SQL migration file
- [ ] Indexes created
- [ ] Seed data for tax rules

---

## 🔗 KẾT NỐI

### Output → Task 2 (Tax Rules Engine)
- TaxRule model cho rule engine

### Output → Task 10 (Fixed Assets)
- Asset, DepreciationSchedule models

---

**Estimated Time:** 4-5 giờ  
**Next Task:** Task 2 - Tax Rules Engine
