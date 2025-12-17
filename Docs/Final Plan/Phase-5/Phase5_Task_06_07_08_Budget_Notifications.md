# 📋 TASK 6-8: BUDGET & NOTIFICATIONS

## Thông Tin Tasks

| Task | Tên | Giờ |
|------|-----|-----|
| 6 | Budget CRUD & Monitoring | 8-10h |
| 7 | Push Notifications | 6-8h |
| 8 | Budget Dashboard | 6-8h |

---

# TASK 6: BUDGET CRUD & MONITORING

## Mục tiêu
- CRUD ngân sách theo kỳ
- Auto-update actual từ giao dịch
- Trigger warning khi vượt ngưỡng

---

## PHẦN 1: BUDGET SERVICE

```typescript
// src/services/budget.service.ts

import { prisma } from '@/lib/prisma';
import { BudgetCategory, BudgetPeriodType } from '@prisma/client';
import { sendBudgetWarning } from './notification.service';

// ==========================================
// TYPES
// ==========================================

export interface BudgetInput {
  period: string;          // "2024-12"
  period_type?: BudgetPeriodType;
  category: BudgetCategory;
  name?: string;
  planned_amount: number;
}

export interface BudgetDetail {
  id: string;
  period: string;
  period_type: string;
  category: string;
  name?: string;
  
  planned_amount: number;
  actual_amount: number;
  variance: number;
  percentage: number;
  
  warning_50: boolean;
  warning_80: boolean;
  warning_100: boolean;
  
  status: 'OK' | 'WARNING' | 'EXCEEDED';
}

// ==========================================
// CREATE BUDGET
// ==========================================

export async function createBudget(
  farmId: string,
  input: BudgetInput,
  userId: string
): Promise<BudgetDetail> {
  const existing = await prisma.budget.findUnique({
    where: {
      farm_id_period_category: {
        farm_id: farmId,
        period: input.period,
        category: input.category,
      },
    },
  });
  
  if (existing) {
    throw new Error(`Ngân sách ${input.category} tháng ${input.period} đã tồn tại`);
  }
  
  const budget = await prisma.budget.create({
    data: {
      farm_id: farmId,
      period: input.period,
      period_type: input.period_type || 'MONTHLY',
      category: input.category,
      name: input.name,
      planned_amount: input.planned_amount,
      created_by: userId,
    },
  });
  
  return formatBudgetDetail(budget);
}

// ==========================================
// UPDATE BUDGET ACTUAL (Event-driven)
// ==========================================

export async function updateBudgetActual(
  farmId: string,
  transType: string,
  amount: number,
  transDate: Date,
  category?: string
): Promise<void> {
  // Only track expenses
  const expenseTypes = ['CASH_OUT', 'PURCHASE', 'EXPENSE'];
  if (!expenseTypes.includes(transType)) return;
  
  const period = `${transDate.getFullYear()}-${String(transDate.getMonth() + 1).padStart(2, '0')}`;
  
  // Map transaction type to budget category
  const budgetCategory = mapToBudgetCategory(transType, category);
  
  // Find matching budget
  const budget = await prisma.budget.findFirst({
    where: {
      farm_id: farmId,
      period,
      category: budgetCategory,
      is_active: true,
    },
  });
  
  if (!budget) return;  // No budget set for this category
  
  // Update actual
  const newActual = Number(budget.actual_amount) + amount;
  const planned = Number(budget.planned_amount);
  const percentage = planned > 0 ? (newActual / planned) * 100 : 0;
  const variance = planned - newActual;
  
  await prisma.budget.update({
    where: { id: budget.id },
    data: {
      actual_amount: newActual,
      percentage: Math.round(percentage * 100) / 100,
      variance,
    },
  });
  
  // Check and trigger warnings
  await checkBudgetWarnings(budget.id, percentage, farmId);
}

// ==========================================
// CHECK & TRIGGER WARNINGS
// ==========================================

async function checkBudgetWarnings(
  budgetId: string,
  percentage: number,
  farmId: string
): Promise<void> {
  const budget = await prisma.budget.findUnique({ where: { id: budgetId }});
  if (!budget) return;
  
  // Warning at 50%
  if (percentage >= 50 && !budget.warning_50) {
    await prisma.budget.update({
      where: { id: budgetId },
      data: { warning_50: true },
    });
    
    await sendBudgetWarning(farmId, {
      level: 'INFO',
      message: `📊 Chi tiêu ${budget.category} đã đạt 50% ngân sách tháng ${budget.period}`,
      percentage,
    });
  }
  
  // Warning at 80%
  if (percentage >= 80 && !budget.warning_80) {
    await prisma.budget.update({
      where: { id: budgetId },
      data: { warning_80: true },
    });
    
    await sendBudgetWarning(farmId, {
      level: 'WARNING',
      message: `⚠️ Chi tiêu ${budget.category} đã vượt 80% ngân sách tháng ${budget.period}!`,
      percentage,
    });
  }
  
  // Warning at 100%
  if (percentage >= 100 && !budget.warning_100) {
    await prisma.budget.update({
      where: { id: budgetId },
      data: { warning_100: true },
    });
    
    await sendBudgetWarning(farmId, {
      level: 'CRITICAL',
      message: `🚨 Chi tiêu ${budget.category} đã VƯỢT ngân sách tháng ${budget.period}!`,
      percentage,
    });
  }
}

// ==========================================
// RESET WARNINGS (Monthly cron)
// ==========================================

export async function resetBudgetWarningsForNewPeriod(): Promise<void> {
  const currentPeriod = getCurrentPeriod();
  
  // Create new budgets for current period (copy from previous)
  const farms = await prisma.farm.findMany({ select: { id: true }});
  
  for (const farm of farms) {
    const previousPeriod = getPreviousPeriod(currentPeriod);
    
    const previousBudgets = await prisma.budget.findMany({
      where: { farm_id: farm.id, period: previousPeriod, is_active: true },
    });
    
    for (const budget of previousBudgets) {
      // Check if already exists
      const existing = await prisma.budget.findFirst({
        where: { farm_id: farm.id, period: currentPeriod, category: budget.category },
      });
      
      if (!existing) {
        await prisma.budget.create({
          data: {
            farm_id: farm.id,
            period: currentPeriod,
            period_type: budget.period_type,
            category: budget.category,
            name: budget.name,
            planned_amount: budget.planned_amount,  // Copy planned
            actual_amount: 0,  // Reset actual
            percentage: 0,
            variance: budget.planned_amount,
            // Reset all warnings
            warning_50: false,
            warning_80: false,
            warning_100: false,
          },
        });
      }
    }
  }
}

// ==========================================
// LIST BUDGETS
// ==========================================

export async function listBudgets(
  farmId: string,
  period: string
): Promise<BudgetDetail[]> {
  const budgets = await prisma.budget.findMany({
    where: { farm_id: farmId, period, is_active: true },
    orderBy: { category: 'asc' },
  });
  
  return budgets.map(formatBudgetDetail);
}

// ==========================================
// HELPERS
// ==========================================

function mapToBudgetCategory(transType: string, category?: string): BudgetCategory {
  if (category === 'SALARY') return 'SALARY';
  if (category === 'MATERIAL') return 'MATERIAL';
  if (category === 'MARKETING') return 'MARKETING';
  
  switch (transType) {
    case 'PURCHASE': return 'PURCHASE';
    case 'SALARY': return 'SALARY';
    default: return 'EXPENSE';
  }
}

function formatBudgetDetail(budget: any): BudgetDetail {
  const percentage = Number(budget.percentage);
  let status: 'OK' | 'WARNING' | 'EXCEEDED' = 'OK';
  if (percentage >= 100) status = 'EXCEEDED';
  else if (percentage >= 80) status = 'WARNING';
  
  return {
    id: budget.id,
    period: budget.period,
    period_type: budget.period_type,
    category: budget.category,
    name: budget.name,
    planned_amount: Number(budget.planned_amount),
    actual_amount: Number(budget.actual_amount),
    variance: Number(budget.variance),
    percentage,
    warning_50: budget.warning_50,
    warning_80: budget.warning_80,
    warning_100: budget.warning_100,
    status,
  };
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getPreviousPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number);
  if (month === 1) return `${year - 1}-12`;
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}
```

---

# TASK 7: PUSH NOTIFICATIONS

## PHẦN 1: NOTIFICATION SERVICE

```typescript
// src/services/notification.service.ts

import admin from 'firebase-admin';
import { prisma } from '@/lib/prisma';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

// ==========================================
// SEND BUDGET WARNING
// ==========================================

export interface BudgetWarningData {
  level: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  percentage: number;
}

export async function sendBudgetWarning(
  farmId: string,
  data: BudgetWarningData
): Promise<void> {
  // 1. Store in database
  await prisma.notification.create({
    data: {
      farm_id: farmId,
      type: 'BUDGET_WARNING',
      level: data.level,
      title: data.level === 'CRITICAL' ? '🚨 Vượt ngân sách!' : '⚠️ Cảnh báo ngân sách',
      message: data.message,
      data: { percentage: data.percentage },
    },
  });
  
  // 2. Get users with FCM tokens
  const farmUsers = await prisma.userFarm.findMany({
    where: { farm_id: farmId, is_active: true },
    include: { user: { select: { fcm_token: true, name: true }}},
  });
  
  const tokens = farmUsers
    .map(fu => fu.user.fcm_token)
    .filter(Boolean) as string[];
  
  if (tokens.length === 0) return;
  
  // 3. Send push notification
  const message = {
    notification: {
      title: data.level === 'CRITICAL' ? '🚨 Vượt ngân sách!' : '⚠️ Cảnh báo ngân sách',
      body: data.message,
    },
    data: {
      type: 'BUDGET_WARNING',
      percentage: String(data.percentage),
    },
    tokens,
  };
  
  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`Sent ${response.successCount}/${tokens.length} notifications`);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

// ==========================================
// SEND GENERIC NOTIFICATION
// ==========================================

export async function sendNotification(
  farmId: string,
  options: {
    type: string;
    level: 'INFO' | 'WARNING' | 'CRITICAL';
    title: string;
    message: string;
    data?: Record<string, any>;
  }
): Promise<void> {
  // Store
  await prisma.notification.create({
    data: {
      farm_id: farmId,
      type: options.type,
      level: options.level,
      title: options.title,
      message: options.message,
      data: options.data,
    },
  });
  
  // Send push
  const tokens = await getFarmUserTokens(farmId);
  if (tokens.length === 0) return;
  
  await admin.messaging().sendEachForMulticast({
    notification: { title: options.title, body: options.message },
    data: { type: options.type, ...options.data },
    tokens,
  });
}

// ==========================================
// LIST NOTIFICATIONS
// ==========================================

export async function listNotifications(
  farmId: string,
  options: { unread_only?: boolean; limit?: number }
): Promise<any[]> {
  return prisma.notification.findMany({
    where: {
      farm_id: farmId,
      ...(options.unread_only ? { read_at: null } : {}),
    },
    orderBy: { created_at: 'desc' },
    take: options.limit || 50,
  });
}

// ==========================================
// MARK AS READ
// ==========================================

export async function markNotificationRead(
  notificationId: string
): Promise<void> {
  await prisma.notification.update({
    where: { id: notificationId },
    data: { read_at: new Date() },
  });
}

export async function markAllNotificationsRead(
  farmId: string
): Promise<void> {
  await prisma.notification.updateMany({
    where: { farm_id: farmId, read_at: null },
    data: { read_at: new Date() },
  });
}

// ==========================================
// REGISTER FCM TOKEN
// ==========================================

export async function registerFCMToken(
  userId: string,
  token: string
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { fcm_token: token },
  });
}

// ==========================================
// HELPERS
// ==========================================

async function getFarmUserTokens(farmId: string): Promise<string[]> {
  const users = await prisma.userFarm.findMany({
    where: { farm_id: farmId, is_active: true },
    include: { user: { select: { fcm_token: true }}},
  });
  
  return users.map(u => u.user.fcm_token).filter(Boolean) as string[];
}
```

---

# TASK 8: BUDGET DASHBOARD

## UI Component

```tsx
// src/app/(dashboard)/budget/page.tsx

'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';

export default function BudgetDashboardPage() {
  const period = getCurrentPeriod();
  
  const { data: budgets } = useQuery({
    queryKey: ['budgets', period],
    queryFn: () => api.get(`/budgets?period=${period}`).then(r => r.data.data),
  });
  
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">📊 Ngân Sách Tháng {period}</h1>
      
      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        {budgets?.map((b: any) => (
          <BudgetCard key={b.id} budget={b} />
        ))}
      </div>
      
      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>So sánh Kế hoạch vs Thực tế</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={budgets} layout="vertical">
              <XAxis type="number" tickFormatter={v => `${(v/1000000).toFixed(0)}M`} />
              <YAxis type="category" dataKey="category" width={100} />
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              <Bar dataKey="planned_amount" fill="#e5e7eb" name="Kế hoạch" />
              <Bar dataKey="actual_amount" name="Thực tế">
                {budgets?.map((b: any, i: number) => (
                  <Cell 
                    key={i} 
                    fill={b.percentage >= 100 ? '#ef4444' : b.percentage >= 80 ? '#f59e0b' : '#22c55e'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function BudgetCard({ budget }: { budget: any }) {
  const getColor = () => {
    if (budget.percentage >= 100) return 'bg-red-50 border-red-200';
    if (budget.percentage >= 80) return 'bg-yellow-50 border-yellow-200';
    return 'bg-green-50 border-green-200';
  };
  
  const getProgressColor = () => {
    if (budget.percentage >= 100) return 'bg-red-500';
    if (budget.percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  return (
    <Card className={getColor()}>
      <CardContent className="p-4">
        <div className="text-sm font-medium">{budget.category}</div>
        <div className="text-xs text-muted-foreground mb-2">
          {formatMoney(budget.actual_amount)} / {formatMoney(budget.planned_amount)}
        </div>
        <Progress value={Math.min(budget.percentage, 100)} className="h-2" />
        <div className="text-xs mt-1">
          {budget.percentage.toFixed(0)}%
          {budget.percentage >= 100 && ' 🚨'}
          {budget.percentage >= 80 && budget.percentage < 100 && ' ⚠️'}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## ✅ CHECKLIST TASK 6-8

### Task 6: Budget
- [ ] createBudget()
- [ ] updateBudgetActual() event-driven
- [ ] checkBudgetWarnings()
- [ ] resetBudgetWarningsForNewPeriod()
- [ ] listBudgets()

### Task 7: Notifications
- [ ] Firebase Admin setup
- [ ] sendBudgetWarning()
- [ ] sendNotification()
- [ ] registerFCMToken()
- [ ] listNotifications()
- [ ] markAsRead()

### Task 8: Dashboard
- [ ] Budget cards with progress
- [ ] Comparison chart
- [ ] Alert badges

---

## 🔗 TIẾP THEO: Task 9-12 (Product Costing, Analytics)
