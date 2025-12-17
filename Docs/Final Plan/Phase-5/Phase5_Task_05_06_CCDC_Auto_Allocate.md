# 📋 PHASE 5 - TASK 5-6: CCDC (CÔNG CỤ DỤNG CỤ)

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P5-T5, P5-T6 |
| **Tên** | CCDC CRUD & Auto Allocate |
| **Thời gian** | 8-10 giờ |
| **Phụ thuộc** | Task 1 (Schema) |
| **Task tiếp theo** | Task 7 (Budget) |

---

## 📋 MỤC TIÊU

- CRUD công cụ dụng cụ
- Phân bổ chi phí hàng tháng (3-24 tháng)
- Auto journal entries
- Báo cáo CCDC

---

## PHẦN 1: API ENDPOINTS

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /api/tools | List CCDC |
| POST | /api/tools | Create |
| PUT | /api/tools/:id | Update |
| POST | /api/tools/allocate | Run allocation |

---

## PHẦN 2: ALLOCATION LOGIC

```typescript
// src/services/ccdc.service.ts

export async function createTool(input: CreateToolInput) {
  const monthlyAmount = input.purchase_price / input.allocation_months;
  
  const tool = await prisma.tool.create({
    data: {
      farm_id: input.farm_id,
      code: input.code,
      name: input.name,
      purchase_date: input.purchase_date,
      purchase_price: input.purchase_price,
      allocation_months: input.allocation_months,
      monthly_amount: monthlyAmount,
      allocated_amount: 0,
      remaining_amount: input.purchase_price,
      status: 'ACTIVE',
    },
  });
  
  // Create allocation schedule
  for (let i = 1; i <= input.allocation_months; i++) {
    const period = format(addMonths(input.purchase_date, i), 'yyyy-MM');
    await prisma.toolAllocation.create({
      data: {
        tool_id: tool.id,
        period,
        amount: monthlyAmount,
        is_posted: false,
      },
    });
  }
  
  return tool;
}

export async function runMonthlyAllocation(farmId: string, period: string) {
  const allocations = await prisma.toolAllocation.findMany({
    where: {
      tool: { farm_id: farmId },
      period,
      is_posted: false,
    },
    include: { tool: true },
  });
  
  for (const alloc of allocations) {
    // Create journal entry
    await createJournalEntry({
      farm_id: farmId,
      date: new Date(),
      description: `Phân bổ CCDC - ${alloc.tool.name}`,
      entries: [
        { account: '627', debit: alloc.amount },   // Chi phí
        { account: '242', credit: alloc.amount },  // CCDC chờ phân bổ
      ],
    });
    
    // Update allocation
    await prisma.toolAllocation.update({
      where: { id: alloc.id },
      data: { is_posted: true },
    });
    
    // Update tool
    await prisma.tool.update({
      where: { id: alloc.tool_id },
      data: {
        allocated_amount: { increment: alloc.amount },
        remaining_amount: { decrement: alloc.amount },
      },
    });
  }
  
  return allocations.length;
}
```

---

## ✅ CHECKLIST

- [ ] Tool CRUD
- [ ] Allocation schedule generation
- [ ] Monthly allocation run
- [ ] Journal entries
- [ ] CCDC report

---

**Estimated Time:** 8-10 giờ  
**Next Task:** Task 7 - Budget Planning
