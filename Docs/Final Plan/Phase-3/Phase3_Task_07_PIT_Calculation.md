# 📋 PHASE 3 - TASK 7: PIT CALCULATION (7 BẬC THUẾ)

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P3-T7 |
| **Tên** | PIT Calculation - 7 Bậc Thuế |
| **Thời gian** | 8-10 giờ |
| **Phụ thuộc** | Task 1 (Schema), Workers (P1) |
| **Task tiếp theo** | Task 8 (Tax Dashboard) |

---

## 📋 MỤC TIÊU

- Tính thuế TNCN theo 7 bậc thuế lũy tiến
- Giảm trừ gia cảnh bản thân + người phụ thuộc
- Giảm trừ BHXH 10.5%
- Tính từ GROSS → NET hoặc NET → GROSS

---

## 📥 INPUTS

| Input | Từ | Chi tiết |
|-------|-----|----------|
| PITCalculation model | Task 1 | Schema |
| Workers/Employees | Phase 1, 5 | Thu nhập, người phụ thuộc |

---

## PHẦN 1: 7 BẬC THUẾ TNCN

```typescript
// src/lib/tax/pit-brackets.ts

const PIT_BRACKETS = [
  { bracket: 1, threshold: 5_000_000, rate: 0.05 },
  { bracket: 2, threshold: 10_000_000, rate: 0.10 },
  { bracket: 3, threshold: 18_000_000, rate: 0.15 },
  { bracket: 4, threshold: 32_000_000, rate: 0.20 },
  { bracket: 5, threshold: 52_000_000, rate: 0.25 },
  { bracket: 6, threshold: 80_000_000, rate: 0.30 },
  { bracket: 7, threshold: Infinity, rate: 0.35 },
];

const DEDUCTIONS = {
  SELF: 11_000_000,           // Giảm trừ bản thân
  DEPENDENT: 4_400_000,       // Giảm trừ mỗi người phụ thuộc
  INSURANCE_RATE: 0.105,      // BHXH 8% + BHYT 1.5% + BHTN 1%
};
```

---

## PHẦN 2: PIT CALCULATION SERVICE

```typescript
// src/services/pit.service.ts

interface PITInput {
  farm_id: string;
  employee_id: string;
  period: string;  // "2024-12"
  gross_income: number;
  dependents_count: number;
}

export async function calculatePIT(input: PITInput): Promise<PITCalculation> {
  const { gross_income, dependents_count } = input;
  
  // 1. Giảm trừ BHXH (10.5%)
  const insuranceDeduction = gross_income * DEDUCTIONS.INSURANCE_RATE;
  
  // 2. Giảm trừ gia cảnh
  const familyDeduction = DEDUCTIONS.SELF;
  const dependentDeduction = dependents_count * DEDUCTIONS.DEPENDENT;
  
  // 3. Tổng giảm trừ
  const totalDeduction = insuranceDeduction + familyDeduction + dependentDeduction;
  
  // 4. Thu nhập chịu thuế
  const taxableIncome = Math.max(0, gross_income - totalDeduction);
  
  // 5. Tính thuế theo 7 bậc
  const { pitAmount, brackets } = calculateProgressiveTax(taxableIncome);
  
  // 6. Lưu kết quả
  return prisma.pITCalculation.upsert({
    where: {
      farm_id_employee_id_period: {
        farm_id: input.farm_id,
        employee_id: input.employee_id,
        period: input.period,
      },
    },
    update: {
      gross_income,
      insurance_deduction: insuranceDeduction,
      family_deduction: familyDeduction,
      dependent_deduction: dependentDeduction,
      total_deduction: totalDeduction,
      taxable_income: taxableIncome,
      pit_amount: pitAmount,
      tax_brackets: brackets,
      dependents_count,
    },
    create: {
      farm_id: input.farm_id,
      employee_id: input.employee_id,
      period: input.period,
      gross_income,
      insurance_deduction: insuranceDeduction,
      family_deduction: familyDeduction,
      dependent_deduction: dependentDeduction,
      total_deduction: totalDeduction,
      taxable_income: taxableIncome,
      pit_amount: pitAmount,
      tax_brackets: brackets,
      dependents_count,
    },
  });
}

function calculateProgressiveTax(taxableIncome: number) {
  let remaining = taxableIncome;
  let totalTax = 0;
  let previousThreshold = 0;
  const brackets = [];
  
  for (const bracket of PIT_BRACKETS) {
    if (remaining <= 0) break;
    
    const bracketRange = bracket.threshold - previousThreshold;
    const incomeInBracket = Math.min(remaining, bracketRange);
    const taxInBracket = incomeInBracket * bracket.rate;
    
    brackets.push({
      bracket: bracket.bracket,
      income: incomeInBracket,
      rate: bracket.rate * 100,
      tax: taxInBracket,
    });
    
    totalTax += taxInBracket;
    remaining -= incomeInBracket;
    previousThreshold = bracket.threshold;
  }
  
  return { pitAmount: totalTax, brackets };
}
```

---

## PHẦN 3: NET ↔ GROSS CONVERSION

```typescript
// Tính GROSS từ NET (ngược)
export function calculateGrossFromNet(
  netSalary: number, 
  dependentsCount: number
): number {
  // Binary search để tìm GROSS
  let low = netSalary;
  let high = netSalary * 2;
  
  while (high - low > 1000) {
    const mid = (low + high) / 2;
    const result = calculatePITFromGross(mid, dependentsCount);
    const calculatedNet = mid - result.pitAmount - mid * DEDUCTIONS.INSURANCE_RATE;
    
    if (calculatedNet < netSalary) {
      low = mid;
    } else {
      high = mid;
    }
  }
  
  return Math.round(high);
}
```

---

## ✅ CHECKLIST HOÀN THÀNH

### Calculation
- [ ] 7 bậc thuế lũy tiến
- [ ] Giảm trừ BHXH 10.5%
- [ ] Giảm trừ bản thân 11tr
- [ ] Giảm trừ người phụ thuộc 4.4tr

### Conversion
- [ ] GROSS → NET
- [ ] NET → GROSS

### UI
- [ ] PIT calculator page
- [ ] Employee PIT history

---

## 🔗 KẾT NỐI

### Output → Phase 5 (Payroll)
- PIT calculation logic cho payroll automation

---

**Estimated Time:** 8-10 giờ  
**Next Task:** Task 8 - Tax Compliance Dashboard
