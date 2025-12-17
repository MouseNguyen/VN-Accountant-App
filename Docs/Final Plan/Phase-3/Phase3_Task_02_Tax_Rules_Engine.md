# 📋 PHASE 3 - TASK 2: TAX RULES ENGINE

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P3-T2 |
| **Tên** | Tax Rules Engine |
| **Thời gian** | 8-10 giờ |
| **Phụ thuộc** | Task 1 (Schema) |
| **Task tiếp theo** | Task 3 (VAT Validation) |

---

## 📋 MỤC TIÊU

- CRUD Tax Rules với override capability
- Rule evaluation engine
- Sync rules từ master database
- History tracking cho audits

---

## 📥 INPUTS

| Input | Từ | Chi tiết |
|-------|-----|----------|
| TaxRule model | Task 1 | Schema |
| TaxRate seed | Phase 1 | Base rates |

---

## PHẦN 1: API ENDPOINTS

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /api/tax-rules | List all rules |
| GET | /api/tax-rules/:code | Get by code |
| PUT | /api/tax-rules/:code | Override rule |
| POST | /api/tax-rules/:code/reset | Reset to default |
| POST | /api/tax-rules/sync | Sync from master |

---

## PHẦN 2: RULE EVALUATION ENGINE

```typescript
// src/services/tax-rule-engine.ts

interface RuleContext {
  farm_id: string;
  transaction_type?: string;
  product_category?: string;
  amount?: number;
  date?: Date;
}

export async function evaluateRule(
  ruleCode: string, 
  context: RuleContext
): Promise<{ applies: boolean; value: number; limit?: number }> {
  const rule = await prisma.taxRule.findFirst({
    where: {
      farm_id: context.farm_id,
      code: ruleCode,
      is_active: true,
      effective_from: { lte: context.date || new Date() },
      OR: [
        { effective_to: null },
        { effective_to: { gte: context.date || new Date() } },
      ],
    },
  });
  
  if (!rule) {
    return { applies: false, value: 0 };
  }
  
  // Check conditions
  if (rule.condition) {
    const conditionMet = evaluateCondition(rule.condition, context);
    if (!conditionMet) return { applies: false, value: 0 };
  }
  
  return {
    applies: true,
    value: Number(rule.value),
    limit: rule.limit_value ? Number(rule.limit_value) : undefined,
  };
}

export async function getVATRate(
  farmId: string, 
  productCategory: string
): Promise<number> {
  // Priority: Product-specific → Category → General
  const rules = await prisma.taxRule.findMany({
    where: {
      farm_id: farmId,
      rule_type: 'VAT_RATE',
      is_active: true,
    },
    orderBy: { category: 'desc' },  // Specific first
  });
  
  for (const rule of rules) {
    if (rule.category === productCategory || rule.category === 'GENERAL') {
      return Number(rule.value);
    }
  }
  
  return 10;  // Default 10%
}
```

---

## PHẦN 3: OVERRIDE & SYNC

```typescript
// Override a rule for specific farm
export async function overrideRule(
  farmId: string,
  code: string,
  newValue: number,
  userId: string
) {
  const rule = await prisma.taxRule.findUnique({
    where: { farm_id_code: { farm_id: farmId, code } },
  });
  
  await prisma.$transaction([
    // Update rule
    prisma.taxRule.update({
      where: { id: rule.id },
      data: {
        value: newValue,
        is_overridden: true,
        original_value: rule.value,
      },
    }),
    // Create history
    prisma.taxRuleHistory.create({
      data: {
        tax_rule_id: rule.id,
        farm_id: farmId,
        action: 'USER_OVERRIDE',
        old_value: rule.value,
        new_value: newValue,
        changed_by: userId,
      },
    }),
  ]);
}

// Reset to default
export async function resetRule(farmId: string, code: string, userId: string) {
  const rule = await prisma.taxRule.findUnique({
    where: { farm_id_code: { farm_id: farmId, code } },
  });
  
  if (!rule.original_value) throw new Error('Rule has no original value');
  
  await prisma.taxRule.update({
    where: { id: rule.id },
    data: {
      value: rule.original_value,
      is_overridden: false,
    },
  });
}
```

---

## ✅ CHECKLIST HOÀN THÀNH

### API
- [ ] GET /api/tax-rules
- [ ] PUT override
- [ ] POST reset
- [ ] POST sync

### Engine
- [ ] evaluateRule function
- [ ] getVATRate function
- [ ] Condition evaluation

### History
- [ ] Track all changes
- [ ] Show override history

---

## 🔗 KẾT NỐI

### Output → Task 3 (VAT Validation)
- VAT rate lookup

### Output → Task 4 (CIT Calculation)
- CIT add-back/deduction rules

---

**Estimated Time:** 8-10 giờ  
**Next Task:** Task 3 - VAT Validation
