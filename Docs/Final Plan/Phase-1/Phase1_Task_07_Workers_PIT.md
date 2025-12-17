# 📋 PHASE 1 - TASK 7: WORKERS + PIT (THUẾ TNCN)

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P1-T7 |
| **Tên** | Workers + Thuế TNCN |
| **Thời gian** | 5-6 giờ |
| **Phụ thuộc** | Task 5 (Transactions) |
| **Task tiếp theo** | Task 8 (Dashboard) |

---

## 📋 MỤC TIÊU

- CRUD Nhân công thời vụ
- Chấm công (WorkLog)  
- Tính PIT đơn giản (quy tắc 2 triệu)
- Print HTML: Hợp đồng, Bảng thanh toán

---

## PHẦN 1: WORKER API

### 1.1 CRUD /api/workers

```typescript
// src/app/api/workers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth-context';
import { z } from 'zod';

const workerSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().optional(),
  id_number: z.string().optional(),
  address: z.string().optional(),
  has_contract: z.boolean().default(false),
  has_tax_commitment: z.boolean().default(false),
  daily_rate: z.number().min(0).default(0),
});

// GET - List workers
export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  
  const workers = await prisma.worker.findMany({
    where: {
      farm_id: auth.farm_id,
      is_active: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    orderBy: { created_at: 'desc' },
  });
  
  return NextResponse.json({ success: true, data: workers });
}

// POST - Create worker
export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  
  const body = await request.json();
  const validated = workerSchema.parse(body);
  
  const worker = await prisma.worker.create({
    data: {
      farm_id: auth.farm_id,
      ...validated,
    },
  });
  
  return NextResponse.json({
    success: true,
    data: worker,
    message: 'Thêm nhân công thành công',
  });
}
```

### 1.2 Work Log API

```typescript
// src/app/api/workers/[id]/worklogs/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth-context';
import { z } from 'zod';

const worklogSchema = z.object({
  work_date: z.string(),
  work_units: z.number().min(0.5).max(3).default(1),
  description: z.string().optional(),
});

// GET - Get worker's work logs
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // "2024-12"
  
  const where: any = {
    worker_id: params.id,
    farm_id: auth.farm_id,
  };
  
  if (month) {
    const [year, m] = month.split('-').map(Number);
    const startDate = new Date(year, m - 1, 1);
    const endDate = new Date(year, m, 0);
    where.work_date = {
      gte: startDate,
      lte: endDate,
    };
  }
  
  const worklogs = await prisma.workLog.findMany({
    where,
    orderBy: { work_date: 'desc' },
  });
  
  return NextResponse.json({ success: true, data: worklogs });
}

// POST - Add work log
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  
  const body = await request.json();
  const validated = worklogSchema.parse(body);
  
  // Check if already logged for this date
  const existing = await prisma.workLog.findUnique({
    where: {
      worker_id_work_date: {
        worker_id: params.id,
        work_date: new Date(validated.work_date),
      },
    },
  });
  
  if (existing) {
    // Update existing
    const updated = await prisma.workLog.update({
      where: { id: existing.id },
      data: {
        work_units: validated.work_units,
        description: validated.description,
      },
    });
    return NextResponse.json({ success: true, data: updated });
  }
  
  // Create new
  const worklog = await prisma.workLog.create({
    data: {
      farm_id: auth.farm_id,
      worker_id: params.id,
      work_date: new Date(validated.work_date),
      work_units: validated.work_units,
      description: validated.description,
      created_by: auth.user_id,
    },
  });
  
  // Update worker total_days
  await prisma.worker.update({
    where: { id: params.id },
    data: { total_days: { increment: validated.work_units } },
  });
  
  return NextResponse.json({
    success: true,
    data: worklog,
    message: 'Chấm công thành công',
  });
}
```

### 1.3 Payroll API (Thanh toán lương)

```typescript
// src/app/api/workers/[id]/payroll/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth-context';
import { generateTransactionCode } from '@/lib/transaction-utils';
import { calculatePIT } from '@/lib/tax-utils';

// POST - Pay worker
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  
  const body = await request.json();
  const { work_days, daily_rate, notes } = body;
  
  // Get worker
  const worker = await prisma.worker.findFirst({
    where: { id: params.id, farm_id: auth.farm_id },
  });
  
  if (!worker) {
    return NextResponse.json(
      { success: false, error: { message: 'Không tìm thấy nhân công' } },
      { status: 404 }
    );
  }
  
  const gross = work_days * (daily_rate || worker.daily_rate);
  
  // Calculate PIT (quy tắc 2 triệu)
  const pitResult = calculatePIT(gross, worker.has_contract, worker.has_tax_commitment);
  
  const code = await generateTransactionCode(auth.farm_id, 'PAYROLL');
  
  const result = await prisma.$transaction(async (tx) => {
    // Create transaction
    const transaction = await tx.transaction.create({
      data: {
        farm_id: auth.farm_id,
        type: 'PAYROLL',
        code,
        trans_date: new Date(),
        amount: pitResult.net,
        vat_rate: 0,
        vat_amount: 0,
        payment_method: 'CASH',
        description: `Trả lương ${worker.name}`,
        notes,
        created_by: auth.user_id,
      },
    });
    
    // Update worker
    await tx.worker.update({
      where: { id: params.id },
      data: {
        total_paid: { increment: pitResult.net },
        balance: { decrement: pitResult.net },
      },
    });
    
    return { transaction, pitResult };
  });
  
  return NextResponse.json({
    success: true,
    data: result,
    message: 'Thanh toán thành công',
  });
}
```

---

## PHẦN 2: PIT CALCULATION

### 2.1 Tax Utilities

```typescript
// src/lib/tax-utils.ts

const PIT_THRESHOLD = 2000000; // 2 triệu
const PIT_RATE = 0.10; // 10%

interface PITResult {
  gross: number;
  pit: number;
  net: number;
  reason: string;
}

/**
 * Tính thuế TNCN cho nhân công thời vụ
 * 
 * Quy tắc:
 * - Thu nhập <= 2tr: Không khấu trừ
 * - Thu nhập > 2tr và KHÔNG có HĐ/Cam kết: Khấu trừ 10% toàn bộ
 * - Thu nhập > 2tr và CÓ HĐ/Cam kết: Không khấu trừ
 */
export function calculatePIT(
  gross: number,
  hasContract: boolean,
  hasTaxCommitment: boolean
): PITResult {
  // Dưới ngưỡng
  if (gross <= PIT_THRESHOLD) {
    return {
      gross,
      pit: 0,
      net: gross,
      reason: `Thu nhập ≤ ${formatCurrency(PIT_THRESHOLD)}, không khấu trừ`,
    };
  }
  
  // Có hợp đồng hoặc cam kết thuế
  if (hasContract || hasTaxCommitment) {
    return {
      gross,
      pit: 0,
      net: gross,
      reason: hasContract 
        ? 'Có hợp đồng giao khoán, không khấu trừ'
        : 'Có cam kết thuế (Mẫu 02), không khấu trừ',
    };
  }
  
  // Khấu trừ 10%
  const pit = Math.round(gross * PIT_RATE);
  return {
    gross,
    pit,
    net: gross - pit,
    reason: `Thu nhập > ${formatCurrency(PIT_THRESHOLD)}, khấu trừ ${PIT_RATE * 100}%`,
  };
}
```

---

## PHẦN 3: UI COMPONENTS

### 3.1 Worker List Page

```tsx
// src/app/(dashboard)/workers/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useLabels } from '@/hooks/use-labels';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Calendar, DollarSign } from 'lucide-react';
import { WorkerForm } from '@/components/workers/worker-form';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

export default function WorkersPage() {
  const { t } = useLabels();
  const [workers, setWorkers] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    fetchWorkers();
  }, []);
  
  const fetchWorkers = async () => {
    const res = await apiClient.get('/api/workers');
    if (res.success) setWorkers(res.data);
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">{t('workers_list')}</h1>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              {t('add_worker')}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>{t('add_worker')}</SheetTitle>
            </SheetHeader>
            <WorkerForm onSuccess={() => { setIsOpen(false); fetchWorkers(); }} />
          </SheetContent>
        </Sheet>
      </div>
      
      <div className="space-y-2">
        {workers.map((worker) => (
          <Link key={worker.id} href={`/workers/${worker.id}`}>
            <Card className="hover:bg-gray-50 cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">
                    {worker.name}
                    {worker.has_contract && (
                      <Badge variant="outline" className="text-xs">Có HĐ</Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {worker.code} • {formatCurrency(worker.daily_rate)}/ngày
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="w-3 h-3" />
                    {worker.total_days} ngày
                  </div>
                  {worker.balance > 0 && (
                    <div className="text-xs text-orange-500">
                      Còn nợ: {formatCurrency(worker.balance)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

### 3.2 Worker Detail + Attendance

```tsx
// src/app/(dashboard)/workers/[id]/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, DollarSign, FileText, Printer } from 'lucide-react';
import { AttendanceCalendar } from '@/components/workers/attendance-calendar';
import { PayrollDialog } from '@/components/workers/payroll-dialog';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function WorkerDetailPage() {
  const { id } = useParams();
  const [worker, setWorker] = useState<any>(null);
  const [worklogs, setWorklogs] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  
  useEffect(() => {
    fetchWorker();
    fetchWorklogs();
  }, [id, selectedMonth]);
  
  const fetchWorker = async () => {
    const res = await apiClient.get(`/api/workers/${id}`);
    if (res.success) setWorker(res.data);
  };
  
  const fetchWorklogs = async () => {
    const res = await apiClient.get(`/api/workers/${id}/worklogs?month=${selectedMonth}`);
    if (res.success) setWorklogs(res.data);
  };
  
  if (!worker) return null;
  
  // Calculate month totals
  const monthTotal = worklogs.reduce((sum, w) => sum + Number(w.work_units), 0);
  const monthAmount = monthTotal * Number(worker.daily_rate);
  
  return (
    <div className="container mx-auto p-4">
      {/* Worker Info Card */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <h1 className="text-xl font-bold mb-2">{worker.name}</h1>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Mã:</span> {worker.code}
            </div>
            <div>
              <span className="text-gray-500">SĐT:</span> {worker.phone || '-'}
            </div>
            <div>
              <span className="text-gray-500">Công/ngày:</span>{' '}
              <span className="font-medium text-green-600">
                {formatCurrency(worker.daily_rate)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Tổng công:</span>{' '}
              <span className="font-medium">{worker.total_days} ngày</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Month Summary */}
      <Card className="mb-4 bg-gradient-to-r from-green-50 to-blue-50">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-500">Tháng {selectedMonth}</div>
              <div className="text-2xl font-bold">{monthTotal} công</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Thành tiền</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(monthAmount)}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <PayrollDialog 
              worker={worker} 
              workDays={monthTotal} 
              onSuccess={fetchWorker}
            />
            <Button variant="outline" size="sm">
              <Printer className="w-4 h-4 mr-2" />
              In bảng lương
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Attendance Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Chấm công
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceCalendar
            workerId={id as string}
            month={selectedMonth}
            worklogs={worklogs}
            onUpdate={fetchWorklogs}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3.3 Attendance Calendar

```tsx
// src/components/workers/attendance-calendar.tsx

'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AttendanceCalendarProps {
  workerId: string;
  month: string;
  worklogs: any[];
  onUpdate: () => void;
}

export function AttendanceCalendar({ 
  workerId, 
  month, 
  worklogs, 
  onUpdate 
}: AttendanceCalendarProps) {
  const [year, monthNum] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const firstDayOfWeek = new Date(year, monthNum - 1, 1).getDay();
  
  const worklogMap = new Map(
    worklogs.map((w) => [new Date(w.work_date).getDate(), w])
  );
  
  const handleDayClick = async (day: number) => {
    const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const existing = worklogMap.get(day);
    
    // Toggle: 0 -> 1 -> 0.5 -> 0
    const newUnits = existing 
      ? (existing.work_units === 1 ? 0.5 : 0)
      : 1;
    
    if (newUnits === 0) {
      // Delete worklog
      await apiClient.delete(`/api/workers/${workerId}/worklogs/${existing.id}`);
    } else {
      // Create/Update worklog
      await apiClient.post(`/api/workers/${workerId}/worklogs`, {
        work_date: dateStr,
        work_units: newUnits,
      });
    }
    
    onUpdate();
  };
  
  return (
    <div className="grid grid-cols-7 gap-1">
      {/* Week headers */}
      {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d) => (
        <div key={d} className="text-center text-xs text-gray-400 py-2">
          {d}
        </div>
      ))}
      
      {/* Empty cells for first week */}
      {Array.from({ length: firstDayOfWeek }).map((_, i) => (
        <div key={`empty-${i}`} />
      ))}
      
      {/* Days */}
      {Array.from({ length: daysInMonth }).map((_, i) => {
        const day = i + 1;
        const worklog = worklogMap.get(day);
        const units = worklog?.work_units || 0;
        
        return (
          <button
            key={day}
            onClick={() => handleDayClick(day)}
            className={cn(
              'aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-colors',
              units === 0 && 'bg-gray-100 hover:bg-gray-200',
              units === 0.5 && 'bg-yellow-200 text-yellow-800',
              units === 1 && 'bg-green-500 text-white',
              units > 1 && 'bg-blue-500 text-white'
            )}
          >
            <span>{day}</span>
            {units > 0 && (
              <span className="text-xs">{units}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

---

## PHẦN 4: HTML TEMPLATES

### 4.1 Hợp đồng giao khoán (Mẫu 08)

```html
<!-- public/templates/contract.html -->
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Hợp đồng giao khoán</title>
  <style>
    body { font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.6; }
    .header { text-align: center; margin-bottom: 20px; }
    .content { margin: 20px 40px; }
    .signature { display: flex; justify-content: space-between; margin-top: 50px; }
    .signature div { text-align: center; width: 40%; }
  </style>
</head>
<body>
  <div class="header">
    <h2>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h2>
    <p>Độc lập - Tự do - Hạnh phúc</p>
    <h1>HỢP ĐỒNG GIAO KHOÁN</h1>
    <p>Số: {{contract_number}}</p>
  </div>
  
  <div class="content">
    <p>Hôm nay, ngày {{date}}, chúng tôi gồm:</p>
    
    <h3>BÊN A (Bên giao khoán):</h3>
    <p>Tên: {{farm_name}}</p>
    <p>Địa chỉ: {{farm_address}}</p>
    <p>Mã số thuế: {{farm_tax_code}}</p>
    
    <h3>BÊN B (Bên nhận khoán):</h3>
    <p>Họ và tên: {{worker_name}}</p>
    <p>Số CCCD: {{worker_id_number}}</p>
    <p>Địa chỉ: {{worker_address}}</p>
    
    <h3>NỘI DUNG HỢP ĐỒNG:</h3>
    <p>Điều 1: Bên B nhận khoán công việc {{job_description}} trong thời gian từ {{start_date}} đến {{end_date}}.</p>
    <p>Điều 2: Bên A thanh toán cho Bên B {{daily_rate}} đồng/ngày công.</p>
    <p>Điều 3: Thuế thu nhập cá nhân do Bên B chịu theo quy định pháp luật.</p>
  </div>
  
  <div class="signature">
    <div>
      <p><strong>BÊN A</strong></p>
      <p>(Ký, ghi rõ họ tên)</p>
    </div>
    <div>
      <p><strong>BÊN B</strong></p>
      <p>(Ký, ghi rõ họ tên)</p>
    </div>
  </div>
</body>
</html>
```

### 4.2 Bảng thanh toán tiền công (Mẫu 05)

```html
<!-- public/templates/payroll-sheet.html -->
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Bảng thanh toán tiền công</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #000; padding: 8px; text-align: center; }
    th { background: #f0f0f0; }
    .text-right { text-align: right; }
    .total-row { font-weight: bold; background: #e8f5e9; }
  </style>
</head>
<body>
  <div style="text-align: center;">
    <h3>{{farm_name}}</h3>
    <h2>BẢNG THANH TOÁN TIỀN CÔNG</h2>
    <p>Tháng {{month}}/{{year}}</p>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>STT</th>
        <th>Họ và tên</th>
        <th>Số CCCD</th>
        <th>Số công</th>
        <th>Đơn giá</th>
        <th>Thành tiền</th>
        <th>Thuế TNCN</th>
        <th>Thực lĩnh</th>
        <th>Ký nhận</th>
      </tr>
    </thead>
    <tbody>
      {{#each workers}}
      <tr>
        <td>{{@index}}</td>
        <td style="text-align: left;">{{name}}</td>
        <td>{{id_number}}</td>
        <td>{{work_days}}</td>
        <td class="text-right">{{daily_rate}}</td>
        <td class="text-right">{{gross}}</td>
        <td class="text-right">{{pit}}</td>
        <td class="text-right">{{net}}</td>
        <td></td>
      </tr>
      {{/each}}
      <tr class="total-row">
        <td colspan="3">TỔNG CỘNG</td>
        <td>{{total_days}}</td>
        <td></td>
        <td class="text-right">{{total_gross}}</td>
        <td class="text-right">{{total_pit}}</td>
        <td class="text-right">{{total_net}}</td>
        <td></td>
      </tr>
    </tbody>
  </table>
  
  <div style="display: flex; justify-content: space-between; margin-top: 50px;">
    <div style="text-align: center;">
      <p>Người lập biểu</p>
      <p style="margin-top: 50px;">(Ký, họ tên)</p>
    </div>
    <div style="text-align: center;">
      <p>Kế toán trưởng</p>
      <p style="margin-top: 50px;">(Ký, họ tên)</p>
    </div>
    <div style="text-align: center;">
      <p>Giám đốc</p>
      <p style="margin-top: 50px;">(Ký, họ tên, đóng dấu)</p>
    </div>
  </div>
</body>
</html>
```

---

## ✅ CHECKLIST HOÀN THÀNH

### API
- [ ] CRUD /api/workers
- [ ] GET/POST /api/workers/[id]/worklogs
- [ ] POST /api/workers/[id]/payroll
- [ ] PIT calculation (quy tắc 2 triệu)

### UI
- [ ] Worker list page
- [ ] Worker detail page
- [ ] Attendance calendar (click to toggle)
- [ ] Payroll dialog với PIT preview
- [ ] Month summary card

### Templates
- [ ] contract.html (Mẫu 08)
- [ ] payroll-sheet.html (Mẫu 05)
- [ ] Print functionality

### Testing
- [ ] Chấm công → total_days updates
- [ ] Thanh toán > 2tr không có HĐ → PIT 10%
- [ ] Thanh toán > 2tr có HĐ → PIT 0%

---

## 🔗 KẾT NỐI VỚI PHASE 5

### Output → Phase 5 Task 2-4 (Payroll Module)
- Worker schema → migrate to Employee
- PIT calculation → extend to 7 bậc thuế
- Templates → enhance với BHXH/BHYT/BHTN

---

**Estimated Time:** 5-6 giờ  
**Next Task:** Task 8 - Dashboard & Reports
