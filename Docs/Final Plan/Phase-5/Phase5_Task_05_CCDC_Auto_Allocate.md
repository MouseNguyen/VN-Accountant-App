# 📋 TASK 5: CCDC AUTO-ALLOCATE

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | 5 |
| **Tên** | CCDC Auto-Allocate |
| **Thời gian** | 10-12 giờ |
| **Phụ thuộc** | Task 1 |

---

## 📋 MỤC TIÊU

- CRUD công cụ dụng cụ
- Auto-calculate monthly amount
- Cron job phân bổ hàng tháng
- Tự động tạo bút toán chi phí

---

## PHẦN 1: TOOL SERVICE

### 1.1 src/services/tool.service.ts

```typescript
// src/services/tool.service.ts

import { prisma } from '@/lib/prisma';
import Decimal from 'decimal.js';
import { ToolStatus } from '@prisma/client';

// ==========================================
// TYPES
// ==========================================

export interface ToolInput {
  code?: string;
  name: string;
  description?: string;
  
  purchase_date: string;
  purchase_price: number;
  supplier_id?: string;
  invoice_number?: string;
  
  allocation_months?: number;  // Default 12
  start_month?: string;        // Default: purchase month
  
  location?: string;
  assigned_to?: string;
}

export interface ToolDetail {
  id: string;
  code: string;
  name: string;
  description?: string;
  
  purchase_date: string;
  purchase_price: number;
  
  allocation_months: number;
  monthly_amount: number;
  start_month: string;
  
  allocated_amount: number;
  remaining_amount: number;
  allocated_months: number;
  progress_percent: number;
  
  status: string;
  
  location?: string;
  assigned_to?: string;
  
  created_at: string;
}

// ==========================================
// CREATE TOOL
// ==========================================

export async function createTool(
  farmId: string,
  input: ToolInput,
  userId: string
): Promise<ToolDetail> {
  // Generate code
  const code = input.code || await generateToolCode(farmId);
  
  // Calculate monthly amount
  const allocationMonths = input.allocation_months || 12;
  const monthlyAmount = new Decimal(input.purchase_price)
    .dividedBy(allocationMonths)
    .toDecimalPlaces(0)
    .toNumber();
  
  // Start month
  const purchaseDate = new Date(input.purchase_date);
  const startMonth = input.start_month || 
    `${purchaseDate.getFullYear()}-${String(purchaseDate.getMonth() + 1).padStart(2, '0')}`;
  
  const tool = await prisma.tool.create({
    data: {
      farm_id: farmId,
      code,
      name: input.name,
      description: input.description,
      
      purchase_date: purchaseDate,
      purchase_price: input.purchase_price,
      supplier_id: input.supplier_id,
      invoice_number: input.invoice_number,
      
      allocation_months: allocationMonths,
      monthly_amount: monthlyAmount,
      start_month: startMonth,
      
      remaining_amount: input.purchase_price,
      
      location: input.location,
      assigned_to: input.assigned_to,
      
      status: 'ACTIVE',
      created_by: userId,
    },
  });
  
  return formatToolDetail(tool);
}

// ==========================================
// LIST TOOLS
// ==========================================

export async function listTools(
  farmId: string,
  filters: { status?: ToolStatus; search?: string }
): Promise<ToolDetail[]> {
  const where: any = { farm_id: farmId };
  
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    where.OR = [
      { code: { contains: filters.search, mode: 'insensitive' }},
      { name: { contains: filters.search, mode: 'insensitive' }},
    ];
  }
  
  const tools = await prisma.tool.findMany({
    where,
    orderBy: { purchase_date: 'desc' },
  });
  
  return tools.map(formatToolDetail);
}

// ==========================================
// AUTO-ALLOCATE (CRON JOB)
// ==========================================

export async function autoAllocateToolsMonthly(
  period?: string  // "2024-12", default = current month
): Promise<{ processed: number; allocated: number; completed: number }> {
  const currentPeriod = period || getCurrentPeriod();
  
  // Get all ACTIVE tools
  const tools = await prisma.tool.findMany({
    where: { status: 'ACTIVE' },
  });
  
  let processed = 0;
  let allocated = 0;
  let completed = 0;
  
  for (const tool of tools) {
    processed++;
    
    // Check if already allocated for this period
    const existing = await prisma.toolAllocation.findUnique({
      where: { tool_id_period: { tool_id: tool.id, period: currentPeriod }},
    });
    
    if (existing) continue;  // Already allocated
    
    // Check if start_month has passed
    if (tool.start_month && tool.start_month > currentPeriod) {
      continue;  // Not started yet
    }
    
    // Calculate allocation amount (last month may be different)
    const remaining = Number(tool.remaining_amount);
    const monthlyAmount = Number(tool.monthly_amount);
    const allocationAmount = Math.min(remaining, monthlyAmount);
    
    if (allocationAmount <= 0) continue;
    
    await prisma.$transaction(async (tx) => {
      // 1. Create allocation record
      const allocation = await tx.toolAllocation.create({
        data: {
          farm_id: tool.farm_id,
          tool_id: tool.id,
          period: currentPeriod,
          amount: allocationAmount,
        },
      });
      
      // 2. Create GL entry (expense)
      const journalEntry = await tx.journalEntry.create({
        data: {
          farm_id: tool.farm_id,
          entry_date: new Date(),
          entry_type: 'ALLOCATION',
          reference: `CCDC-${tool.code}-${currentPeriod}`,
          description: `Phân bổ CCDC: ${tool.name} - Tháng ${currentPeriod}`,
          status: 'POSTED',
          posted_at: new Date(),
          auto_generated: true,
          
          lines: {
            create: [
              {
                farm_id: tool.farm_id,
                account_code: '6423',  // Chi phí dụng cụ
                debit: allocationAmount,
                credit: 0,
                description: `Phân bổ CCDC: ${tool.name}`,
              },
              {
                farm_id: tool.farm_id,
                account_code: '2421',  // Chi phí trả trước (CCDC)
                debit: 0,
                credit: allocationAmount,
                description: `Phân bổ CCDC: ${tool.name}`,
              },
            ],
          },
        },
      });
      
      // 3. Update allocation with journal_entry_id
      await tx.toolAllocation.update({
        where: { id: allocation.id },
        data: { journal_entry_id: journalEntry.id },
      });
      
      // 4. Update tool
      const newAllocated = Number(tool.allocated_amount) + allocationAmount;
      const newRemaining = Number(tool.remaining_amount) - allocationAmount;
      const newMonths = tool.allocated_months + 1;
      
      await tx.tool.update({
        where: { id: tool.id },
        data: {
          allocated_amount: newAllocated,
          remaining_amount: newRemaining,
          allocated_months: newMonths,
          status: newRemaining <= 0 ? 'COMPLETED' : 'ACTIVE',
        },
      });
      
      if (newRemaining <= 0) completed++;
      allocated++;
    });
  }
  
  return { processed, allocated, completed };
}

// ==========================================
// DISPOSE TOOL (Thanh lý)
// ==========================================

export async function disposeTool(
  farmId: string,
  toolId: string,
  reason: string,
  userId: string
): Promise<void> {
  const tool = await prisma.tool.findFirst({
    where: { id: toolId, farm_id: farmId },
  });
  
  if (!tool) throw new Error('CCDC không tồn tại');
  if (tool.status === 'DISPOSED') throw new Error('Đã thanh lý');
  
  const remainingAmount = Number(tool.remaining_amount);
  
  await prisma.$transaction(async (tx) => {
    // If remaining value, create expense entry
    if (remainingAmount > 0) {
      await tx.journalEntry.create({
        data: {
          farm_id: farmId,
          entry_date: new Date(),
          entry_type: 'ALLOCATION',
          reference: `CCDC-DISPOSE-${tool.code}`,
          description: `Thanh lý CCDC: ${tool.name} - ${reason}`,
          status: 'POSTED',
          posted_at: new Date(),
          posted_by: userId,
          auto_generated: true,
          
          lines: {
            create: [
              {
                farm_id: farmId,
                account_code: '6423',
                debit: remainingAmount,
                credit: 0,
                description: `Thanh lý CCDC: ${tool.name}`,
              },
              {
                farm_id: farmId,
                account_code: '2421',
                debit: 0,
                credit: remainingAmount,
                description: `Thanh lý CCDC: ${tool.name}`,
              },
            ],
          },
        },
      });
    }
    
    // Update tool status
    await tx.tool.update({
      where: { id: toolId },
      data: {
        status: 'DISPOSED',
        disposed_at: new Date(),
        disposed_by: userId,
        disposal_reason: reason,
        allocated_amount: Number(tool.purchase_price),
        remaining_amount: 0,
      },
    });
  });
}

// ==========================================
// CRON JOB SETUP
// ==========================================

// cron/ccdc-allocate.ts
import cron from 'node-cron';
import { withLock } from '@/lib/distributed-lock';

// Run on 1st day of each month at 1:00 AM
cron.schedule('0 1 1 * *', async () => {
  const period = getCurrentPeriod();
  
  await withLock(`cron:ccdc-allocate:${period}`, 7200, async () => {
    console.log(`[CRON] Starting CCDC allocation for ${period}`);
    
    const result = await autoAllocateToolsMonthly(period);
    
    console.log(`[CRON] CCDC allocation completed:`, result);
  });
});

// ==========================================
// HELPERS
// ==========================================

async function generateToolCode(farmId: string): Promise<string> {
  const last = await prisma.tool.findFirst({
    where: { farm_id: farmId },
    orderBy: { code: 'desc' },
  });
  
  let seq = 1;
  if (last && last.code.startsWith('CCDC-')) {
    seq = parseInt(last.code.replace('CCDC-', '')) + 1;
  }
  
  return `CCDC-${String(seq).padStart(4, '0')}`;
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatToolDetail(tool: any): ToolDetail {
  const allocated = Number(tool.allocated_amount);
  const total = Number(tool.purchase_price);
  
  return {
    id: tool.id,
    code: tool.code,
    name: tool.name,
    description: tool.description,
    
    purchase_date: tool.purchase_date.toISOString().split('T')[0],
    purchase_price: total,
    
    allocation_months: tool.allocation_months,
    monthly_amount: Number(tool.monthly_amount),
    start_month: tool.start_month,
    
    allocated_amount: allocated,
    remaining_amount: Number(tool.remaining_amount),
    allocated_months: tool.allocated_months,
    progress_percent: total > 0 ? Math.round((allocated / total) * 100) : 0,
    
    status: tool.status,
    
    location: tool.location,
    assigned_to: tool.assigned_to,
    
    created_at: tool.created_at.toISOString(),
  };
}
```

---

## PHẦN 2: API ROUTES

```typescript
// src/app/api/tools/route.ts

export const GET = withAuth(async (req) => {
  const tools = await listTools(getCurrentFarmId(), {
    status: new URL(req.url).searchParams.get('status') as any,
    search: new URL(req.url).searchParams.get('search') || undefined,
  });
  return NextResponse.json({ success: true, data: tools });
});

export const POST = withAuth(async (req) => {
  const tool = await createTool(getCurrentFarmId(), await req.json(), getCurrentUserId());
  return NextResponse.json({ success: true, data: tool });
}, { module: 'tools', action: 'create' });


// src/app/api/tools/[id]/dispose/route.ts
export const POST = withAuth(async (req, { params }) => {
  const { reason } = await req.json();
  await disposeTool(getCurrentFarmId(), params.id, reason, getCurrentUserId());
  return NextResponse.json({ success: true, message: 'Đã thanh lý' });
}, { module: 'tools', action: 'delete' });


// src/app/api/tools/allocate-now/route.ts (Manual trigger)
export const POST = withAuth(async () => {
  const result = await autoAllocateToolsMonthly();
  return NextResponse.json({ success: true, data: result });
}, { module: 'tools', action: 'update' });
```

---

## ✅ CHECKLIST

- [ ] createTool() with auto monthly_amount
- [ ] listTools()
- [ ] autoAllocateToolsMonthly()
- [ ] Create GL entry on allocate
- [ ] disposeTool() (thanh lý sớm)
- [ ] Cron job setup
- [ ] API routes complete

---

## 🔗 TIẾP THEO: Task 6 - Budget Monitoring
