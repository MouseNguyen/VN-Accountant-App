# 📋 PHASE 5 - TASK 3: PAYROLL AUTO CALCULATE

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P5-T3 |
| **Tên** | Payroll Auto Calculate |
| **Thời gian** | 10-12 giờ |
| **Phụ thuộc** | Task 2 (Employee) |
| **Task tiếp theo** | Task 4 (Payroll UI) |

---

## 📋 MỤC TIÊU

- Tính lương tự động cho tất cả nhân viên
- Tính BHXH/BHYT/BHTN (cả phần NV và DN)
- Tính thuế TNCN 7 bậc
- GROSS → NET và NET → GROSS

---

## PHẦN 1: THAM SỐ BẢO HIỂM

```typescript
// src/lib/payroll/constants.ts

// Bảo hiểm (trên lương đóng bảo hiểm)
export const INSURANCE_RATES = {
  // Nhân viên đóng
  BHXH_EMPLOYEE: 0.08,    // 8%
  BHYT_EMPLOYEE: 0.015,   // 1.5%
  BHTN_EMPLOYEE: 0.01,    // 1%
  
  // Doanh nghiệp đóng
  BHXH_EMPLOYER: 0.175,   // 17.5%
  BHYT_EMPLOYER: 0.03,    // 3%
  BHTN_EMPLOYER: 0.01,    // 1%
};

// Mức lương cơ sở (update theo quy định)
export const BASE_SALARY_2024 = 1_800_000;

// Mức trần BHXH = 20 x lương cơ sở
export const INSURANCE_CEILING = BASE_SALARY_2024 * 20;  // 36,000,000

// Giảm trừ gia cảnh
export const DEDUCTIONS = {
  SELF: 11_000_000,
  DEPENDENT: 4_400_000,
};
```

---

## PHẦN 2: PAYROLL CALCULATION

```typescript
// src/services/payroll.service.ts

interface PayrollCalculation {
  employee_id: string;
  
  // Gross
  base_salary: number;
  allowances: number;
  overtime: number;
  bonus: number;
  gross_salary: number;
  
  // Insurance (Employee)
  bhxh_employee: number;
  bhyt_employee: number;
  bhtn_employee: number;
  total_insurance_employee: number;
  
  // Insurance (Employer)
  bhxh_employer: number;
  bhyt_employer: number;
  bhtn_employer: number;
  total_insurance_employer: number;
  
  // Tax
  taxable_income: number;
  pit_amount: number;
  
  // Net
  net_salary: number;
}

export async function calculatePayroll(
  farmId: string, 
  period: string
): Promise<Payroll> {
  // Get all active employees with insurance
  const employees = await prisma.employee.findMany({
    where: { farm_id: farmId, is_active: true },
  });
  
  const lines: PayrollCalculation[] = [];
  
  for (const emp of employees) {
    const calc = calculateEmployeePayroll(emp);
    lines.push(calc);
  }
  
  // Create payroll
  return prisma.payroll.create({
    data: {
      farm_id: farmId,
      period,
      total_gross: sumBy(lines, 'gross_salary'),
      total_bhxh: sumBy(lines, 'bhxh_employee'),
      total_bhyt: sumBy(lines, 'bhyt_employee'),
      total_bhtn: sumBy(lines, 'bhtn_employee'),
      total_pit: sumBy(lines, 'pit_amount'),
      total_net: sumBy(lines, 'net_salary'),
      status: 'DRAFT',
      lines: {
        create: lines.map(l => ({
          employee_id: l.employee_id,
          base_salary: l.base_salary,
          allowances: l.allowances,
          overtime: l.overtime,
          bonus: l.bonus,
          gross_salary: l.gross_salary,
          bhxh_employee: l.bhxh_employee,
          bhyt_employee: l.bhyt_employee,
          bhtn_employee: l.bhtn_employee,
          bhxh_employer: l.bhxh_employer,
          bhyt_employer: l.bhyt_employer,
          bhtn_employer: l.bhtn_employer,
          taxable_income: l.taxable_income,
          pit_amount: l.pit_amount,
          net_salary: l.net_salary,
        })),
      },
    },
  });
}

function calculateEmployeePayroll(emp: Employee): PayrollCalculation {
  const grossSalary = Number(emp.base_salary);
  
  // Insurance on capped salary
  const insurableSalary = Math.min(grossSalary, INSURANCE_CEILING);
  
  let bhxh_employee = 0, bhyt_employee = 0, bhtn_employee = 0;
  let bhxh_employer = 0, bhyt_employer = 0, bhtn_employer = 0;
  
  if (emp.has_insurance) {
    bhxh_employee = insurableSalary * INSURANCE_RATES.BHXH_EMPLOYEE;
    bhyt_employee = insurableSalary * INSURANCE_RATES.BHYT_EMPLOYEE;
    bhtn_employee = insurableSalary * INSURANCE_RATES.BHTN_EMPLOYEE;
    
    bhxh_employer = insurableSalary * INSURANCE_RATES.BHXH_EMPLOYER;
    bhyt_employer = insurableSalary * INSURANCE_RATES.BHYT_EMPLOYER;
    bhtn_employer = insurableSalary * INSURANCE_RATES.BHTN_EMPLOYER;
  }
  
  const totalInsuranceEmployee = bhxh_employee + bhyt_employee + bhtn_employee;
  
  // Taxable income
  const familyDeduction = DEDUCTIONS.SELF + (emp.dependents * DEDUCTIONS.DEPENDENT);
  const taxableIncome = Math.max(0, grossSalary - totalInsuranceEmployee - familyDeduction);
  
  // PIT (7 brackets)
  const pitAmount = calculateProgressivePIT(taxableIncome);
  
  // Net
  const netSalary = grossSalary - totalInsuranceEmployee - pitAmount;
  
  return {
    employee_id: emp.id,
    base_salary: grossSalary,
    allowances: 0,
    overtime: 0,
    bonus: 0,
    gross_salary: grossSalary,
    bhxh_employee, bhyt_employee, bhtn_employee,
    total_insurance_employee: totalInsuranceEmployee,
    bhxh_employer, bhyt_employer, bhtn_employer,
    total_insurance_employer: bhxh_employer + bhyt_employer + bhtn_employer,
    taxable_income: taxableIncome,
    pit_amount: pitAmount,
    net_salary: netSalary,
  };
}
```

---

## ✅ CHECKLIST

- [ ] Calculate payroll API
- [ ] BHXH/BHYT/BHTN calculation
- [ ] PIT 7 brackets
- [ ] GROSS → NET
- [ ] NET → GROSS conversion

---

## 🔗 KẾT NỐI

### Output → Task 4 (Payroll UI)
- Calculation logic cho UI

---

**Estimated Time:** 10-12 giờ  
**Next Task:** Task 4 - Payroll UI & Reports
