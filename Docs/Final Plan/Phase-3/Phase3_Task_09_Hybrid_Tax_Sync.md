# 📋 PHASE 3 - TASK 9: HYBRID TAX SYNC

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P3-T9 |
| **Tên** | Hybrid Tax Sync |
| **Thời gian** | 6-8 giờ |
| **Phụ thuộc** | Task 2 (Tax Rules) |
| **Task tiếp theo** | Task 10 (Fixed Assets) |

---

## 📋 MỤC TIÊU

- Sync tax rules từ master database
- User có thể override rules
- Track changes và versions
- Revert to default

---

## PHẦN 1: SYNC LOGIC

```typescript
// src/services/tax-sync.service.ts

export async function syncTaxRules(farmId: string) {
  // Get master rules
  const masterRules = await getMasterTaxRules();
  
  for (const master of masterRules) {
    const existing = await prisma.taxRule.findUnique({
      where: { farm_id_code: { farm_id: farmId, code: master.code } },
    });
    
    if (!existing) {
      // Create new
      await prisma.taxRule.create({
        data: {
          farm_id: farmId,
          ...master,
          master_version: master.version,
          synced_at: new Date(),
        },
      });
    } else if (!existing.is_overridden) {
      // Update if not overridden
      await prisma.taxRule.update({
        where: { id: existing.id },
        data: {
          value: master.value,
          original_value: master.value,
          master_version: master.version,
          synced_at: new Date(),
        },
      });
    }
    // If overridden, keep user's value
  }
}
```

---

## PHẦN 2: UI FEATURES

- Rule list với override indicator
- Override form
- Reset to default button
- Sync now button
- Change history

---

## ✅ CHECKLIST

- [ ] Sync service
- [ ] Override tracking
- [ ] History log
- [ ] UI for management

---

**Estimated Time:** 6-8 giờ  
**Next Task:** Task 10 - Fixed Assets
