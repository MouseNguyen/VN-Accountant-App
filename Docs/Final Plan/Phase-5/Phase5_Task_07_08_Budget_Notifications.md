# 📋 PHASE 5 - TASK 7-8: BUDGET & NOTIFICATIONS

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P5-T7, P5-T8 |
| **Tên** | Budget Planning & Notifications |
| **Thời gian** | 8-10 giờ |
| **Phụ thuộc** | Task 1 (Schema) |
| **Task tiếp theo** | Task 9 (Costing) |

---

## 📋 MỤC TIÊU

- Lập ngân sách theo tài khoản
- Warning khi chi tiêu vượt ngưỡng
- Email/Push notifications
- Dashboard ngân sách

---

## PHẦN 1: BUDGET CRUD

```typescript
// src/services/budget.service.ts

export async function createBudget(input: CreateBudgetInput) {
  return prisma.budget.create({
    data: {
      farm_id: input.farm_id,
      year: input.year,
      name: input.name || `Ngân sách ${input.year}`,
      total_amount: input.lines.reduce((sum, l) => sum + l.budget_amount, 0),
      status: 'DRAFT',
      lines: {
        create: input.lines.map(l => ({
          account_code: l.account_code,
          category: l.category,
          budget_amount: l.budget_amount,
          used_amount: 0,
        })),
      },
    },
  });
}
```

---

## PHẦN 2: BUDGET CHECK ON TRANSACTION

```typescript
// Hook when creating transaction
export async function checkBudget(
  farmId: string, 
  accountCode: string, 
  amount: number
): Promise<{ allowed: boolean; warning?: string }> {
  const year = new Date().getFullYear();
  
  const budgetLine = await prisma.budgetLine.findFirst({
    where: {
      budget: { farm_id: farmId, year },
      account_code: accountCode,
    },
    include: { budget: true },
  });
  
  if (!budgetLine) return { allowed: true };
  
  const newUsed = budgetLine.used_amount + amount;
  const percentage = (newUsed / budgetLine.budget_amount) * 100;
  
  if (percentage >= 100) {
    return { 
      allowed: false, 
      warning: `Vượt ngân sách TK ${accountCode}! (${percentage.toFixed(0)}%)` 
    };
  }
  
  if (percentage >= 80) {
    return { 
      allowed: true, 
      warning: `Cảnh báo: Đã sử dụng ${percentage.toFixed(0)}% ngân sách TK ${accountCode}` 
    };
  }
  
  return { allowed: true };
}

// Update budget used after transaction
export async function updateBudgetUsed(
  farmId: string, 
  accountCode: string, 
  amount: number
) {
  const year = new Date().getFullYear();
  
  const budgetLine = await prisma.budgetLine.findFirst({
    where: {
      budget: { farm_id: farmId, year },
      account_code: accountCode,
    },
  });
  
  if (budgetLine) {
    const newUsed = budgetLine.used_amount + amount;
    const percentage = (newUsed / budgetLine.budget_amount) * 100;
    
    await prisma.budgetLine.update({
      where: { id: budgetLine.id },
      data: {
        used_amount: newUsed,
        warning_80: percentage >= 80,
        warning_100: percentage >= 100,
      },
    });
    
    // Send notification if threshold crossed
    if (percentage >= 80 && !budgetLine.warning_80) {
      await sendBudgetWarning(farmId, accountCode, 80, percentage);
    }
    if (percentage >= 100 && !budgetLine.warning_100) {
      await sendBudgetWarning(farmId, accountCode, 100, percentage);
    }
  }
}
```

---

## PHẦN 3: NOTIFICATIONS

```typescript
// src/services/notification.service.ts

export async function sendBudgetWarning(
  farmId: string,
  accountCode: string,
  threshold: number,
  actual: number
) {
  const users = await prisma.user.findMany({
    where: { farm_id: farmId, role: 'OWNER' },
  });
  
  for (const user of users) {
    // In-app notification
    await prisma.notification.create({
      data: {
        user_id: user.id,
        type: 'BUDGET_WARNING',
        title: `Cảnh báo ngân sách ${threshold}%`,
        message: `TK ${accountCode} đã sử dụng ${actual.toFixed(0)}%`,
      },
    });
    
    // Email
    if (user.email) {
      await sendEmail({
        to: user.email,
        subject: `[LABA] Cảnh báo ngân sách ${threshold}%`,
        body: `Tài khoản ${accountCode} đã sử dụng ${actual.toFixed(0)}% ngân sách.`,
      });
    }
  }
}
```

---

## ✅ CHECKLIST

- [ ] Budget CRUD
- [ ] Budget check on transaction
- [ ] Update used on post
- [ ] Warning notifications
- [ ] Email sending
- [ ] Budget dashboard

---

**Estimated Time:** 8-10 giờ  
**Next Task:** Task 9 - Cost Drivers
