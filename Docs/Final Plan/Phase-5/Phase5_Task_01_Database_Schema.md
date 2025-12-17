# 📋 PHASE 5 - TASK 1: DATABASE SCHEMA

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P5-T1 |
| **Tên** | Database Schema Phase 5 |
| **Thời gian** | 6-8 giờ |
| **Phụ thuộc** | Phase 4 hoàn thành |
| **Task tiếp theo** | Task 2 (Employee CRUD) |

---

## 📋 MỤC TIÊU

- Employee model (nhân viên chính thức)
- Payroll, PayrollLine models
- Tool (CCDC), ToolAllocation models
- Budget, BudgetLine models
- ProductCost, CostDriver models

---

## 📥 INPUTS TỪ PHASE 4

| Input | Từ | Chi tiết |
|-------|-----|----------|
| Workers | P1-T7 | Migrate to Employee |
| Accounts | P1-T1 | Budget accounts |
| Products | P1-T4 | Product costing |

---

## PHẦN 1: EMPLOYEE & PAYROLL SCHEMA

```prisma
model Employee {
  id              String   @id @default(uuid())
  farm_id         String
  code            String   // NV001
  name            String
  phone           String?
  email           String?
  id_number       String?  // CCCD
  
  // Contract
  contract_type   ContractType @default(LABOR)
  start_date      DateTime? @db.Date
  end_date        DateTime? @db.Date
  
  // Salary
  base_salary     Decimal  @default(0) @db.Decimal(18, 2)
  
  // Tax deductions
  dependents      Int      @default(0)
  
  // Insurance
  has_insurance   Boolean  @default(false)
  insurance_code  String?
  
  // Bank
  bank_account    String?
  bank_name       String?
  
  is_active       Boolean  @default(true)
  
  @@unique([farm_id, code])
  @@map("employees")
}

enum ContractType {
  LABOR       // Hợp đồng lao động
  SEASONAL    // Thời vụ
  PROBATION   // Thử việc
}

model Payroll {
  id              String   @id @default(uuid())
  farm_id         String
  
  period          String   // "2024-12"
  
  // Summary
  total_gross     Decimal  @db.Decimal(18, 2)
  total_bhxh      Decimal  @db.Decimal(18, 2)
  total_bhyt      Decimal  @db.Decimal(18, 2)
  total_bhtn      Decimal  @db.Decimal(18, 2)
  total_pit       Decimal  @db.Decimal(18, 2)
  total_net       Decimal  @db.Decimal(18, 2)
  
  status          PayrollStatus @default(DRAFT)
  approved_at     DateTime?
  approved_by     String?
  paid_at         DateTime?
  
  lines           PayrollLine[]
  
  @@unique([farm_id, period])
  @@map("payrolls")
}

model PayrollLine {
  id              String   @id @default(uuid())
  payroll_id      String
  employee_id     String
  
  // Earnings
  base_salary     Decimal  @db.Decimal(18, 2)
  allowances      Decimal  @default(0) @db.Decimal(18, 2)
  overtime        Decimal  @default(0) @db.Decimal(18, 2)
  bonus           Decimal  @default(0) @db.Decimal(18, 2)
  gross_salary    Decimal  @db.Decimal(18, 2)
  
  // Deductions (Employee portion)
  bhxh_employee   Decimal  @db.Decimal(18, 2)  // 8%
  bhyt_employee   Decimal  @db.Decimal(18, 2)  // 1.5%
  bhtn_employee   Decimal  @db.Decimal(18, 2)  // 1%
  
  // Insurance (Employer portion)
  bhxh_employer   Decimal  @db.Decimal(18, 2)  // 17.5%
  bhyt_employer   Decimal  @db.Decimal(18, 2)  // 3%
  bhtn_employer   Decimal  @db.Decimal(18, 2)  // 1%
  
  // Tax
  taxable_income  Decimal  @db.Decimal(18, 2)
  pit_amount      Decimal  @db.Decimal(18, 2)
  
  // Net
  net_salary      Decimal  @db.Decimal(18, 2)
  
  @@unique([payroll_id, employee_id])
  @@map("payroll_lines")
}
```

---

## PHẦN 2: CCDC (CÔNG CỤ DỤNG CỤ)

```prisma
model Tool {
  id              String   @id @default(uuid())
  farm_id         String
  code            String   // CCDC-001
  name            String
  
  purchase_date   DateTime @db.Date
  purchase_price  Decimal  @db.Decimal(18, 2)
  
  // Allocation
  allocation_months Int     // 3-24 months
  monthly_amount  Decimal  @db.Decimal(18, 2)
  
  // Tracking
  allocated_amount Decimal @default(0) @db.Decimal(18, 2)
  remaining_amount Decimal @db.Decimal(18, 2)
  
  status          ToolStatus @default(ACTIVE)
  
  allocations     ToolAllocation[]
  
  @@unique([farm_id, code])
  @@map("tools")
}

model ToolAllocation {
  id              String   @id @default(uuid())
  tool_id         String
  period          String   // "2024-12"
  amount          Decimal  @db.Decimal(18, 2)
  is_posted       Boolean  @default(false)
  
  @@unique([tool_id, period])
  @@map("tool_allocations")
}
```

---

## PHẦN 3: BUDGET

```prisma
model Budget {
  id              String   @id @default(uuid())
  farm_id         String
  
  year            Int
  name            String   // "Ngân sách 2025"
  
  total_amount    Decimal  @db.Decimal(18, 2)
  used_amount     Decimal  @default(0) @db.Decimal(18, 2)
  
  status          BudgetStatus @default(DRAFT)
  
  lines           BudgetLine[]
  
  @@unique([farm_id, year])
  @@map("budgets")
}

model BudgetLine {
  id              String   @id @default(uuid())
  budget_id       String
  
  account_code    String   // 642 - Chi phí quản lý
  category        String?
  
  budget_amount   Decimal  @db.Decimal(18, 2)
  used_amount     Decimal  @default(0) @db.Decimal(18, 2)
  
  // Warnings
  warning_80      Boolean  @default(false)
  warning_100     Boolean  @default(false)
  
  @@unique([budget_id, account_code])
  @@map("budget_lines")
}
```

---

## PHẦN 4: PRODUCT COSTING

```prisma
model ProductCost {
  id              String   @id @default(uuid())
  farm_id         String
  product_id      String
  period          String   // "2024-12"
  
  // Direct costs
  material_cost   Decimal  @db.Decimal(18, 2)
  labor_cost      Decimal  @db.Decimal(18, 2)
  
  // Indirect costs (allocated)
  overhead_cost   Decimal  @db.Decimal(18, 2)
  
  // Total
  total_cost      Decimal  @db.Decimal(18, 2)
  unit_cost       Decimal  @db.Decimal(18, 4)
  quantity        Decimal  @db.Decimal(18, 2)
  
  @@unique([farm_id, product_id, period])
  @@map("product_costs")
}

model CostDriver {
  id              String   @id @default(uuid())
  farm_id         String
  
  name            String   // "Labor Hours", "Machine Hours"
  type            CostDriverType
  
  rate            Decimal  @db.Decimal(18, 4)
  
  @@map("cost_drivers")
}
```

---

## ✅ CHECKLIST

- [ ] Employee model
- [ ] Payroll, PayrollLine
- [ ] Tool, ToolAllocation
- [ ] Budget, BudgetLine
- [ ] ProductCost, CostDriver
- [ ] Migration SQL
- [ ] Enums

---

## 🔗 KẾT NỐI

### Output → Task 2-4 (Payroll)
- Employee, Payroll models

### Output → Task 5-6 (CCDC)
- Tool, ToolAllocation models

### Output → Task 7-8 (Budget)
- Budget, BudgetLine models

### Output → Task 9-12 (Costing)
- ProductCost, CostDriver models

---

**Estimated Time:** 6-8 giờ  
**Next Task:** Task 2 - Employee CRUD
